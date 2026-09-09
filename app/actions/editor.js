// ==============================================================================
// Editorial Board Server Actions (Pure JavaScript)
// Handles reviewer assignment (with COI checks) and formal editorial decisions
// ==============================================================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { sendReviewerInvitation, sendEditorialDecisionNotification } from '@/lib/email';
import { revalidatePath } from 'next/cache';

/**
 * Assigns a peer reviewer to a manuscript.
 * Strictly verifies Editor credentials and enforces Conflict of Interest (COI) policies:
 * - Reviewer cannot be the manuscript author.
 * - Reviewer cannot share the same academic department as the author.
 * 
 * @param {Object} params
 * @param {string} params.manuscriptId - UUID of the manuscript
 * @param {string} params.reviewerId - UUID of the nominated reviewer profile
 */
export async function assignReviewerAction({ manuscriptId, reviewerId }) {
  try {
    const supabase = await createClient();

    // 1. Authenticate Editor Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized: You must be logged in as an Editor.' };
    }

    const { data: editorProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!editorProfile || !['EDITOR', 'ADMIN'].includes(editorProfile.role)) {
      return { success: false, error: 'Permission Denied: Only Editors and Admins can assign peer reviewers.' };
    }

    if (!manuscriptId || !reviewerId) {
      return { success: false, error: 'Manuscript and Reviewer identifiers are required.' };
    }

    // 2. Fetch Manuscript & Author Details
    const { data: manuscript, error: manuscriptError } = await supabase
      .from('manuscripts')
      .select('id, tracking_id, title, abstract, department, author_id, round_number, status')
      .eq('id', manuscriptId)
      .single();

    if (manuscriptError || !manuscript) {
      return { success: false, error: 'Target manuscript not found.' };
    }

    // 3. Fetch Nominated Reviewer Profile
    const { data: reviewerProfile, error: reviewerError } = await supabase
      .from('profiles')
      .select('id, full_name, email, department, role')
      .eq('id', reviewerId)
      .single();

    if (reviewerError || !reviewerProfile) {
      return { success: false, error: 'Nominated reviewer profile not found.' };
    }

    // 4. Conflict of Interest (COI) Prevention Checks
    // Rule A: Reviewer cannot be the author
    if (reviewerId === manuscript.author_id) {
      return {
        success: false,
        error: 'Conflict of Interest: Authors cannot be assigned as peer reviewers for their own submissions.',
      };
    }

    // Rule B: Reviewer cannot share the same academic department
    if (
      reviewerProfile.department &&
      manuscript.department &&
      reviewerProfile.department.trim().toLowerCase() === manuscript.department.trim().toLowerCase()
    ) {
      return {
        success: false,
        error: `Conflict of Interest: Reviewer belongs to the same department (${reviewerProfile.department}) as the author. Under journal policy, reviewers must be external to the author's department.`,
      };
    }

    // 5. Insert Review Record
    const { data: review, error: assignError } = await supabase
      .from('reviews')
      .insert({
        manuscript_id: manuscript.id,
        reviewer_id: reviewerProfile.id,
        round_number: manuscript.round_number,
        task_status: 'INVITED',
      })
      .select()
      .single();

    if (assignError) {
      if (assignError.code === '23505') { // Unique constraint violation
        return { success: false, error: 'This reviewer is already assigned for the current review round.' };
      }
      return { success: false, error: `Failed to assign reviewer: ${assignError.message}` };
    }

    // 6. Update Manuscript Status to IN_REVIEW if previously SUBMITTED
    if (manuscript.status === 'SUBMITTED') {
      await supabase
        .from('manuscripts')
        .update({ status: 'IN_REVIEW' })
        .eq('id', manuscript.id);
    }

    // 7. Dispatch Invitation Email to Reviewer
    if (reviewerProfile.email) {
      sendReviewerInvitation({
        to: reviewerProfile.email,
        reviewerName: reviewerProfile.full_name,
        manuscriptTitle: manuscript.title,
        abstract: manuscript.abstract,
        trackingId: manuscript.tracking_id,
        reviewId: review.id,
      }).catch(err => {
        console.error('[Action Warning] Reviewer email delivery failed:', err);
      });
    }

    revalidatePath(`/editor/manuscripts/${manuscriptId}`);
    revalidatePath('/editor');

    return {
      success: true,
      message: `Reviewer ${reviewerProfile.full_name} assigned successfully.`,
      reviewId: review.id,
    };
  } catch (error) {
    console.error('[Action Exception] assignReviewerAction:', error);
    return { success: false, error: error.message || 'An unexpected error occurred during reviewer assignment.' };
  }
}

/**
 * Executes a formal editorial decision on a manuscript.
 * Updates publication status and notifies the author with compiled reviewer scorecards.
 * 
 * @param {Object} params
 * @param {string} params.manuscriptId - UUID of the manuscript
 * @param {string} params.decision - 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED'
 * @param {string} [params.editorNotes] - Formal editorial comments and instructions
 */
export async function makeEditorialDecisionAction({ manuscriptId, decision, editorNotes }) {
  try {
    const supabase = await createClient();

    // 1. Authenticate Editor Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized: You must be logged in as an Editor.' };
    }

    const { data: editorProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!editorProfile || !['EDITOR', 'ADMIN'].includes(editorProfile.role)) {
      return { success: false, error: 'Permission Denied: Only Editors and Admins can record editorial decisions.' };
    }

    const validDecisions = ['ACCEPTED', 'REJECTED', 'REVISION_REQUIRED'];
    if (!validDecisions.includes(decision)) {
      return { success: false, error: 'Invalid editorial decision type provided.' };
    }

    // 2. Fetch Manuscript & Author Profile
    const { data: manuscript, error: manuscriptError } = await supabase
      .from('manuscripts')
      .select(`
        id, 
        tracking_id, 
        title, 
        round_number, 
        author_id,
        profiles:author_id (full_name, email)
      `)
      .eq('id', manuscriptId)
      .single();

    if (manuscriptError || !manuscript) {
      return { success: false, error: 'Manuscript not found.' };
    }

    // 3. Fetch Completed Reviewer Scorecards for This Round
    const { data: reviews } = await supabase
      .from('reviews')
      .select('recommendation, comments_to_author, score')
      .eq('manuscript_id', manuscriptId)
      .eq('round_number', manuscript.round_number)
      .eq('task_status', 'SUBMITTED');

    // 4. Update Manuscript Status
    const updatePayload = {
      status: decision,
    };

    // If revision is required, increment round_number for the next cycle
    if (decision === 'REVISION_REQUIRED') {
      updatePayload.round_number = manuscript.round_number + 1;
    }

    const { error: updateError } = await supabase
      .from('manuscripts')
      .update(updatePayload)
      .eq('id', manuscriptId);

    if (updateError) {
      return { success: false, error: `Failed to update manuscript status: ${updateError.message}` };
    }

    // 5. Dispatch Decision Notification Email with Reviewer Scorecards
    const authorEmail = manuscript.profiles?.email;
    const authorName = manuscript.profiles?.full_name || 'Esteemed Author';

    if (authorEmail) {
      sendEditorialDecisionNotification({
        to: authorEmail,
        authorName,
        title: manuscript.title,
        trackingId: manuscript.tracking_id,
        decision,
        editorNotes: editorNotes || '',
        scorecards: reviews || [],
      }).catch(err => {
        console.error('[Action Warning] Decision email delivery failed:', err);
      });
    }

    revalidatePath(`/editor/manuscripts/${manuscriptId}`);
    revalidatePath('/editor');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `Editorial decision '${decision}' recorded and author notified.`,
    };
  } catch (error) {
    console.error('[Action Exception] makeEditorialDecisionAction:', error);
    return { success: false, error: error.message || 'An unexpected error occurred while recording decision.' };
  }
}

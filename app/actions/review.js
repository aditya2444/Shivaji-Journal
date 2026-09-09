// ==============================================================================
// Peer Review Server Actions (Pure JavaScript)
// Handles reviewer scorecards, evaluation submissions, and status transitions
// ==============================================================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Submits an evaluation scorecard for an assigned manuscript.
 * Enforces blind review validation and updates manuscript status if quota is reached.
 * 
 * @param {Object} payload
 * @param {string} payload.reviewId - UUID of the assigned review record
 * @param {number} payload.score - Numerical evaluation score between 1 and 10
 * @param {string} payload.recommendation - 'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT'
 * @param {string} payload.commentsToAuthor - Feedback visible to author upon decision
 * @param {string} [payload.confidentialNotes] - Confidential notes visible only to editors
 */
export async function submitReviewAction(payload) {
  try {
    const supabase = await createClient();

    // 1. Authenticate Reviewer Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized: You must be logged in as an assigned reviewer.' };
    }

    const {
      reviewId,
      score,
      recommendation,
      commentsToAuthor,
      confidentialNotes,
    } = payload || {};

    // 2. Validate Reviewer Assignment
    if (!reviewId) {
      return { success: false, error: 'Missing review assignment identifier.' };
    }

    const { data: reviewRecord, error: fetchError } = await supabase
      .from('reviews')
      .select('id, manuscript_id, reviewer_id, round_number, task_status')
      .eq('id', reviewId)
      .single();

    if (fetchError || !reviewRecord) {
      return { success: false, error: 'Review record not found or inaccessible.' };
    }

    // Security Check: Enforce that session user is the assigned reviewer
    if (reviewRecord.reviewer_id !== user.id) {
      return { success: false, error: 'Access Denied: You are not authorized to submit this review.' };
    }

    // 3. Input Validation
    const parsedScore = parseInt(score, 10);
    if (isNaN(parsedScore) || parsedScore < 1 || parsedScore > 10) {
      return { success: false, error: 'Please provide a valid evaluation score between 1 and 10.' };
    }

    const validRecommendations = ['ACCEPT', 'MINOR_REVISION', 'MAJOR_REVISION', 'REJECT'];
    if (!validRecommendations.includes(recommendation)) {
      return { success: false, error: 'Invalid recommendation selection.' };
    }

    if (!commentsToAuthor || typeof commentsToAuthor !== 'string' || commentsToAuthor.trim().length < 30) {
      return { success: false, error: 'Please provide constructive feedback to the author (at least 30 characters).' };
    }

    // 4. Update the Review Record
    const { error: updateError } = await supabase
      .from('reviews')
      .update({
        task_status: 'SUBMITTED',
        score: parsedScore,
        recommendation,
        comments_to_author: commentsToAuthor.trim(),
        confidential_editor_notes: (confidentialNotes || '').trim(),
        submitted_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (updateError) {
      console.error('[Action Error] Failed to submit review:', updateError);
      return { success: false, error: `Failed to record review: ${updateError.message}` };
    }

    // 5. Check if All Assigned Reviews for This Round Have Been Submitted
    const { data: siblingReviews, error: siblingError } = await supabase
      .from('reviews')
      .select('task_status')
      .eq('manuscript_id', reviewRecord.manuscript_id)
      .eq('round_number', reviewRecord.round_number);

    let allCompleted = false;
    if (!siblingError && siblingReviews && siblingReviews.length > 0) {
      allCompleted = siblingReviews.every(r => r.task_status === 'SUBMITTED');

      // If all assigned reviewers have submitted, transition manuscript to DECISION_PENDING
      if (allCompleted) {
        await supabase
          .from('manuscripts')
          .update({ status: 'DECISION_PENDING' })
          .eq('id', reviewRecord.manuscript_id);
      }
    }

    revalidatePath(`/reviewer/${reviewId}`);
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Your peer evaluation has been officially recorded. Thank you for your contribution.',
      allCompleted,
    };
  } catch (error) {
    console.error('[Action Exception] submitReviewAction:', error);
    return {
      success: false,
      error: error.message || 'An internal error occurred while recording the review.',
    };
  }
}

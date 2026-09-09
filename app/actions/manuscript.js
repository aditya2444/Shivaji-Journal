// ==============================================================================
// Manuscript Server Actions (Pure JavaScript)
// Handles author submissions, metadata registration, and acknowledgment emails
// ==============================================================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { sendSubmissionAcknowledgment } from '@/lib/email';
import { revalidatePath } from 'next/cache';

/**
 * Generates a standard scholarly tracking ID (e.g., SJMR-2026-X49B2).
 */
function generateTrackingId() {
  const currentYear = new Date().getFullYear();
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `SJMR-${currentYear}-${randomSuffix}`;
}

/**
 * Registers a newly uploaded manuscript and its associated private files.
 * Validates the authenticated author session and dispatches an acknowledgment email.
 * 
 * @param {Object} payload
 * @param {string} payload.title - Full title of the paper
 * @param {string} payload.abstract - Comprehensive abstract
 * @param {string} payload.department - Academic department
 * @param {string[]} payload.keywords - Array of keyword tags
 * @param {Object} payload.coverLetter - { storagePath, fileName, fileSize }
 * @param {Object} payload.anonymizedManuscript - { storagePath, fileName, fileSize }
 */
export async function registerManuscriptAction(payload) {
  try {
    const supabase = await createClient();

    // 1. Session & Auth Validation
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in to submit a manuscript.',
      };
    }

    // 2. Runtime Validation
    const {
      title,
      abstract,
      department,
      keywords,
      coverLetter,
      anonymizedManuscript,
    } = payload || {};

    if (!title || typeof title !== 'string' || title.trim().length < 5) {
      return { success: false, error: 'Please provide a valid manuscript title (at least 5 characters).' };
    }

    if (!abstract || typeof abstract !== 'string' || abstract.trim().length < 50) {
      return { success: false, error: 'Please provide a comprehensive abstract (at least 50 characters).' };
    }

    if (!department || typeof department !== 'string') {
      return { success: false, error: 'Please select a valid academic department.' };
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return { success: false, error: 'Please provide at least one relevant keyword.' };
    }

    if (!coverLetter || !coverLetter.storagePath) {
      return { success: false, error: 'Title Page / Cover Letter file is required.' };
    }

    if (!anonymizedManuscript || !anonymizedManuscript.storagePath) {
      return { success: false, error: 'Anonymized manuscript file is required.' };
    }

    // 3. Generate Tracking ID
    const trackingId = generateTrackingId();

    // 4. Insert Manuscript Record
    const { data: manuscript, error: manuscriptError } = await supabase
      .from('manuscripts')
      .insert({
        tracking_id: trackingId,
        title: title.trim(),
        abstract: abstract.trim(),
        keywords: keywords.map(k => k.trim()),
        department: department.trim(),
        status: 'SUBMITTED',
        author_id: user.id,
        round_number: 1,
      })
      .select()
      .single();

    if (manuscriptError) {
      console.error('[Action Error] Failed to insert manuscript:', manuscriptError);
      return { success: false, error: `Failed to record manuscript: ${manuscriptError.message}` };
    }

    // 5. Insert Files Metadata Records
    const filesToInsert = [
      {
        manuscript_id: manuscript.id,
        round_number: 1,
        file_type: 'COVER_LETTER',
        storage_path: coverLetter.storagePath,
        file_name: coverLetter.fileName || 'Cover_Letter.pdf',
        file_size_bytes: coverLetter.fileSize || 0,
      },
      {
        manuscript_id: manuscript.id,
        round_number: 1,
        file_type: 'ANONYMIZED_MANUSCRIPT',
        storage_path: anonymizedManuscript.storagePath,
        file_name: anonymizedManuscript.fileName || 'Anonymized_Manuscript.pdf',
        file_size_bytes: anonymizedManuscript.fileSize || 0,
      },
    ];

    const { error: filesError } = await supabase
      .from('manuscript_files')
      .insert(filesToInsert);

    if (filesError) {
      console.error('[Action Error] Failed to insert file records:', filesError);
      // Clean up manuscript record to prevent orphan data
      await supabase.from('manuscripts').delete().eq('id', manuscript.id);
      return { success: false, error: 'Failed to record manuscript files. Please try again.' };
    }

    // 6. Fetch Author Profile for Acknowledgment Email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const authorEmail = profile?.email || user.email;
    const authorName = profile?.full_name || 'Esteemed Researcher';

    // 7. Fire Transactional Acknowledgment Email via Resend
    if (authorEmail) {
      sendSubmissionAcknowledgment({
        to: authorEmail,
        authorName,
        trackingId: manuscript.tracking_id,
        title: manuscript.title,
      }).catch(err => {
        console.error('[Action Warning] Email delivery error:', err);
      });
    }

    // 8. Invalidate Dashboard Cache
    revalidatePath('/dashboard');

    return {
      success: true,
      trackingId: manuscript.tracking_id,
      manuscriptId: manuscript.id,
    };
  } catch (error) {
    console.error('[Action Exception] registerManuscriptAction:', error);
    return {
      success: false,
      error: error.message || 'An unexpected internal error occurred during submission.',
    };
  }
}

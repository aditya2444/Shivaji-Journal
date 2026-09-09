// ==============================================================================
// Secure Manuscript Download API Handler (Pure JavaScript)
// GET /api/manuscripts/[id]/download?file_type=ANONYMIZED_MANUSCRIPT
// ==============================================================================

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

/**
 * Secure, role-gated file download endpoint.
 * Enforces Double-Blind Peer Review integrity:
 * - Reviewers can NEVER download COVER_LETTER files.
 * - Reviewers must be assigned to the manuscript.
 * - Authors can only download files for their own submissions.
 * - Editors/Admins have full download authorization.
 * 
 * Generates a 60-second expiring signed URL and redirects the client.
 */
export async function GET(request, { params }) {
  try {
    const manuscriptId = params.id;
    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get('file_type') || 'ANONYMIZED_MANUSCRIPT';

    if (!manuscriptId) {
      return NextResponse.json({ error: 'Manuscript ID is required.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Authenticate Requesting User
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to download manuscript files.' },
        { status: 401 }
      );
    }

    // 2. Fetch User Profile & Role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'AUTHOR';

    // 3. BLIND REVIEW POLICY: Reviewers can NEVER access Cover Letters
    if (fileType === 'COVER_LETTER' && userRole === 'REVIEWER') {
      return NextResponse.json(
        { error: 'Forbidden: Double-blind review integrity prevents reviewers from accessing cover letters or author identifying documents.' },
        { status: 403 }
      );
    }

    // 4. Fetch Manuscript Record to Check Ownership
    const { data: manuscript, error: manuscriptError } = await supabase
      .from('manuscripts')
      .select('id, author_id, round_number')
      .eq('id', manuscriptId)
      .single();

    if (manuscriptError || !manuscript) {
      return NextResponse.json({ error: 'Manuscript record not found.' }, { status: 404 });
    }

    // 5. Verify Permissions Based on Role
    let isAuthorized = false;

    if (['EDITOR', 'ADMIN'].includes(userRole)) {
      isAuthorized = true;
    } else if (userRole === 'AUTHOR' && manuscript.author_id === user.id) {
      isAuthorized = true;
    } else if (userRole === 'REVIEWER') {
      // Verify reviewer has an active assignment for this manuscript
      const { data: reviewRecord } = await supabase
        .from('reviews')
        .select('id')
        .eq('manuscript_id', manuscriptId)
        .eq('reviewer_id', user.id)
        .single();

      if (reviewRecord) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to access files for this manuscript.' },
        { status: 403 }
      );
    }

    // 6. Query File Record from manuscript_files
    const { data: fileRecord, error: fileError } = await supabase
      .from('manuscript_files')
      .select('storage_path, file_name')
      .eq('manuscript_id', manuscriptId)
      .eq('file_type', fileType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fileError || !fileRecord) {
      return NextResponse.json(
        { error: `File of type '${fileType}' not found for this manuscript.` },
        { status: 404 }
      );
    }

    // 7. Generate 60-second Expiring Signed URL from Private Storage Vault
    const adminClient = createAdminClient();
    const { data: signedData, error: signError } = await adminClient.storage
      .from('manuscripts-vault')
      .createSignedUrl(fileRecord.storage_path, 60);

    if (signError || !signedData?.signedUrl) {
      console.error('[API Download Error] Signed URL generation failed:', signError);
      return NextResponse.json(
        { error: 'Failed to generate secure temporary download link.' },
        { status: 500 }
      );
    }

    // 8. Redirect Client to the Expiring Signed URL
    return NextResponse.redirect(signedData.signedUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[API Exception] /api/manuscripts/[id]/download:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing download request.' },
      { status: 500 }
    );
  }
}

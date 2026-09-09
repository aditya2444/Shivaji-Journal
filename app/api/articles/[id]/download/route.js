// ==============================================================================
// Public Published Article Download API Handler (Pure JavaScript)
// GET /api/articles/[id]/download
// ==============================================================================

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

/**
 * Public endpoint for readers and researchers downloading published articles.
 * 1. Atomically increments the `download_count` counter.
 * 2. Resolves the public CDN storage URL from `public-articles`.
 * 3. Redirects the user directly to the public PDF asset.
 */
export async function GET(request, { params }) {
  try {
    const articleId = params.id;

    if (!articleId) {
      return NextResponse.json({ error: 'Article identifier is required.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch Published Article Metadata
    const { data: article, error: articleError } = await supabase
      .from('published_articles')
      .select('id, title, storage_path, doi')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: 'Published article not found.' }, { status: 404 });
    }

    // 2. Atomically Increment download_count via RPC
    // Use admin client to guarantee count update even for unauthenticated public readers
    const adminClient = createAdminClient();
    const { error: rpcError } = await adminClient.rpc('increment_article_download', {
      target_article_id: article.id,
    });

    if (rpcError) {
      // Non-blocking fallback direct increment if RPC is unavailable
      console.warn('[API Warning] increment_article_download RPC failed, attempting direct update:', rpcError.message);
      await adminClient
        .from('published_articles')
        .update({ download_count: supabase.raw ? supabase.raw('download_count + 1') : undefined })
        .eq('id', article.id);
    }

    // 3. Resolve Public Storage URL from public-articles bucket
    const { data: publicUrlData } = adminClient.storage
      .from('public-articles')
      .getPublicUrl(article.storage_path);

    if (!publicUrlData?.publicUrl) {
      return NextResponse.json(
        { error: 'Public article asset URL could not be resolved.' },
        { status: 500 }
      );
    }

    // 4. Redirect to the Public PDF File
    return NextResponse.redirect(publicUrlData.publicUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('[API Exception] /api/articles/[id]/download:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing article download.' },
      { status: 500 }
    );
  }
}

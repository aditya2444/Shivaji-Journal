// ==============================================================================
// Author Dashboard Page (Pure JavaScript / JSX)
// Displays author's submitted manuscripts, tracking status, scorecards, and direct submit action
// ==============================================================================

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  UploadCloud,
  ChevronRight,
  LogOut,
  Mail,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export const metadata = {
  title: 'Author Dashboard | Shivraj 350 Journal',
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Verify User Session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login?role=author&redirectTo=/dashboard');
  }

  // 2. Fetch Author Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, department, role')
    .eq('id', user.id)
    .single();

  // 3. Fetch Author's Manuscripts
  const { data: manuscripts } = await supabase
    .from('manuscripts')
    .select(`
      id,
      tracking_id,
      title,
      abstract,
      department,
      status,
      round_number,
      created_at,
      reviews (
        id,
        recommendation,
        comments_to_author,
        task_status
      )
    `)
    .eq('author_id', user.id)
    .order('created_at', { ascending: false });

  const submissions = manuscripts || [];

  // Metrics calculation
  const totalSubmissions = submissions.length;
  const inReviewCount = submissions.filter((s) => ['SUBMITTED', 'IN_REVIEW', 'DECISION_PENDING'].includes(s.status)).length;
  const revisionCount = submissions.filter((s) => s.status === 'REVISION_REQUIRED').length;
  const acceptedCount = submissions.filter((s) => ['ACCEPTED', 'PUBLISHED'].includes(s.status)).length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="px-2.5 py-1 text-xs font-mono rounded bg-blue-950/80 border border-blue-800 text-blue-300">Submitted</span>;
      case 'IN_REVIEW':
        return <span className="px-2.5 py-1 text-xs font-mono rounded bg-amber-950/80 border border-amber-800 text-amber-300">In Peer Review</span>;
      case 'DECISION_PENDING':
        return <span className="px-2.5 py-1 text-xs font-mono rounded bg-purple-950/80 border border-purple-800 text-purple-300">Decision Pending</span>;
      case 'REVISION_REQUIRED':
        return <span className="px-2.5 py-1 text-xs font-mono rounded bg-orange-950/80 border border-orange-800 text-orange-300">Revision Required</span>;
      case 'ACCEPTED':
        return <span className="px-2.5 py-1 text-xs font-mono rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300">Accepted</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 text-xs font-mono rounded bg-red-950/80 border border-red-800 text-red-300">Declined</span>;
      case 'PUBLISHED':
        return <span className="px-2.5 py-1 text-xs font-mono rounded bg-teal-950/80 border border-teal-800 text-teal-300">Published</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800 border border-slate-700 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-300 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#D4AF37] uppercase tracking-wider font-semibold">
                Shivaji College • University of Delhi
              </span>
            </div>
            <h1 className="text-2xl font-cinzel font-bold text-white mt-1">
              Author Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#881337] hover:bg-[#9F1239] text-white rounded-md text-xs font-medium transition-colors shadow-md"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Direct Submit Manuscript</span>
            </a>

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="p-2 text-slate-400 hover:text-white rounded-md border border-slate-800 hover:bg-slate-800 text-xs flex items-center gap-1.5 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </form>
          </div>
        </div>

        {/* Welcome & Profile Summary */}
        <div className="bg-[#141B2D] border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs text-slate-400 font-mono">Welcome Back,</span>
            <h2 className="text-lg font-semibold text-white">
              {profile?.full_name || user.email}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {profile?.department || 'General Academics'} • Affiliation: Shivaji College, University of Delhi
            </p>
          </div>

          <div className="text-xs font-mono text-slate-400 border-l border-slate-700 pl-4 py-1">
            <span>Official Journal Desk:</span>
            <a href="mailto:shivraj350@shivaji.du.ac.in" className="text-[#D4AF37] block mt-0.5 hover:underline">
              shivraj350@shivaji.du.ac.in
            </a>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#141B2D]/80 border border-slate-800 rounded-xl p-5">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Total Submissions</span>
            <span className="text-3xl font-mono font-bold text-white mt-2 block">{totalSubmissions}</span>
          </div>

          <div className="bg-[#141B2D]/80 border border-slate-800 rounded-xl p-5">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider block">In Peer Review</span>
            <span className="text-3xl font-mono font-bold text-amber-400 mt-2 block">{inReviewCount}</span>
          </div>

          <div className="bg-[#141B2D]/80 border border-slate-800 rounded-xl p-5">
            <span className="text-xs font-mono text-orange-400 uppercase tracking-wider block">Revisions Requested</span>
            <span className="text-3xl font-mono font-bold text-orange-400 mt-2 block">{revisionCount}</span>
          </div>

          <div className="bg-[#141B2D]/80 border border-slate-800 rounded-xl p-5">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block">Accepted / Published</span>
            <span className="text-3xl font-mono font-bold text-emerald-400 mt-2 block">{acceptedCount}</span>
          </div>
        </div>

        {/* Submissions List */}
        <div className="bg-[#141B2D] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-cinzel font-bold text-white">Your Submitted Manuscripts</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time status updates under double-blind peer review.</p>
            </div>

            <a
              href="/submit"
              className="text-xs font-mono text-[#D4AF37] hover:underline flex items-center gap-1"
            >
              <span>+ New Submission</span>
            </a>
          </div>

          {submissions.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-slate-200">No Manuscripts Submitted Yet</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-6">
                You have not submitted any papers to Shivraj 350 Journal yet. Use our direct upload form to get started.
              </p>
              <a
                href="/submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#881337] hover:bg-[#9F1239] text-white rounded-md text-xs font-medium transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Direct Option to Submit Manuscript</span>
              </a>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {submissions.map((paper) => (
                <div key={paper.id} className="p-6 hover:bg-slate-800/20 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xs font-mono font-bold text-[#D4AF37]">
                          {paper.tracking_id}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-xs text-slate-400 font-mono">
                          Round {paper.round_number}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(paper.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <h4 className="text-base font-playfair font-semibold text-white">
                        {paper.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 max-w-3xl">
                        {paper.abstract}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {getStatusBadge(paper.status)}
                    </div>
                  </div>

                  {/* Actions & Decision Notice */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-4">
                      <a
                        href={`/api/manuscripts/${paper.id}/download?file_type=ANONYMIZED_MANUSCRIPT`}
                        target="_blank"
                        className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Download Blind Paper</span>
                      </a>
                      <a
                        href={`/api/manuscripts/${paper.id}/download?file_type=COVER_LETTER`}
                        target="_blank"
                        className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Title Page / Declaration</span>
                      </a>
                    </div>

                    {paper.status === 'REVISION_REQUIRED' && (
                      <a
                        href={`/submit?revision_for=${paper.id}`}
                        className="text-orange-400 hover:underline font-mono font-semibold flex items-center gap-1"
                      >
                        <span>Submit Revised Paper (Round {paper.round_number})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Review Comments if Decision is Reached */}
                  {paper.reviews && paper.reviews.length > 0 && ['DECISION_PENDING', 'REVISION_REQUIRED', 'ACCEPTED', 'REJECTED'].includes(paper.status) && (
                    <div className="mt-4 p-4 rounded-lg bg-dark-900 border border-slate-800 text-xs">
                      <strong className="text-slate-200 block mb-2 font-mono uppercase tracking-wider text-[11px]">
                        Reviewer Evaluations:
                      </strong>
                      <div className="space-y-2">
                        {paper.reviews.map((rev, idx) => (
                          <div key={rev.id || idx} className="p-2.5 rounded bg-slate-800/40 border border-slate-700/50">
                            <span className="font-semibold text-slate-300">
                              Reviewer {idx + 1} Recommendation: <span className="text-[#D4AF37]">{rev.recommendation || 'Evaluated'}</span>
                            </span>
                            {rev.comments_to_author && (
                              <p className="text-slate-400 mt-1 whitespace-pre-wrap">{rev.comments_to_author}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Editorial Notice */}
        <div className="text-center text-xs text-slate-500 font-mono pt-4">
          Questions regarding your submission? Contact the Editorial Office at{' '}
          <a href="mailto:shivraj350@shivaji.du.ac.in" className="text-[#D4AF37] underline">
            shivraj350@shivaji.du.ac.in
          </a>
        </div>
      </div>
    </div>
  );
}

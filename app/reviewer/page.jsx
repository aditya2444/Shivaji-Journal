// ==============================================================================
// Reviewer Portal Page (Pure JavaScript / JSX)
// Double-blind manuscript evaluation portal with scorecards and anonymized downloads
// ==============================================================================

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  UserCheck,
  EyeOff,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LogOut,
  HelpCircle
} from 'lucide-react';
import ReviewScorecardModal from './ReviewScorecardModal';

export const metadata = {
  title: 'Reviewer Portal | Shivraj 350 Journal',
};

export default async function ReviewerPortalPage() {
  const supabase = await createClient();

  // 1. Verify User Session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login?role=reviewer&redirectTo=/reviewer');
  }

  // 2. Fetch Reviewer Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, department, role')
    .eq('id', user.id)
    .single();

  if (!profile || !['REVIEWER', 'EDITOR', 'ADMIN'].includes(profile.role)) {
    redirect('/dashboard?error=unauthorized_reviewer');
  }

  // 3. Fetch Assigned Reviews for this Reviewer
  // Strict double-blind: author_id is omitted from query!
  const { data: assignedReviews } = await supabase
    .from('reviews')
    .select(`
      id,
      manuscript_id,
      round_number,
      task_status,
      score,
      recommendation,
      comments_to_author,
      confidential_editor_notes,
      invited_at,
      submitted_at,
      manuscripts:manuscript_id (
        id,
        tracking_id,
        title,
        abstract,
        department,
        status
      )
    `)
    .eq('reviewer_id', user.id)
    .order('created_at', { ascending: false });

  const reviewsList = assignedReviews || [];
  const pendingReviews = reviewsList.filter((r) => r.task_status !== 'SUBMITTED');
  const completedReviews = reviewsList.filter((r) => r.task_status === 'SUBMITTED');

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-300 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#D4AF37] uppercase tracking-wider font-semibold">
                Shivaji College • University of Delhi
              </span>
            </div>
            <h1 className="text-2xl font-cinzel font-bold text-white mt-1 flex items-center gap-3">
              <span>Peer Reviewer Portal</span>
              <span className="text-xs font-mono uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded-full font-normal">
                Double-Blind System
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-white block">{profile.full_name}</span>
              <span className="text-[11px] text-slate-400 font-mono block">{profile.department}</span>
            </div>

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

        {/* Double-Blind Peer Review Notice Banner */}
        <div className="bg-[#141B2D] border-l-4 border-[#D4AF37] border-y border-r border-slate-800 rounded-r-xl p-6 flex items-start gap-4">
          <EyeOff className="w-6 h-6 text-[#D4AF37] shrink-0 mt-1" />
          <div className="text-xs text-slate-300 space-y-1">
            <h3 className="font-semibold text-white text-sm">Double-Blind Integrity Protocol</h3>
            <p className="leading-relaxed">
              In accordance with Shivraj 350 editorial ethics, author identities and institutional affiliations have been strictly removed from these papers. You are provided with the anonymized manuscript only.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Please assess submissions solely on theoretical rigor, empirical validity, methodology, and scholarly originality.
            </p>
          </div>
        </div>

        {/* Pending Reviews Section */}
        <div className="bg-[#141B2D] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-cinzel font-bold text-white">Pending Evaluation Assignments</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manuscripts awaiting your expert peer review scorecard.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-mono text-xs">
              {pendingReviews.length} Action Required
            </span>
          </div>

          {pendingReviews.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-slate-200">No Pending Reviews</h4>
              <p className="text-xs text-slate-400 mt-1">
                You have completed all current peer evaluation assignments. Thank you for your service.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {pendingReviews.map((rev) => {
                const paper = rev.manuscripts;
                if (!paper) return null;

                return (
                  <div key={rev.id} className="p-6 hover:bg-slate-800/20 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="text-xs font-mono font-bold text-[#D4AF37]">
                            {paper.tracking_id}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs font-mono text-slate-400">
                            Round {rev.round_number}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs font-mono text-slate-500">
                            Department: {paper.department}
                          </span>
                        </div>
                        <h4 className="text-base font-playfair font-semibold text-white">
                          {paper.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-3 leading-relaxed max-w-3xl">
                          {paper.abstract}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="px-2.5 py-1 text-xs font-mono rounded bg-amber-950/80 border border-amber-800 text-amber-300">
                          {rev.task_status}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons & Scorecard Trigger */}
                    <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                      <a
                        href={`/api/manuscripts/${paper.id}/download?file_type=ANONYMIZED_MANUSCRIPT`}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#0B0F19] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded text-xs font-medium transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Download Anonymized Manuscript (PDF)</span>
                      </a>

                      <ReviewScorecardModal
                        reviewId={rev.id}
                        paperTitle={paper.title}
                        trackingId={paper.tracking_id}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed Reviews History */}
        {completedReviews.length > 0 && (
          <div className="bg-[#141B2D] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-cinzel font-bold text-white">Completed Evaluations</h3>
              <span className="text-xs font-mono text-slate-400">
                {completedReviews.length} Submitted
              </span>
            </div>

            <div className="divide-y divide-slate-800/60">
              {completedReviews.map((rev) => {
                const paper = rev.manuscripts;
                if (!paper) return null;

                return (
                  <div key={rev.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                    <div>
                      <span className="font-mono text-[#D4AF37] font-bold block">
                        {paper.tracking_id}
                      </span>
                      <span className="font-medium text-slate-200 text-sm block mt-0.5">
                        {paper.title}
                      </span>
                      <span className="text-slate-400 text-[11px] mt-0.5 block">
                        Evaluation: Score {rev.score}/10 • Recommendation: <strong className="text-emerald-400">{rev.recommendation}</strong>
                      </span>
                    </div>

                    <span className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono">
                      Completed
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Support Footer */}
        <div className="text-center text-xs text-slate-500 font-mono pt-4">
          Assistance for peer review committee: <a href="mailto:shivraj350@shivaji.du.ac.in" className="text-[#D4AF37] underline">shivraj350@shivaji.du.ac.in</a>
        </div>
      </div>
    </div>
  );
}

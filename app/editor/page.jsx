// ==============================================================================
// Editor Access & Editorial Board Portal (Pure JavaScript / JSX)
// Manuscript queue triage, reviewer assignment with COI checks, and decision issuance
// ==============================================================================

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Shield,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  Mail,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import EditorActionPanel from './EditorActionPanel';

export const metadata = {
  title: 'Editor Access | Shivraj 350 Journal',
};

export default async function EditorPortalPage() {
  const supabase = await createClient();

  // 1. Verify User Session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login?role=editor&redirectTo=/editor');
  }

  // 2. Fetch Profile & Verify Role
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, department')
    .eq('id', user.id)
    .single();

  if (!profile || !['EDITOR', 'ADMIN'].includes(profile.role)) {
    redirect('/dashboard?error=unauthorized_editor');
  }

  // 3. Fetch All Manuscripts with Author & Reviews Information
  const { data: allManuscripts } = await supabase
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
      author_id,
      profiles:author_id (
        id,
        full_name,
        email,
        department
      ),
      reviews (
        id,
        reviewer_id,
        round_number,
        task_status,
        score,
        recommendation,
        comments_to_author,
        confidential_editor_notes,
        profiles:reviewer_id (full_name, department)
      )
    `)
    .order('created_at', { ascending: false });

  // 4. Fetch Available Reviewers for Assignment Dropdown
  const { data: availableReviewers } = await supabase
    .from('profiles')
    .select('id, full_name, email, department, role')
    .in('role', ['REVIEWER', 'EDITOR', 'ADMIN'])
    .order('full_name');

  const manuscriptsList = allManuscripts || [];
  const reviewersList = availableReviewers || [];

  // Metrics
  const totalSubmissions = manuscriptsList.length;
  const unassignedCount = manuscriptsList.filter((m) => m.status === 'SUBMITTED').length;
  const inReviewCount = manuscriptsList.filter((m) => m.status === 'IN_REVIEW').length;
  const decisionPendingCount = manuscriptsList.filter((m) => m.status === 'DECISION_PENDING').length;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-300 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#D4AF37] uppercase tracking-wider font-semibold">
                Shivaji College • University of Delhi
              </span>
            </div>
            <h1 className="text-2xl font-cinzel font-bold text-white mt-1 flex items-center gap-3">
              <Shield className="w-6 h-6 text-[#D4AF37]" />
              <span>Chief Editorial Board & Triage Portal</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-white block">{profile.full_name}</span>
              <span className="text-[11px] text-[#D4AF37] font-mono block">
                {profile.role === 'ADMIN' ? 'System Administrator' : 'Section Editor'}
              </span>
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

        {/* 4 Summary Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#141B2D] border border-slate-800 rounded-xl p-5">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Total Submissions</span>
            <span className="text-3xl font-mono font-bold text-white mt-2 block">{totalSubmissions}</span>
          </div>

          <div className="bg-[#141B2D] border border-slate-800 rounded-xl p-5">
            <span className="text-xs font-mono text-blue-400 uppercase tracking-wider block">Needs Assignment</span>
            <span className="text-3xl font-mono font-bold text-blue-400 mt-2 block">{unassignedCount}</span>
          </div>

          <div className="bg-[#141B2D] border border-slate-800 rounded-xl p-5">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider block">Active in Review</span>
            <span className="text-3xl font-mono font-bold text-amber-400 mt-2 block">{inReviewCount}</span>
          </div>

          <div className="bg-[#141B2D] border border-slate-800 rounded-xl p-5">
            <span className="text-xs font-mono text-purple-400 uppercase tracking-wider block">Decision Pending</span>
            <span className="text-3xl font-mono font-bold text-purple-400 mt-2 block">{decisionPendingCount}</span>
          </div>
        </div>

        {/* Editorial Manuscript Triage Queue */}
        <div className="bg-[#141B2D] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-cinzel font-bold text-white">Manuscript Triage & Decision Queue</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Assign peer reviewers (with automated COI prevention) and issue official decisions.
              </p>
            </div>
          </div>

          {manuscriptsList.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="text-sm">No submissions recorded in the journal registry.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {manuscriptsList.map((manuscript) => {
                const author = manuscript.profiles;
                const activeReviews = manuscript.reviews || [];

                return (
                  <div key={manuscript.id} className="p-6 hover:bg-slate-800/20 transition-colors">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                          <span className="text-xs font-mono font-bold text-[#D4AF37]">
                            {manuscript.tracking_id}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-400 font-mono">
                            Round {manuscript.round_number}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-400 font-mono">
                            Dept: {manuscript.department}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-500 font-mono">
                            Author: <strong className="text-slate-300 font-medium">{author?.full_name || 'Anonymous'}</strong> ({author?.department || 'N/A'})
                          </span>
                        </div>

                        <h4 className="text-base font-playfair font-semibold text-white">
                          {manuscript.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 max-w-4xl">
                          {manuscript.abstract}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800 border border-slate-700 text-[#D4AF37]">
                          {manuscript.status}
                        </span>
                      </div>
                    </div>

                    {/* Assigned Reviewers Status Summary */}
                    {activeReviews.length > 0 && (
                      <div className="mb-4 p-3 rounded bg-[#0B0F19] border border-slate-800 text-xs">
                        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                          Assigned Reviewers (Round {manuscript.round_number}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {activeReviews.map((rev) => (
                            <span
                              key={rev.id}
                              className={`px-2.5 py-1 rounded text-[11px] font-mono border flex items-center gap-1.5 ${
                                rev.task_status === 'SUBMITTED'
                                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
                              }`}
                            >
                              <span>{rev.profiles?.full_name || 'Reviewer'}:</span>
                              <strong>{rev.task_status}</strong>
                              {rev.score && <span>({rev.score}/10)</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Panel Component */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        <a
                          href={`/api/manuscripts/${manuscript.id}/download?file_type=COVER_LETTER`}
                          target="_blank"
                          className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Title Page / Cover Letter</span>
                        </a>
                        <a
                          href={`/api/manuscripts/${manuscript.id}/download?file_type=ANONYMIZED_MANUSCRIPT`}
                          target="_blank"
                          className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Anonymized Paper</span>
                        </a>
                      </div>

                      <EditorActionPanel
                        manuscriptId={manuscript.id}
                        trackingId={manuscript.tracking_id}
                        authorId={manuscript.author_id}
                        department={manuscript.department}
                        currentStatus={manuscript.status}
                        availableReviewers={reviewersList}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 font-mono pt-4">
          Chief Editorial Desk: <a href="mailto:shivraj350@shivaji.du.ac.in" className="text-[#D4AF37] underline">shivraj350@shivaji.du.ac.in</a>
        </div>
      </div>
    </div>
  );
}

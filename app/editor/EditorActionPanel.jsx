// ==============================================================================
// Editor Action Panel Component (Pure JavaScript / JSX)
// Client component handling reviewer assignment (with COI prevention) and editorial decisions
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { assignReviewerAction, makeEditorialDecisionAction } from '@/app/actions/editor';
import {
  UserPlus,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
  Send,
  ShieldCheck
} from 'lucide-react';

export default function EditorActionPanel({
  manuscriptId,
  trackingId,
  authorId,
  department,
  currentStatus,
  availableReviewers,
}) {
  // Modal states
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);

  // Assignment form state
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  // Decision form state
  const [decision, setDecision] = useState('ACCEPTED');
  const [editorNotes, setEditorNotes] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [decisionSuccess, setDecisionSuccess] = useState('');

  // Filter out immediate COI candidates for clean UI feedback
  const eligibleReviewers = (availableReviewers || []).filter((rev) => {
    return rev.id !== authorId;
  });

  const handleAssignReviewer = async (e) => {
    e.preventDefault();
    setAssignError('');
    setAssignSuccess('');

    if (!selectedReviewerId) {
      setAssignError('Please select a peer reviewer from the roster.');
      return;
    }

    try {
      setIsAssigning(true);
      const res = await assignReviewerAction({
        manuscriptId,
        reviewerId: selectedReviewerId,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to assign reviewer.');
      }

      setAssignSuccess(res.message || 'Reviewer successfully assigned.');
      setTimeout(() => {
        setIsAssignOpen(false);
        setAssignSuccess('');
        setSelectedReviewerId('');
      }, 1500);
    } catch (err) {
      setAssignError(err.message || 'Error assigning reviewer.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleMakeDecision = async (e) => {
    e.preventDefault();
    setDecisionError('');
    setDecisionSuccess('');

    try {
      setIsDeciding(true);
      const res = await makeEditorialDecisionAction({
        manuscriptId,
        decision,
        editorNotes,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to record decision.');
      }

      setDecisionSuccess(res.message || 'Editorial decision recorded.');
      setTimeout(() => {
        setIsDecisionOpen(false);
        setDecisionSuccess('');
      }, 1500);
    } catch (err) {
      setDecisionError(err.message || 'Error recording decision.');
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Button 1: Assign Reviewer */}
      <button
        type="button"
        onClick={() => setIsAssignOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#141B2D] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded text-xs transition-colors"
      >
        <UserPlus className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span>Assign Reviewer</span>
      </button>

      {/* Button 2: Issue Decision */}
      <button
        type="button"
        onClick={() => setIsDecisionOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#881337] hover:bg-[#9F1239] text-white rounded text-xs transition-colors"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Issue Decision</span>
      </button>

      {/* --- MODAL 1: ASSIGN REVIEWER --- */}
      {isAssignOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141B2D] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsAssignOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 border-b border-slate-800 pb-3">
              <span className="text-[11px] font-mono text-[#D4AF37] uppercase tracking-wider block">
                Assign Peer Reviewer • {trackingId}
              </span>
              <h3 className="text-base font-cinzel font-bold text-white mt-1">
                Conflict of Interest (COI) Protected Assignment
              </h3>
            </div>

            {assignError && (
              <div className="mb-4 p-3 rounded bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{assignError}</span>
              </div>
            )}

            {assignSuccess && (
              <div className="mb-4 p-3 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{assignSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAssignReviewer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Peer Reviewer from Roster *
                </label>
                <select
                  required
                  value={selectedReviewerId}
                  onChange={(e) => setSelectedReviewerId(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-slate-700 text-white rounded-md py-2 px-3 text-xs focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="" disabled>Choose external faculty / reviewer...</option>
                  {eligibleReviewers.map((rev) => {
                    const isSameDept = rev.department?.toLowerCase() === department?.toLowerCase();
                    return (
                      <option
                        key={rev.id}
                        value={rev.id}
                        disabled={isSameDept}
                        className={isSameDept ? 'text-slate-600 bg-slate-900' : ''}
                      >
                        {rev.full_name} ({rev.department || 'General'}) {isSameDept ? '[COI: Same Dept]' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Note: Candidates from the author's department ({department}) are disabled automatically to prevent COI.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-4 py-2 bg-[#881337] hover:bg-[#9F1239] text-white rounded text-xs font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <span>Confirm & Send Invitation</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ISSUE EDITORIAL DECISION --- */}
      {isDecisionOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141B2D] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsDecisionOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 border-b border-slate-800 pb-3">
              <span className="text-[11px] font-mono text-[#D4AF37] uppercase tracking-wider block">
                Official Editorial Determination • {trackingId}
              </span>
              <h3 className="text-base font-cinzel font-bold text-white mt-1">
                Record Editorial Decision
              </h3>
            </div>

            {decisionError && (
              <div className="mb-4 p-3 rounded bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{decisionError}</span>
              </div>
            )}

            {decisionSuccess && (
              <div className="mb-4 p-3 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{decisionSuccess}</span>
              </div>
            )}

            <form onSubmit={handleMakeDecision} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Editorial Determination *
                </label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-slate-700 text-white rounded-md py-2 px-3 text-xs focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="ACCEPTED">Accepted for Publication</option>
                  <option value="REVISION_REQUIRED">Revision Required (Advance to Next Round)</option>
                  <option value="REJECTED">Declined / Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Editorial Instructions to Author (Included in Formal Decision Email)
                </label>
                <textarea
                  rows={4}
                  value={editorNotes}
                  onChange={(e) => setEditorNotes(e.target.value)}
                  placeholder="Summarize key revisions required or publication congratulations..."
                  className="w-full bg-[#0B0F19] border border-slate-700 text-white rounded-md py-2 px-3 text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDecisionOpen(false)}
                  className="px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeciding}
                  className="px-4 py-2 bg-[#881337] hover:bg-[#9F1239] text-white rounded text-xs font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeciding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Issuing Decision...</span>
                    </>
                  ) : (
                    <span>Confirm Decision & Notify Author</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// Review Scorecard Modal Component (Pure JavaScript / JSX)
// Client component allowing peer reviewers to submit evaluation scorecards
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { submitReviewAction } from '@/app/actions/review';
import {
  FileCheck2,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Star
} from 'lucide-react';

export default function ReviewScorecardModal({ reviewId, paperTitle, trackingId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [score, setScore] = useState(8);
  const [recommendation, setRecommendation] = useState('ACCEPT');
  const [commentsToAuthor, setCommentsToAuthor] = useState('');
  const [confidentialNotes, setConfidentialNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!commentsToAuthor.trim() || commentsToAuthor.trim().length < 30) {
      setErrorMessage('Please provide substantive feedback to the author (at least 30 characters).');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await submitReviewAction({
        reviewId,
        score,
        recommendation,
        commentsToAuthor: commentsToAuthor.trim(),
        confidentialNotes: confidentialNotes.trim(),
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to submit review.');
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
      }, 1800);
    } catch (err) {
      console.error('[Scorecard Error]', err);
      setErrorMessage(err.message || 'An error occurred while submitting evaluation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#881337] hover:bg-[#9F1239] text-white rounded text-xs font-medium transition-colors shadow-sm"
      >
        <FileCheck2 className="w-3.5 h-3.5" />
        <span>Submit Review Scorecard</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#141B2D] border border-slate-700 rounded-2xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 border-b border-slate-800 pb-4">
              <span className="text-[11px] font-mono text-[#D4AF37] uppercase tracking-wider block">
                Peer Evaluation Scorecard • {trackingId}
              </span>
              <h3 className="text-lg font-cinzel font-bold text-white mt-1">
                {paperTitle}
              </h3>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isSuccess ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-bounce" />
                <h4 className="text-lg font-cinzel font-bold text-white">
                  Evaluation Submitted Successfully
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Your peer review scorecard has been recorded in the journal registry.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Score & Recommendation Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Overall Scholarly Score (1–10) *</span>
                      <span className="font-mono text-[#D4AF37] font-bold text-sm">{score}/10</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={score}
                      onChange={(e) => setScore(parseInt(e.target.value, 10))}
                      className="w-full accent-[#D4AF37] bg-slate-800 h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>1 (Poor)</span>
                      <span>5 (Average)</span>
                      <span>10 (Outstanding)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Recommendation *
                    </label>
                    <select
                      value={recommendation}
                      onChange={(e) => setRecommendation(e.target.value)}
                      className="w-full bg-[#0B0F19] border border-slate-700 text-white rounded-md py-2 px-3 text-xs focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="ACCEPT">Accept as Submitted</option>
                      <option value="MINOR_REVISION">Minor Revisions Required</option>
                      <option value="MAJOR_REVISION">Major Revisions Required</option>
                      <option value="REJECT">Reject / Decline Submission</option>
                    </select>
                  </div>
                </div>

                {/* Comments to Author */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Constructive Comments to Author(s) *
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    This critique will be shared with the author upon formal editorial decision. Do not reveal your identity.
                  </p>
                  <textarea
                    rows={5}
                    required
                    value={commentsToAuthor}
                    onChange={(e) => setCommentsToAuthor(e.target.value)}
                    placeholder="Detail specific observations regarding theoretical framework, methodology, experimental results, and citations..."
                    className="w-full bg-[#0B0F19] border border-slate-700 text-white rounded-md py-2 px-3 text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* Confidential Notes to Editor */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confidential Notes to Editorial Board (Optional)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    Strictly confidential. Visible only to the Chief Editor and Section Editors.
                  </p>
                  <textarea
                    rows={3}
                    value={confidentialNotes}
                    onChange={(e) => setConfidentialNotes(e.target.value)}
                    placeholder="Any private comments regarding potential plagiarism, ethical considerations, or priority..."
                    className="w-full bg-[#0B0F19] border border-slate-700 text-white rounded-md py-2 px-3 text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#881337] hover:bg-[#9F1239] text-white rounded text-xs font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting Evaluation...</span>
                      </>
                    ) : (
                      <span>Submit Evaluation</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

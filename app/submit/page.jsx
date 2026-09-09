// ==============================================================================
// Direct Manuscript Submission Page (Pure JavaScript / JSX)
// Embeds SubmitPaperForm component with author guidelines and direct upload pipeline
// ==============================================================================

import React from 'react';
import SubmitPaperForm from '@/components/SubmitPaperForm';
import {
  ChevronLeft,
  ShieldCheck,
  Award,
  Clock,
  FileCheck,
  Mail,
  ExternalLink
} from 'lucide-react';

export const metadata = {
  title: 'Direct Manuscript Submission | Shivraj 350 Journal',
  description: 'Direct submission portal for authors publishing in Shivraj: International Peer-Reviewed Multidisciplinary Journal.',
};

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-300 py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Header Navigation */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center pb-8 border-b border-slate-800 gap-4">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-[#D4AF37] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Journal Portal</span>
        </a>

        <div className="flex items-center gap-3">
          <a
            href="/login?role=author"
            className="px-3.5 py-1.5 rounded-md bg-[#141B2D] border border-slate-700 hover:border-[#D4AF37] text-xs font-mono text-slate-300 transition-colors"
          >
            Author Dashboard Login
          </a>
          <a
            href="mailto:shivraj350@shivaji.du.ac.in"
            className="text-xs font-mono text-[#D4AF37] hover:underline"
          >
            shivraj350@shivaji.du.ac.in
          </a>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Submission Guidelines & Policy Highlights */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#141B2D] border border-slate-800 rounded-2xl p-6">
            <span className="text-xs font-mono text-[#D4AF37] uppercase tracking-widest font-semibold block mb-2">
              Direct Option to Submit
            </span>
            <h2 className="text-xl font-cinzel font-bold text-white mb-3">
              Submission Guidelines
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Welcome to the official manuscript intake portal for Shivaji College, University of Delhi. Please ensure your files adhere to our double-blind review criteria.
            </p>

            <ul className="space-y-4 text-xs">
              <li className="flex items-start gap-3">
                <FileCheck className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
                <div>
                  <strong className="text-slate-200 block font-medium">1. Two Separate Files</strong>
                  <span className="text-slate-400 leading-relaxed">
                    Upload (a) a Title Page with author names & affiliations, and (b) an Anonymized Manuscript stripped of identifying details.
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-slate-200 block font-medium">2. Double-Blind Peer Review</strong>
                  <span className="text-slate-400 leading-relaxed">
                    Assigned reviewers never see your Title Page or institutional identities.
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <Award className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
                <div>
                  <strong className="text-slate-200 block font-medium">3. Zero Publication Fees</strong>
                  <span className="text-slate-400 leading-relaxed">
                    No Article Processing Charges (APC) for faculty and student researchers.
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-slate-200 block font-medium">4. Review Timeline</strong>
                  <span className="text-slate-400 leading-relaxed">
                    Standard peer-review turnaround is 4 to 6 weeks.
                  </span>
                </div>
              </li>
            </ul>
          </div>

          {/* Workflow Portal Quick Access */}
          <div className="bg-[#141B2D]/60 border border-slate-800 rounded-xl p-5 text-xs text-slate-400">
            <span className="font-mono text-[#D4AF37] text-[10px] uppercase tracking-wider block mb-1">
              Workflow Portals
            </span>
            <p className="mb-3">Looking to review an assigned paper or access the editorial triage queue?</p>
            <div className="space-y-2 font-mono">
              <a href="/login?role=reviewer" className="block text-slate-300 hover:text-[#D4AF37]">
                → Reviewer Portal Login
              </a>
              <a href="/login?role=editor" className="block text-slate-300 hover:text-[#D4AF37]">
                → Editor Access Portal
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Submission Form */}
        <div className="lg:col-span-8">
          <SubmitPaperForm />
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-slate-800 text-center text-xs text-slate-500 font-mono">
        <p>
          Shivraj 350: Multidisciplinary Journal • Shivaji College, University of Delhi
        </p>
        <p className="mt-1">
          Direct inquiries to Editorial Desk: <a href="mailto:shivraj350@shivaji.du.ac.in" className="text-[#D4AF37]">shivraj350@shivaji.du.ac.in</a>
        </p>
      </div>
    </div>
  );
}

// ==============================================================================
// Manuscript Submission Form Component (Pure JavaScript / React JSX)
// Directly uploads files to Supabase Storage Vault then calls registerManuscriptAction
// ==============================================================================

'use client';

import React, { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { registerManuscriptAction } from '@/app/actions/manuscript';
import {
  Upload,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  Lock,
  EyeOff
} from 'lucide-react';

const ACADEMIC_DEPARTMENTS = [
  'Computer Science',
  'Commerce & Management',
  'History & Archaeology',
  'Economics',
  'Physics & Material Sciences',
  'Chemistry & Chemical Biology',
  'Mathematics & Statistics',
  'Biochemistry & Life Sciences',
  'English & Literary Studies',
  'Hindi & Linguistics',
  'Political Science & Public Policy',
  'Environmental Studies',
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

export default function SubmitPaperForm() {
  // Form input states
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [department, setDepartment] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [declaration, setDeclaration] = useState(false);

  // File selection states
  const [coverLetterFile, setCoverLetterFile] = useState(null);
  const [manuscriptFile, setManuscriptFile] = useState(null);

  // Submission & progress state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState(''); // 'authenticating' | 'uploading_cover' | 'uploading_manuscript' | 'registering' | ''
  const [errorMessage, setErrorMessage] = useState('');
  const [submissionResult, setSubmissionResult] = useState(null); // { trackingId, manuscriptId }
  const [hasCopiedId, setHasCopiedId] = useState(false);

  // File input refs
  const coverLetterInputRef = useRef(null);
  const manuscriptInputRef = useRef(null);

  // Validate a selected file
  const validateFile = (file, label) => {
    if (!file) return `${label} is required.`;

    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `${label} must be a PDF or Word document (.pdf, .doc, .docx).`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `${label} exceeds the maximum allowed size of 25MB.`;
    }

    return null;
  };

  // Direct client-to-storage upload helper
  const uploadToVault = async (supabase, userId, file, prefix) => {
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${userId}/${Date.now()}_${prefix}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('manuscripts-vault')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
    }

    return {
      storagePath,
      fileName: file.name,
      fileSize: file.size,
    };
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // 1. Basic validation
    if (!title.trim() || title.trim().length < 5) {
      setErrorMessage('Please enter a comprehensive title (at least 5 characters).');
      return;
    }
    if (!abstract.trim() || abstract.trim().length < 50) {
      setErrorMessage('Please provide an abstract of at least 50 characters.');
      return;
    }
    if (!department) {
      setErrorMessage('Please select a research department.');
      return;
    }
    const keywords = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywords.length === 0) {
      setErrorMessage('Please enter at least one keyword (comma-separated).');
      return;
    }

    const coverError = validateFile(coverLetterFile, 'Title Page / Cover Letter');
    if (coverError) {
      setErrorMessage(coverError);
      return;
    }

    const manuscriptError = validateFile(manuscriptFile, 'Anonymized Manuscript');
    if (manuscriptError) {
      setErrorMessage(manuscriptError);
      return;
    }

    if (!declaration) {
      setErrorMessage('You must agree to the Declaration of Originality to proceed.');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadStep('Verifying authenticated session...');

      const supabase = createClient();

      // 2. Check authenticated session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to submit a manuscript. Please log in or register.');
      }

      // 3. Upload Title Page / Cover Letter to Private Storage Vault
      setUploadStep('Uploading Title Page & Author Declaration...');
      const coverLetterData = await uploadToVault(supabase, user.id, coverLetterFile, 'cover');

      // 4. Upload Anonymized Manuscript to Private Storage Vault
      setUploadStep('Uploading Anonymized Manuscript (Double-Blind Vault)...');
      const manuscriptData = await uploadToVault(supabase, user.id, manuscriptFile, 'blind');

      // 5. Invoke Next.js Server Action with storage references
      setUploadStep('Registering submission with Editorial Board...');
      const actionResult = await registerManuscriptAction({
        title: title.trim(),
        abstract: abstract.trim(),
        department,
        keywords,
        coverLetter: coverLetterData,
        anonymizedManuscript: manuscriptData,
      });

      if (!actionResult.success) {
        throw new Error(actionResult.error || 'Submission failed during registration.');
      }

      // 6. Success!
      setSubmissionResult(actionResult);
    } catch (err) {
      console.error('[Submission Error]', err);
      setErrorMessage(err.message || 'An error occurred during submission. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadStep('');
    }
  };

  const handleCopyTrackingId = () => {
    if (submissionResult?.trackingId) {
      navigator.clipboard.writeText(submissionResult.trackingId);
      setHasCopiedId(true);
      setTimeout(() => setHasCopiedId(false), 2000);
    }
  };

  // If successfully submitted, display confirmation screen
  if (submissionResult) {
    return (
      <div className="bg-dark-800 border border-gold-500/40 rounded-2xl p-8 lg:p-12 shadow-2xl text-center max-w-2xl mx-auto animate-fade-in">
        <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <span className="text-xs font-mono text-gold-400 tracking-widest uppercase font-semibold block mb-2">
          Submission Successful
        </span>
        <h3 className="text-2xl lg:text-3xl font-cinzel font-bold text-slate-100 mb-4">
          Manuscript Officially Recorded
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed mb-8">
          Your manuscript has been securely encrypted in the double-blind vault and submitted to the Editorial Board of{' '}
          <strong className="text-white">Shivraj 350: Multidisciplinary Journal</strong>. An acknowledgment email has been dispatched to your registered address.
        </p>

        {/* Tracking ID Box */}
        <div className="bg-dark-900 border border-slate-700 rounded-lg p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <span className="text-xs text-slate-400 font-mono block">Permanent Tracking Reference:</span>
            <span className="text-xl font-mono font-bold text-gold-400 tracking-wider">
              {submissionResult.trackingId}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyTrackingId}
            className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-slate-200 border border-slate-600 rounded-md text-xs font-mono transition-colors"
          >
            {hasCopiedId ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copy ID</span>
              </>
            )}
          </button>
        </div>

        {/* Next Steps Card */}
        <div className="bg-dark-900/50 border border-dark-700 rounded-lg p-5 text-left text-xs text-slate-400 space-y-2 mb-8">
          <h4 className="font-semibold text-slate-200 text-sm">Next Steps in Editorial Workflow:</h4>
          <p>1. <strong>Editorial Screening:</strong> The Chief Editor verifies compliance and plagiarism (&lt; 10% Turnitin).</p>
          <p>2. <strong>Double-Blind Assignment:</strong> External peer reviewers are assigned without access to your Title Page.</p>
          <p>3. <strong>Decision Notification:</strong> Peer evaluation reports and formal decision dispatched in 4–6 weeks.</p>
        </div>

        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => {
              setSubmissionResult(null);
              setTitle('');
              setAbstract('');
              setKeywordsInput('');
              setCoverLetterFile(null);
              setManuscriptFile(null);
              setDeclaration(false);
            }}
            className="px-6 py-2.5 bg-dark-700 hover:bg-dark-600 border border-slate-600 text-slate-300 rounded-md text-sm font-medium transition-colors"
          >
            Submit Another Paper
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 lg:p-12 shadow-2xl">
      <div className="mb-8 border-b border-dark-700 pb-6">
        <span className="text-xs font-mono text-gold-400 tracking-widest uppercase font-semibold block mb-1">
          Manuscript Submission Portal
        </span>
        <h3 className="text-2xl lg:text-3xl font-cinzel font-bold text-slate-100">
          Upload Research Paper
        </h3>
        <p className="text-slate-400 text-sm mt-1">
          Shivraj 350: International Peer-Reviewed Multidisciplinary Journal • Double-Blind Review System
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800/80 text-red-200 text-sm flex items-start gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block">Submission Error</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
            Manuscript Title <span className="text-red-400">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Deep Learning Approaches for Hindi Handwriting Recognition: A Comparative Study"
            className="w-full bg-dark-900 border border-slate-700 text-white rounded-md py-2.5 px-3 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-sm transition-colors"
          />
        </div>

        {/* Department & Keywords Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-slate-300 mb-2">
              Academic Department <span className="text-red-400">*</span>
            </label>
            <select
              id="department"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-dark-900 border border-slate-700 text-white rounded-md py-2.5 px-3 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-sm transition-colors"
            >
              <option value="" disabled>Select faculty / discipline...</option>
              {ACADEMIC_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-slate-300 mb-2">
              Keywords (Comma-separated) <span className="text-red-400">*</span>
            </label>
            <input
              id="keywords"
              type="text"
              required
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              placeholder="e.g., Computer Vision, Devanagari, Transformers"
              className="w-full bg-dark-900 border border-slate-700 text-white rounded-md py-2.5 px-3 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-sm transition-colors"
            />
          </div>
        </div>

        {/* Abstract */}
        <div>
          <label htmlFor="abstract" className="block text-sm font-medium text-slate-300 mb-2">
            Abstract <span className="text-red-400">*</span>
          </label>
          <textarea
            id="abstract"
            rows={5}
            required
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            placeholder="Provide a concise summary of the research methodology, principal findings, and scholarly contributions (minimum 50 characters)..."
            className="w-full bg-dark-900 border border-slate-700 text-white rounded-md py-2.5 px-3 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-sm transition-colors"
          />
        </div>

        {/* DUAL FILE UPLOAD SECTION (DOUBLE-BLIND INTEGRITY) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dark-700">
          {/* File 1: Title Page / Cover Letter */}
          <div className="bg-dark-900/60 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-gold-500" />
              <h4 className="text-sm font-semibold text-slate-200">1. Title Page & Cover Letter</h4>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Include full author names, institutional affiliations, corresponding email, and declarations. (Visible only to Editors).
            </p>

            <input
              type="file"
              ref={coverLetterInputRef}
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => setCoverLetterFile(e.target.files?.[0] || null)}
            />

            <button
              type="button"
              onClick={() => coverLetterInputRef.current?.click()}
              className={`w-full py-4 px-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
                coverLetterFile
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-700 hover:border-gold-500/50 bg-dark-800/50'
              }`}
            >
              {coverLetterFile ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-xs font-mono text-emerald-300 truncate max-w-full">
                    {coverLetterFile.name}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">Click to replace file</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-300 font-medium">Choose Title Page (.pdf, .docx)</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Max 25MB</span>
                </>
              )}
            </button>
          </div>

          {/* File 2: Anonymized Manuscript */}
          <div className="bg-dark-900/60 border border-slate-800 rounded-xl p-5 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-semibold text-slate-200">2. Anonymized Manuscript</h4>
              </div>
              <span className="text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
                Double-Blind
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Main text, tables, and figures strictly stripped of author names, affiliations, and acknowledgments.
            </p>

            <input
              type="file"
              ref={manuscriptInputRef}
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => setManuscriptFile(e.target.files?.[0] || null)}
            />

            <button
              type="button"
              onClick={() => manuscriptInputRef.current?.click()}
              className={`w-full py-4 px-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
                manuscriptFile
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-700 hover:border-gold-500/50 bg-dark-800/50'
              }`}
            >
              {manuscriptFile ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-xs font-mono text-emerald-300 truncate max-w-full">
                    {manuscriptFile.name}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">Click to replace file</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-300 font-medium">Choose Blind Manuscript (.pdf, .docx)</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Max 25MB</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Declaration */}
        <div className="bg-dark-900/40 border border-dark-700 rounded-lg p-4 flex items-start gap-3">
          <input
            id="declaration"
            type="checkbox"
            required
            checked={declaration}
            onChange={(e) => setDeclaration(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-700 bg-dark-900 text-burgundy-600 focus:ring-burgundy-500"
          />
          <label htmlFor="declaration" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
            <strong>Declaration of Scholarly Integrity:</strong> I declare that this manuscript represents original research, is not concurrently under review elsewhere, complies with UGC academic ethics, and that all co-authors have approved this submission.
          </label>
        </div>

        {/* Submit Button & Progress Indicator */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-lg font-medium text-sm text-white bg-burgundy-800 hover:bg-burgundy-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-burgundy-950/50 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                <span>{uploadStep || 'Processing submission...'}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 text-gold-400" />
                <span>Submit Manuscript for Double-Blind Review</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

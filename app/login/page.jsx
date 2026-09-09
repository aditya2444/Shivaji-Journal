// ==============================================================================
// Unified Workflow Portal & Authentication Page (Pure JavaScript / JSX)
// Supports Author Dashboard Login, Reviewer Portal, and Editor Access
// ==============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Shield,
  UserCheck,
  BookOpen,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';

const PORTAL_ROLES = [
  {
    id: 'author',
    label: 'Author Dashboard Login',
    subtitle: 'Submit manuscripts, track peer review, and view editorial decisions',
    icon: BookOpen,
    redirectPath: '/dashboard',
    badge: 'Faculty & Researchers',
  },
  {
    id: 'reviewer',
    label: 'Reviewer Portal',
    subtitle: 'Access assigned double-blind papers and submit evaluation scorecards',
    icon: UserCheck,
    redirectPath: '/reviewer',
    badge: 'Peer Reviewers',
  },
  {
    id: 'editor',
    label: 'Editor Access',
    subtitle: 'Manuscript queue triage, reviewer assignment, and decision issuance',
    icon: Shield,
    redirectPath: '/editor',
    badge: 'Editorial Board',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') || 'author';

  const [activeRole, setActiveRole] = useState(
    PORTAL_ROLES.some((r) => r.id === initialRole) ? initialRole : 'author'
  );
  const [isSignUp, setIsSignUp] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Computer Science');

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const currentRoleConfig = PORTAL_ROLES.find((r) => r.id === activeRole) || PORTAL_ROLES[0];

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && PORTAL_ROLES.some((r) => r.id === roleParam)) {
      setActiveRole(roleParam);
    }
  }, [searchParams]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (isSignUp) {
        // Registration workflow (Author only)
        if (!fullName.trim()) {
          throw new Error('Please enter your full academic name.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              department,
              role: 'AUTHOR',
            },
          },
        });

        if (error) throw error;

        setSuccessMessage(
          'Account created successfully. You may now log in to access the Author Dashboard.'
        );
        setIsSignUp(false);
      } else {
        // Sign-in workflow
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        // Fetch user profile to verify role permissions
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const userRole = (profile?.role || 'AUTHOR').toLowerCase();

        // Redirect based on active portal role or assigned profile role
        if (activeRole === 'editor' && !['editor', 'admin'].includes(userRole)) {
          throw new Error('Access Denied: This account does not possess Editorial Board privileges.');
        }

        if (activeRole === 'reviewer' && !['reviewer', 'editor', 'admin'].includes(userRole)) {
          throw new Error('Access Denied: This account is not registered as a Peer Reviewer.');
        }

        router.push(currentRoleConfig.redirectPath);
        router.refresh();
      }
    } catch (err) {
      console.error('[Auth Error]', err);
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-300 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar with Back to Journal Link */}
      <div className="max-w-5xl mx-auto w-full flex justify-between items-center pb-6 border-b border-slate-800">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-[#D4AF37] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Journal Portal</span>
        </a>
        <div className="text-right">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest block">
            Shivaji College • University of Delhi
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full my-auto py-8">
        <div className="text-center mb-8">
          <span className="text-xs font-mono text-[#D4AF37] uppercase tracking-[0.25em] font-bold block mb-2">
            WORKFLOW PORTAL
          </span>
          <h1 className="text-3xl sm:text-4xl font-cinzel font-bold text-white tracking-wide">
            Shivraj 350 Journal Management
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
            Secure gateway for authors, peer review committees, and the Chief Editorial Board.
          </p>
        </div>

        {/* 3 Role Selection Cards matching User Reference */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {PORTAL_ROLES.map((role) => {
            const Icon = role.icon;
            const isSelected = activeRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => {
                  setActiveRole(role.id);
                  setIsSignUp(false);
                  setErrorMessage('');
                }}
                className={`p-5 rounded-xl text-left border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#141B2D] border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.15)] ring-1 ring-[#D4AF37]'
                    : 'bg-[#141B2D]/60 border-slate-800 hover:border-slate-700 hover:bg-[#141B2D]'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-2 h-full bg-[#D4AF37]" />
                )}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-dark-900 border border-slate-700 text-slate-400">
                      {role.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-cinzel font-bold text-slate-100 mb-1">
                    {role.label}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {role.subtitle}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center text-xs font-mono text-[#D4AF37]">
                  <span>{isSelected ? 'Active Portal' : 'Select Portal'}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Authentication Card */}
        <div className="bg-[#141B2D] border border-slate-800 rounded-2xl p-8 max-w-md mx-auto shadow-2xl relative">
          <div className="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-[#D4AF37] uppercase tracking-wider block">
                {currentRoleConfig.label}
              </span>
              <h2 className="text-lg font-cinzel font-semibold text-white">
                {isSignUp ? 'Register New Account' : 'Sign In to Portal'}
              </h2>
            </div>

            {activeRole === 'author' && (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage('');
                }}
                className="text-xs text-[#D4AF37] hover:underline font-mono"
              >
                {isSignUp ? 'Already have account?' : 'Register as Author'}
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Full Academic Name & Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Dr. Rajesh Sharma"
                    className="w-full bg-[#0B0F19] border border-slate-700 text-white rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Department / Discipline *
                  </label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g., Department of Commerce"
                    className="w-full bg-[#0B0F19] border border-slate-700 text-white rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Institutional Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="author@shivaji.du.ac.in"
                  className="w-full bg-[#0B0F19] border border-slate-700 text-white rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#0B0F19] border border-slate-700 text-white rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-md font-medium text-sm text-white bg-[#881337] hover:bg-[#9F1239] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>
                  {isSignUp
                    ? 'Create Author Account'
                    : `Enter ${currentRoleConfig.label.split(' ')[0]} Portal`}
                </span>
              )}
            </button>
          </form>

          {/* Quick Direct Submit Option */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400 mb-2">Want to submit a paper right away?</p>
            <a
              href="/submit"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[#D4AF37] hover:underline"
            >
              <span>Direct Option to Submit Manuscript</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer referencing the exact contact from User's image */}
      <div className="max-w-5xl mx-auto w-full pt-6 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-400 font-mono">
          Email: <a href="mailto:shivraj350@shivaji.du.ac.in" className="text-[#D4AF37] underline underline-offset-2">shivraj350@shivaji.du.ac.in</a>
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Shivaji College, University of Delhi • Ring Road, Raja Garden, New Delhi – 110027, India
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/SupabaseProvider";
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const supabase = useSupabase();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const redirectTo = `${window.location.origin}/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(
        "If an account with that email exists, a password reset link has been sent."
      );
    }
  };

  return (
    <div className="w-full">
      {/* Back link */}
      <Link 
        href="/login" 
        className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#1e293b] transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e293b] mb-2">
          Reset your password
        </h1>
        <p className="text-[#64748b]">
          Enter your email and we&apos;ll send you a link to reset your password
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Something went wrong</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Check your inbox</p>
            <p className="text-sm text-green-600 mt-0.5">{success}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#1e293b] mb-2">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-[#94a3b8]" />
            </div>
            <input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="you@company.com"
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#e2e8f0] rounded-lg text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:border-transparent transition-all"
              autoComplete="email"
            />
          </div>
        </div>

        {/* Submit button */}
        <button 
          type="submit" 
          disabled={loading || !!success}
          className="w-full bg-[#1e293b] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#334155] focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Sending link...</span>
            </>
          ) : (
            <span>Send reset link</span>
          )}
        </button>
      </form>
    </div>
  );
}

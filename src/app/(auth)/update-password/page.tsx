"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/SupabaseProvider";
import { useAuth } from "@/lib/supabase/useAuth";
import { Lock, AlertCircle, CheckCircle2, Shield } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const { user, loading: authLoading } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!user) {
      setError("No session found. Please log in again.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Your password has been updated successfully!");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }
  };

  if (authLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-[#fbbf24] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#64748b]">Verifying your session...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="w-12 h-12 rounded-full bg-[#fbbf24]/10 flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-[#fbbf24]" />
        </div>
        <h1 className="text-2xl font-bold text-[#1e293b] mb-2">
          Set a new password
        </h1>
        <p className="text-[#64748b]">
          Create a strong password for your account
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Password update failed</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Password updated!</p>
            <p className="text-sm text-green-600 mt-0.5">{success}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* New Password field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#1e293b] mb-2">
            New password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-[#94a3b8]" />
            </div>
            <input 
              id="password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="Enter new password"
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#e2e8f0] rounded-lg text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Confirm Password field */}
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-[#1e293b] mb-2">
            Confirm new password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-[#94a3b8]" />
            </div>
            <input 
              id="confirm-password" 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
              placeholder="Confirm new password"
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#e2e8f0] rounded-lg text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:border-transparent transition-all"
            />
          </div>
          <p className="mt-2 text-xs text-[#94a3b8]">
            Must be at least 8 characters
          </p>
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
              <span>Updating password...</span>
            </>
          ) : (
            <span>Update password</span>
          )}
        </button>
      </form>
    </div>
  );
}

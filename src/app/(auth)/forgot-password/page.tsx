// src/app/(auth)/forgot-password/page.tsx

"use client"; // <--- THIS IS THE CRITICAL LINE

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // This is where the user will be redirected to after clicking the email link
    // Ensure this path matches the file you created: /update-password
    const redirectTo = `${window.location.origin}/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("If an account with that email exists, a password reset link has been sent.");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-center">Forgot Password</h1>
      <p className="text-center text-gray-600 mb-6">
        Enter your email to receive a password reset link.
      </p>

      {error && (
        <div className="mb-4 text-red-600 text-center font-medium">{error}</div>
      )}
      {success && (
        <div className="mb-4 text-green-600 text-center font-medium">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="email"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          disabled={loading || !!success}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
      <div className="mt-6 text-center text-sm">
        Remembered your password?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/SupabaseProvider"; // CHANGE 1: Import the context hook

export default function SignupPage() {
  const supabase = useSupabase(); // CHANGE 2: Get the client from context

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    // This logic works perfectly with the new client instance
    const { error } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // You can keep this success message or redirect the user
      setSuccess("Check your email to confirm your account.");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>
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
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Account"}
        </button>
      </form>
      <div className="mt-6 text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/SupabaseProvider"; // CHANGE 1: Import the context hook
import { useAuth } from "@/lib/supabase/useAuth";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = useSupabase(); // CHANGE 2: Get the client from context
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

    // This logic works perfectly with the new client instance.
    // The client from our context will automatically handle the session
    // from the password reset link in the URL.
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Your password has been updated successfully!");
      setTimeout(() => {
        router.push("/login");
      }, 2000); // Redirect to login after 2 seconds
    }
  };

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center">Verifying session...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-center">Set a New Password</h1>

      {error && (
        <div className="mb-4 text-red-600 text-center font-medium">{error}</div>
      )}
      {success && (
        <div className="mb-4 text-green-600 text-center font-medium">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-1"
          >
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium mb-1"
          >
            Confirm New Password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          disabled={loading || !!success}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

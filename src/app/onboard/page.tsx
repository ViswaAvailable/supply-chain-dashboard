"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Session } from "@supabase/supabase-js";

export default function OnboardPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  // State for the form fields
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // State for UI feedback
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for managing auth status
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      // The Supabase client needs a moment to process the session from the URL hash.
      // A small delay ensures it has time to do so before we check.
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (isMounted) {
        setSession(session);
        setIsLoadingSession(false);
      }
    }

    loadSession();

    // Also listen for auth changes as a fallback
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) {
          setSession(session);
          setIsLoadingSession(false);
        }
      }
    );

    // Cleanup function to prevent state updates on an unmounted component
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);


  const handleOnboard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
      data: { full_name: fullName },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Account setup complete! Redirecting to dashboard...");
      setTimeout(() => router.push("/dashboard"), 2000);
    }
    setIsSubmitting(false);
  };

  // While we wait for the session to be verified, show the loading message
  if (isLoadingSession) {
    return <div>Verifying your invitation... Please wait.</div>;
  }

  // If after loading, there's still no session, the invite is invalid
  if (!session) {
    return <div>Error: Invalid or expired invitation link.</div>;
  }

  // Once the session is loaded, show the form
  return (
    <div style={{ maxWidth: "400px", margin: "auto", padding: "20px" }}>
      <h1>Complete Your Account Setup</h1>
      <p>
        Welcome, <strong>{session.user.email}</strong>! Please set your name
        and password to continue.
      </p>

      <form onSubmit={handleOnboard}>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <button type="submit" disabled={isSubmitting} style={{ width: "100%", padding: "10px" }}>
          {isSubmitting ? "Setting up..." : "Complete Sign Up"}
        </button>

        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        {message && <p style={{ color: "green", marginTop: "10px" }}>{message}</p>}
      </form>
    </div>
  );
}

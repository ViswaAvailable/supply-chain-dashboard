"use client";


import { useAuth } from "@/lib/supabase/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { UserIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { Switch } from "@headlessui/react";
import { useSupabase } from "@/components/SupabaseProvider"; // Correct context hook


// --- TypeScript Interfaces ---
interface OrgUser {
  id: string;
  name?: string;
  email: string;
  role: string;
}


// --- Main Dashboard Component ---
export default function DashboardPage() {
  // --- 1. ALL HOOKS AT THE TOP ---
  // Core Hooks
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();


  // State Declarations
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userNameOrEmail, setUserNameOrEmail] = useState<string | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [orgNameLoading, setOrgNameLoading] = useState(false);
  const [orgNameError, setOrgNameError] = useState<string | null>(null);


  // Side Effects
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);


  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("org_id, role, name, email")
          .eq("id", user.id)
          .single();
        if (userError || !userData) {
          setError("Failed to fetch user profile.");
          setLoading(false);
          return;
        }
        setOrgId(userData.org_id);
        setUserRole(userData.role);
        setUserNameOrEmail(userData.name || userData.email || user.email || "");


        if (userData.org_id === null || userData.org_id === undefined) {
          setLoading(false);
          return;
        }
        setLoading(false);
      } catch (err) {
        setError("An unexpected error occurred.");
        setLoading(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [user, supabase]);


  useEffect(() => {
    // --- DEBUGGING ---: Log the dependencies for fetching org users
    if (process.env.NODE_ENV !== 'production') {
    console.log("Org Users Effect Dependencies:", { userRole, orgId });
    }

 
    if (userRole === "admin" && orgId) {
      console.log("Fetching organization users with orgId:", orgId);
      setUsersLoading(true);
      setUsersError(null);
      supabase
        .from("users")
        .select("id, name, email, role")
        .eq("org_id", orgId)
        .then(({ data, error }) => {
          // --- DEBUGGING ---: Log the result of the fetch
          // console.log("Fetched Org Users Data:", data);
          console.log("Fetch Org Users Error:", error);

          if (error) setUsersError("Failed to load users");
          setOrgUsers(data || []);
          setUsersLoading(false);
        });
    }
  }, [userRole, orgId, supabase]); // --- FIX ---: Removed `showAdminModal` from the dependency array


  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          if (process.env.NODE_ENV !== 'production') {
          console.log('No access token found');
          }
          return;
        }
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        // Uncomment console log below for JWT payload. Only for Dev Testing
        // console.log('JWT payload:', payload);
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
        console.error('JWT inspect error:', e);
        }
      }
    })();
  }, [supabase]);
  
  useEffect(() => {
    if (orgId) {
      setOrgNameLoading(true);
      setOrgNameError(null);
      supabase
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .single()
        .then(({ data, error }) => {
          if (error || !data || !data.name) {
            setOrgNameError("Could not load organization name.");
          } else {
            setOrgName(data.name);
          }
          setOrgNameLoading(false);
        });
    } else {
      setOrgName("");
    }
  }, [orgId, supabase]);


  // --- 2. CONDITIONAL RETURNS AFTER HOOKS ---
  if (authLoading) {
    return <div className="flex h-screen items-center justify-center">Loading session...</div>;
  }
  if (!user) {
    // This is a fallback while the redirect is happening.
    return null;
  }
  if (loading) {
    return <div className="text-center py-10">Loading data...</div>;
  }
  if (orgId === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-700">Waiting for Admin Approval</h1>
          <p className="text-lg text-gray-500">
            Your account has been created but is not yet linked to an organization.<br />
            Please wait for your organization admin to assign you or contact support if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-lg text-red-500">{error}</p>
        </div>
      </div>
    );
  }


  // --- 3. FINAL COMPONENT RENDER ---
  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-20 sm:w-56 bg-white shadow-lg flex flex-col items-center py-8 relative">
        <div className="flex-1" />
        <ProfileDropdownAvatar nameOrEmail={userNameOrEmail} role={userRole} onAdminClick={() => setShowAdminModal(true)} onLogout={signOut} />
        {showAdminModal && userRole === "admin" && (
          <AdminProfileInviteModal orgId={orgId || ""} currentUserId={user?.id || ""} orgUsers={orgUsers} setOrgUsers={setOrgUsers} onClose={() => setShowAdminModal(false)} user={user} userRole={userRole} orgName={orgName} orgNameLoading={orgNameLoading} orgNameError={orgNameError} />
        )}
      </aside>
      <main className="flex-1 p-6 sm:p-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">Welcome, {userNameOrEmail || ''}!</h1>
        <p>Your dashboard is under construction.</p>
      </main>
    </div>
  );
}



// --- All Helper Components ---
function ProfileDropdownAvatar({ nameOrEmail, role, onAdminClick, onLogout }: { nameOrEmail: string | null; role: string | null; onAdminClick: () => void; onLogout: () => void; }) { const isAdmin = role === "admin"; const [open, setOpen] = useState(false); const avatarRef = useRef<HTMLDivElement>(null); const menuRef = useRef<HTMLDivElement>(null); const [avatarHover, setAvatarHover] = useState(false); const [avatarFocus, setAvatarFocus] = useState(false); let initials = ""; if (nameOrEmail) { const parts = nameOrEmail.split(/[@\s.]+/).filter(Boolean); if (parts.length >= 2) { initials = parts[0][0].toUpperCase() + parts[1][0].toUpperCase(); } else if (parts.length === 1) { initials = parts[0][0].toUpperCase(); } } useEffect(() => { if (!open) return; function handleClick(e: MouseEvent) { if ( menuRef.current && !menuRef.current.contains(e.target as Node) && avatarRef.current && !avatarRef.current.contains(e.target as Node) ) { setOpen(false); } } function handleKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); } document.addEventListener("mousedown", handleClick); document.addEventListener("keydown", handleKey); return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleKey); }; }, [open]); function handleAvatarKey(e: React.KeyboardEvent) { if (e.key === "Enter" || e.key === " ") setOpen((v) => !v); if (e.key === "ArrowDown" && !open) setOpen(true); } let avatarBg = "bg-gray-200"; const showAccent = open || avatarHover || avatarFocus; if (showAccent) avatarBg = "bg-blue-200"; return ( <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center group z-30 w-full"> <div className="flex items-center justify-center"> <div ref={avatarRef} className={`w-12 h-12 rounded-full flex items-center justify-center shadow ${avatarBg} text-gray-700 text-xl font-bold transition-colors duration-200 cursor-pointer focus:outline-none`} tabIndex={0} aria-haspopup="menu" aria-expanded={open} aria-label="Open profile menu" onClick={() => setOpen((v) => !v)} onKeyDown={handleAvatarKey} onMouseEnter={() => setAvatarHover(true)} onMouseLeave={() => setAvatarHover(false)} onFocus={() => setAvatarFocus(true)} onBlur={() => setAvatarFocus(false)} > {initials || <UserIcon className="h-7 w-7 text-gray-400" />} </div> <button type="button" aria-label={open ? "Close profile menu" : "Open profile menu"} tabIndex={0} className="ml-1 flex items-center justify-center focus:outline-none" onClick={() => setOpen((v) => !v)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setOpen((v) => !v); }} > <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`} aria-hidden="true" /> </button> </div> {open && ( <div ref={menuRef} className="mt-3 w-56 bg-white rounded-xl shadow-lg py-2 flex flex-col items-stretch text-base font-medium ring-1 ring-black/5 animate-fadeIn" tabIndex={-1}> <button className={`flex items-center gap-2 px-4 py-3 rounded-t-xl transition text-left ${ isAdmin ? "hover:bg-blue-50 focus:bg-blue-100 text-blue-700 cursor-pointer" : "text-gray-400 cursor-not-allowed relative" }`} onClick={() => { if (isAdmin) { setOpen(false); onAdminClick(); } }} disabled={!isAdmin} tabIndex={isAdmin ? 0 : -1} aria-disabled={!isAdmin} title={ isAdmin ? undefined : "Only admins can invite team members." } > <UserIcon className="h-5 w-5" /> Invite Team Members {!isAdmin && ( <span className="ml-2 text-xs text-gray-400">(admin only)</span> )} </button> <button className="flex items-center gap-2 px-4 py-3 rounded-b-xl transition text-left hover:bg-red-50 focus:bg-red-100 text-red-600 cursor-pointer" onClick={() => { setOpen(false); onLogout(); }} tabIndex={0}> <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg> Log Out </button> </div> )} </div> ); }
function AdminProfileInviteModal({
  orgId,
  currentUserId,
  orgUsers,
  setOrgUsers,
  onClose,
  user,
  userRole,
  orgName,
  orgNameLoading,
  orgNameError,
}: {
  orgId: string;
  currentUserId: string;
  orgUsers: OrgUser[];
  setOrgUsers: (users: OrgUser[]) => void;
  onClose: () => void;
  user: any;
  userRole: string | null;
  orgName: string;
  orgNameLoading: boolean;
  orgNameError: string | null;
}) {
  const supabase = useSupabase();
  
  // State declarations
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAdmin, setInviteAdmin] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteNameError, setInviteNameError] = useState<string | null>(null);
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<{
    name: string;
    email: string;
    role: string;
  }[]>([]);
  const [roleLoadingId, setRoleLoadingId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<OrgUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState("");
  
  // Computed values
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = inviteEmail.length > 0 && emailRegex.test(inviteEmail);
  const isNameValid = inviteName.trim().length > 0;
  const canInvite = isEmailValid && isNameValid && !inviteLoading;
  
  // Focus management refs
  const modalRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  
  // Focus trap and keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmUser) {
          setDeleteConfirmUser(null);
          setDeleteEmailConfirm("");
          setDeleteError(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus the modal when it opens
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteConfirmUser, onClose]);

  // Focus management for delete modal
  useEffect(() => {
    if (deleteConfirmUser && deleteModalRef.current) {
      deleteModalRef.current.focus();
    }
  }, [deleteConfirmUser]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setInviteNameError(null);
    setInviteEmailError(null);
    setInviteLoading(true);


    if (!inviteName.trim()) {
      setInviteNameError("Name is required.");
      setInviteLoading(false);
      return;
    }
    if (!emailRegex.test(inviteEmail)) {
      setInviteEmailError("Enter a valid email address.");
      setInviteLoading(false);
      return;
    }
    if (
      orgUsers.some(u => u.email.toLowerCase() === inviteEmail.toLowerCase()) ||
      pendingInvites.some(i => i.email.toLowerCase() === inviteEmail.toLowerCase())
    ) {
      setInviteError("A user with this email already exists or is already invited.");
      setInviteLoading(false);
      return;
    }
    if (!orgName || orgName.trim() === "") {
      setInviteError("Organization name is missing. Please reload or contact support.");
      setInviteLoading(false);
      return;
    }
    if (userRole !== "admin") {
      setInviteError("You are not authorized to invite users. Only admins can invite.");
      setInviteLoading(false);
      return;
    }
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token || '';
      const res = await fetch("/api/admin-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          org_id: orgId,
          org_name: orgName,
          role: inviteAdmin ? "admin" : "viewer",
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setInviteError(result.error || "Failed to send invitation.");
        setInviteLoading(false);
        return;
      }
      setInviteSuccess("Invitation sent!");
      setPendingInvites([
        ...pendingInvites,
        { name: inviteName, email: inviteEmail, role: inviteAdmin ? "admin" : "viewer" },
      ]);
      setInviteName("");
      setInviteEmail("");
      setInviteAdmin(false);
      setInviteLoading(false);
    } catch (err: any) {
      setInviteError(err?.message || "Failed to send invitation.");
      setInviteLoading(false);
    }
  }


  // Drop-in replacement for handleRoleToggle using the checked RPC
async function handleRoleToggle(user: OrgUser) {
  setRoleError(null);
  setRoleSuccess(null);
  setRoleLoadingId(user.id);

  const newRole = user.role === "admin" ? "viewer" : "admin";

  // Call the 'set_user_role_checked' RPC function
  const { error } = await supabase.rpc('set_user_role_checked', {
    p_user_id: user.id,
    p_role: newRole,
  });

  if (error) {
    // The RPC will raise an exception if unauthorized, which Supabase returns as an error.
    
    setRoleError(error.message || "Failed to update role. Check permissions.");
    setRoleLoadingId(null);
    return;
  }

  // Success! Update the local UI state.
  setOrgUsers(orgUsers.map(u => (u.id === user.id ? { ...u, role: newRole } : u)));
  setRoleSuccess(`Role updated for ${user.email}`);
  setRoleLoadingId(null);
}

// Handle user deletion with confirmation
async function handleDeleteUser(user: OrgUser) {
  setDeleteError(null);
  setDeleteSuccess(null);
  setDeleteConfirmUser(user);
  setDeleteEmailConfirm("");
}

async function confirmDeleteUser() {
  if (!deleteConfirmUser) return;
  
  setDeleteLoading(true);
  setDeleteError(null);
  setDeleteSuccess(null);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';

    const response = await fetch("/api/admin-delete-user", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        userId: deleteConfirmUser.id,
        confirmEmail: deleteEmailConfirm,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setDeleteError(result.error || "Failed to delete user.");
      setDeleteLoading(false);
      return;
    }

    // Success! Remove user from local state
    setOrgUsers(orgUsers.filter(u => u.id !== deleteConfirmUser.id));
    setDeleteSuccess(`User ${deleteConfirmUser.email} has been successfully deleted.`);
    
    // Close the confirmation dialog after a brief delay
    setTimeout(() => {
      setDeleteConfirmUser(null);
      setDeleteEmailConfirm("");
      setDeleteSuccess(null);
    }, 2000);

  } catch (err: any) {
    setDeleteError(err?.message || "Failed to delete user.");
  } finally {
    setDeleteLoading(false);
  }
}



  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
      aria-describedby="admin-modal-description"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-lg w-full max-w-4xl mx-4 relative flex flex-col max-h-[90vh] sm:max-w-2xl lg:max-w-4xl"
        tabIndex={-1}
        style={{ outline: 'none' }}
      >
        {/* Modal Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex-1">
            <h2 id="admin-modal-title" className="text-2xl font-bold text-gray-900">
              Team Management
            </h2>
            <p id="admin-modal-description" className="text-sm text-gray-600 mt-1">
              Invite new team members and manage existing users
            </p>
            {orgName && (
              <div className="mt-2 text-sm text-gray-500">
                Organization: <span className="font-semibold text-gray-700">{orgName}</span>
              </div>
            )}
          </div>
          <button
            className="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-2"
            onClick={onClose}
            aria-label="Close team management modal"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {userRole !== "admin" && (
            <div className="text-center text-red-600 font-semibold p-4 bg-red-50 rounded-lg">
              <svg className="mx-auto h-8 w-8 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Insufficient privileges. Only administrators can manage team members.
            </div>
          )}
          {userRole === "admin" && orgName && !orgNameLoading && !orgNameError && (
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite New Team Member</h3>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-600" aria-label="required">*</span>
                    </label>
                    <input
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inviteNameError ? 'border-red-500' : 'border-gray-300'}`}
                      value={inviteName}
                      onChange={e => {
                        setInviteName(e.target.value);
                        if (inviteNameError && e.target.value.trim()) setInviteNameError(null);
                      }}
                      placeholder="Enter full name"
                      type="text"
                      autoComplete="name"
                      required
                      aria-describedby={inviteNameError ? "name-error" : undefined}
                      aria-invalid={!!inviteNameError}
                    />
                    {inviteNameError && (
                      <div id="name-error" className="mt-1 text-red-600 text-sm" role="alert">
                        {inviteNameError}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-600" aria-label="required">*</span>
                    </label>
                    <input
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inviteEmailError || (inviteEmail && !isEmailValid) ? 'border-red-500' : 'border-gray-300'}`}
                      value={inviteEmail}
                      onChange={e => {
                        setInviteEmail(e.target.value);
                        if (inviteEmailError && emailRegex.test(e.target.value)) setInviteEmailError(null);
                      }}
                      placeholder="Enter email address"
                      type="email"
                      required
                      autoComplete="email"
                      aria-describedby={inviteEmailError || (inviteEmail && !isEmailValid) ? "email-error" : undefined}
                      aria-invalid={!!(inviteEmailError || (inviteEmail && !isEmailValid))}
                    />
                    {(inviteEmailError || (inviteEmail && !isEmailValid)) && (
                      <div id="email-error" className="mt-1 text-red-600 text-sm" role="alert">
                        {inviteEmailError || "Enter a valid email address."}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={inviteAdmin}
                    onChange={setInviteAdmin}
                    className={`${inviteAdmin ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                    aria-describedby="admin-role-description"
                  >
                    <span className="sr-only">Grant administrator privileges</span>
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${inviteAdmin ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </Switch>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Administrator Role</label>
                    <p id="admin-role-description" className="text-xs text-gray-500">
                      Grants full team management privileges
                    </p>
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!canInvite}
                  aria-describedby={inviteError ? "invite-error" : inviteSuccess ? "invite-success" : undefined}
                >
                  {inviteLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending Invitation...
                    </span>
                  ) : (
                    "Send Invitation"
                  )}
                </button>
                
                {inviteError && (
                  <div id="invite-error" className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
                    <div className="flex">
                      <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-red-700">{inviteError}</span>
                    </div>
                  </div>
                )}
                
                {inviteSuccess && (
                  <div id="invite-success" className="p-3 bg-green-50 border border-green-200 rounded-md" role="alert">
                    <div className="flex">
                      <svg className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-green-700">{inviteSuccess}</span>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}
          {orgNameLoading && (
            <div className="text-center p-6">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading organization information...
              </div>
            </div>
          )}
          
          {orgNameError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm text-red-700">{orgNameError}</span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Current Team Members</h3>
              <p className="text-sm text-gray-600 mt-1">Manage roles and permissions for team members</p>
            </div>
            
            <div className="overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                {orgUsers.length <= 1 && pendingInvites.length === 0 ? (
                  <div className="p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500">No other team members yet</p>
                    <p className="text-sm text-gray-400 mt-1">Invite team members to get started</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200" role="table" aria-label="Team members">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Admin
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingInvites.map((invite, idx) => (
                        <tr key={`pending-${idx}`} className="bg-yellow-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-yellow-200 flex items-center justify-center">
                                  <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{invite.name}</div>
                                <div className="flex items-center">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Invitation Pending
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {invite.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                              {invite.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-400">
                            —
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-400">
                            —
                          </td>
                        </tr>
                      ))}
                      {orgUsers.filter(u => u.id !== currentUserId).map((user, index) => (
                        <tr key={user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name || 'Team Member'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Active Member
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Switch
                              checked={user.role === "admin"}
                              onChange={() => handleRoleToggle(user)}
                              className={`${user.role === "admin" ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                              disabled={roleLoadingId === user.id}
                              aria-label={`Toggle administrator privileges for team member`}
                              title={`${user.role === "admin" ? 'Remove' : 'Grant'} administrator privileges`}
                            >
                              <span className="sr-only">
                                {user.role === "admin" ? 'Remove administrator privileges' : 'Grant administrator privileges'}
                              </span>
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.role === "admin" ? 'translate-x-6' : 'translate-x-1'}`}
                              />
                            </Switch>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="inline-flex items-center p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                              aria-label="Remove team member"
                              title="Remove team member from organization"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            
            {/* Status Messages */}
            {roleError && (
              <div className="px-6 py-3 border-t border-gray-200 bg-red-50" role="alert">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm text-red-700">{roleError}</span>
                </div>
              </div>
            )}
            
            {roleSuccess && (
              <div className="px-6 py-3 border-t border-gray-200 bg-green-50" role="alert">
                <div className="flex">
                  <svg className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-700">{roleSuccess}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer - Sticky */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex justify-end">
            <button
              type="button"
              className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
      
      {/* Delete User Confirmation Dialog */}
      {deleteConfirmUser && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          aria-describedby="delete-modal-description"
        >
          <div 
            ref={deleteModalRef}
            className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 flex flex-col max-h-[90vh] sm:max-w-lg"
            tabIndex={-1}
            style={{ outline: 'none' }}
          >
            {/* Delete Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-3">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 id="delete-modal-title" className="text-lg font-semibold text-gray-900">
                  Remove Team Member
                </h3>
              </div>
            </div>

            {/* Delete Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="text-center mb-6">
                <p id="delete-modal-description" className="text-sm text-gray-600 mb-4">
                  You are about to permanently remove a team member from your organization. 
                  This action cannot be undone and will immediately revoke their access.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <svg className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div className="text-left">
                      <p className="text-sm font-medium text-yellow-800 mb-1">Permanent Action</p>
                      <p className="text-sm text-yellow-700">
                        The team member will lose access to all organization resources immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm by typing the team member's email address
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    Required email: <code className="bg-gray-100 px-1 py-0.5 rounded">{deleteConfirmUser.email}</code>
                  </div>
                  <input
                    type="email"
                    value={deleteEmailConfirm}
                    onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Type email address to confirm"
                    autoComplete="off"
                    aria-describedby={deleteError ? "delete-error" : undefined}
                    aria-invalid={!!deleteError}
                  />
                </div>

                {deleteError && (
                  <div id="delete-error" className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
                    <div className="flex">
                      <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-red-700">{deleteError}</span>
                    </div>
                  </div>
                )}

                {deleteSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md" role="alert">
                    <div className="flex">
                      <svg className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-green-700">{deleteSuccess}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Delete Modal Footer - Sticky */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmUser(null);
                    setDeleteEmailConfirm("");
                    setDeleteError(null);
                  }}
                  className="flex-1 bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteUser}
                  disabled={
                    deleteLoading || 
                    deleteEmailConfirm.toLowerCase() !== deleteConfirmUser.email.toLowerCase() ||
                    deleteSuccess !== null
                  }
                  className="flex-1 bg-red-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-describedby={deleteError ? "delete-error" : undefined}
                >
                  {deleteLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Removing...
                    </span>
                  ) : (
                    "Remove Team Member"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


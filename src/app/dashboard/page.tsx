"use client";

import { useAuth } from "@/lib/supabase/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  ChartBarIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";
import { UserIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { Switch } from "@headlessui/react";
import { useSupabase } from "@/components/SupabaseProvider"; // Correct context hook

// --- TypeScript Interfaces ---
interface Forecast {
  part_number: string;
  supplier_name: string;
  part_category: string;
  target_lead_time_days: number;
  predicted_lead_time_days: number;
  predicted_variance_days: number;
  risk_level: string;
  recommendation: string;
  cost_impact_pred_usd: number;
}
interface OrgUser {
  id: string;
  name?: string;
  email: string;
  role: string;
}

// --- Main Dashboard Component ---
export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const supabase = useSupabase(); // Get client from context

  // --- State Declarations ---
  // Filter state
  const [selectedSupplier, setSelectedSupplier] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  // Data state
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userNameOrEmail, setUserNameOrEmail] = useState<string | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);

  // ADDED BACK: The missing state declarations
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [orgNameLoading, setOrgNameLoading] = useState(false);
  const [orgNameError, setOrgNameError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  // Fetch org_id and forecasts
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

        let query = supabase
          .from("lead_time_forecast_ai")
          .select(`part_number, supplier_name, part_category, target_lead_time_days, predicted_lead_time_days, predicted_variance_days, risk_level, recommendation, cost_impact_pred_usd`)
          .eq("org_id", userData.org_id);
        if (selectedSupplier !== "All") {
          query = query.eq("supplier_name", selectedSupplier);
        }
        if (selectedCategory !== "All") {
          query = query.eq("part_category", selectedCategory);
        }
        
        const { data: forecastData, error: forecastError } = await query;
        if (forecastError) {
          setError("Failed to fetch forecasts.");
        } else {
          setForecasts(forecastData || []);
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
  }, [user, selectedSupplier, selectedCategory, supabase]);

  // Fetch org users for admin modal
  useEffect(() => {
    if (userRole === "admin" && orgId) {
      setUsersLoading(true);
      setUsersError(null);
      supabase
        .from("users")
        .select("id, name, email, role")
        .eq("org_id", orgId)
        .then(({ data, error }) => {
          if (error) setUsersError("Failed to load users");
          setOrgUsers(data || []);
          setUsersLoading(false);
        });
    }
  }, [userRole, orgId, showAdminModal, supabase]);

  // Fetch org_name for display and invite metadata
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

  // The rest of the component (memoized values, conditional rendering, JSX) remains the same.
  // I've included it all below to ensure you have the complete, correct file.
  const supplierOptions = useMemo(() => { const set = new Set(forecasts.map(f => f.supplier_name)); return ["All", ...Array.from(set)]; }, [forecasts]);
  const categoryOptions = useMemo(() => { const set = new Set(forecasts.map(f => f.part_category)); return ["All", ...Array.from(set)]; }, [forecasts]);
  const kpiActionRequired = forecasts.filter(f => f.recommendation === "Action Required").length;
  const kpiOnTrack = forecasts.filter(f => f.recommendation === "On Track").length;
  const kpiMonitor = forecasts.filter(f => f.recommendation === "Monitor").length;
  const kpiHighRiskCost = forecasts.filter(f => f.risk_level === "High").reduce((sum, f) => sum + (f.cost_impact_pred_usd || 0), 0);
  if (authLoading || loading) { return <div className="text-center py-10">Loading...</div>; }
  if (orgId === null) { return ( <div className="flex min-h-screen items-center justify-center bg-gray-50"> <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center"> <h1 className="text-2xl font-bold mb-4 text-gray-700">Waiting for Admin Approval</h1> <p className="text-lg text-gray-500"> Your account has been created but is not yet linked to an organization.<br /> Please wait for your organization admin to assign you or contact support if you believe this is an error. </p> </div> </div> ); }
  if (error) { return ( <div className="flex min-h-screen items-center justify-center bg-gray-50"> <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center"> <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1> <p className="text-lg text-red-500">{error}</p> </div> </div> ); }
  return ( <div className="min-h-screen flex bg-gray-50"> <aside className="w-20 sm:w-56 bg-white shadow-lg flex flex-col items-center py-8 relative"> <nav className="flex flex-col gap-8 w-full items-center"> <SidebarItem icon={<ChartPieIcon className="h-7 w-7" />} label="Overview" active /> <SidebarItem icon={<ChartBarIcon className="h-7 w-7" />} label="Analytics" /> <SidebarItem icon={<PresentationChartLineIcon className="h-7 w-7" />} label="Forecasting" /> </nav> <div className="flex-1" /> <ProfileDropdownAvatar nameOrEmail={userNameOrEmail} role={userRole} onAdminClick={() => setShowAdminModal(true)} onLogout={async () => { await signOut(); router.replace("/login"); }} /> {showAdminModal && userRole === "admin" && ( <AdminProfileInviteModal orgId={orgId || ""} currentUserId={user?.id || ""} orgUsers={orgUsers} setOrgUsers={setOrgUsers} onClose={() => setShowAdminModal(false)} user={user} userRole={userRole} orgName={orgName} orgNameLoading={orgNameLoading} orgNameError={orgNameError} /> )} </aside> <main className="flex-1 p-6 sm:p-10"> <h1 className="text-2xl sm:text-3xl font-bold mb-4">Lead Time Performance Overview</h1> <section className="flex flex-col sm:flex-row gap-4 mb-8 items-center"> <div className="flex gap-4 w-full sm:w-auto"> <div> <label className="block text-xs font-semibold mb-1">Supplier</label> <select className="border rounded-md px-3 py-2 w-36 bg-white" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}> {supplierOptions.map(s => ( <option key={s} value={s}>{s}</option> ))} </select> </div> <div> <label className="block text-xs font-semibold mb-1">Part Category</label> <select className="border rounded-md px-3 py-2 w-36 bg-white" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}> {categoryOptions.map(c => ( <option key={c} value={c}>{c}</option>))} </select> </div> </div> <div className="flex gap-2 items-end w-full sm:w-auto"> <div> <label className="block text-xs font-semibold mb-1">Start Date</label> <input type="date" className="border rounded-md px-3 py-2 w-36 bg-white" value={dateRange.start || ""} onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))} /> </div> <div> <label className="block text-xs font-semibold mb-1">End Date</label> <input type="date" className="border rounded-md px-3 py-2 w-36 bg-white" value={dateRange.end || ""} onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))} /> </div> </div> </section> <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"> <KpiCard color="bg-yellow-200" value={kpiActionRequired.toString()} title="Action Required" subtitle="Recommendations" /> <KpiCard color="bg-green-200" value={kpiOnTrack.toString()} title="On Track" subtitle="Recommendations" /> <KpiCard color="bg-pink-200" value={kpiMonitor.toString()} title="Monitor" subtitle="Recommendations" /> <KpiCard color="bg-red-300" value={`$${kpiHighRiskCost.toLocaleString()}`} title="High Risk Cost" subtitle="Total Cost Impact" /> </section> <section className="bg-white rounded-xl shadow p-6"> <h2 className="text-lg font-semibold mb-4">Monthly Lead Time Performance</h2> <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-lg"> <svg width="90%" height="80%" viewBox="0 0 300 120"> <rect x="0" y="0" width="300" height="120" fill="#f3f4f6" /> <polyline fill="none" stroke="#6366f1" strokeWidth="3" points="0,100 40,80 80,90 120,60 160,70 200,40 240,60 280,30" /> <circle cx="0" cy="100" r="4" fill="#6366f1" /> <circle cx="40" cy="80" r="4" fill="#6366f1" /> <circle cx="80" cy="90" r="4" fill="#6366f1" /> <circle cx="120" cy="60" r="4" fill="#6366f1" /> <circle cx="160" cy="70" r="4" fill="#6366f1" /> <circle cx="200" cy="40" r="4" fill="#6366f1" /> <circle cx="240" cy="60" r="4" fill="#6366f1" /> <circle cx="280" cy="30" r="4" fill="#6366f1" /> </svg> </div> </section> </main> </div> );
}


// --- All Helper Components ---
function SidebarItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) { return ( <div className={`flex flex-col items-center gap-2 py-2 px-2 w-full cursor-pointer transition hover:bg-gray-100 ${ active ? "bg-gray-100 font-bold text-blue-600" : "text-gray-700" }`} > {icon} <span className="text-xs sm:text-base mt-1">{label}</span> </div> ); }
function KpiCard({ color, value, title, subtitle }: { color: string; value: string; title: string; subtitle: string }) { return ( <div className={`rounded-xl shadow p-6 flex flex-col items-start ${color}`}> <span className="text-3xl font-bold mb-2">{value}</span> <span className="font-semibold mb-1">{title}</span> <span className="text-xs text-gray-700">{subtitle}</span> </div> ); }
function ProfileDropdownAvatar({ nameOrEmail, role, onAdminClick, onLogout }: { nameOrEmail: string | null; role: string | null; onAdminClick: () => void; onLogout: () => void; }) { const isAdmin = role === "admin"; const [open, setOpen] = useState(false); const avatarRef = useRef<HTMLDivElement>(null); const menuRef = useRef<HTMLDivElement>(null); const [avatarHover, setAvatarHover] = useState(false); const [avatarFocus, setAvatarFocus] = useState(false); let initials = ""; if (nameOrEmail) { const parts = nameOrEmail.split(/[@\s.]+/).filter(Boolean); if (parts.length >= 2) { initials = parts[0][0].toUpperCase() + parts[1][0].toUpperCase(); } else if (parts.length === 1) { initials = parts[0][0].toUpperCase(); } } useEffect(() => { if (!open) return; function handleClick(e: MouseEvent) { if ( menuRef.current && !menuRef.current.contains(e.target as Node) && avatarRef.current && !avatarRef.current.contains(e.target as Node) ) { setOpen(false); } } function handleKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); } document.addEventListener("mousedown", handleClick); document.addEventListener("keydown", handleKey); return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleKey); }; }, [open]); function handleAvatarKey(e: React.KeyboardEvent) { if (e.key === "Enter" || e.key === " ") setOpen((v) => !v); if (e.key === "ArrowDown" && !open) setOpen(true); } let avatarBg = "bg-gray-200"; const showAccent = open || avatarHover || avatarFocus; if (showAccent) avatarBg = "bg-blue-200"; return ( <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center group z-30 w-full"> <div className="flex items-center justify-center"> <div ref={avatarRef} className={`w-12 h-12 rounded-full flex items-center justify-center shadow ${avatarBg} text-gray-700 text-xl font-bold transition-colors duration-200 cursor-pointer focus:outline-none`} tabIndex={0} aria-haspopup="menu" aria-expanded={open} aria-label="Open profile menu" onClick={() => setOpen((v) => !v)} onKeyDown={handleAvatarKey} onMouseEnter={() => setAvatarHover(true)} onMouseLeave={() => setAvatarHover(false)} onFocus={() => setAvatarFocus(true)} onBlur={() => setAvatarFocus(false)} > {initials || <UserIcon className="h-7 w-7 text-gray-400" />} </div> <button type="button" aria-label={open ? "Close profile menu" : "Open profile menu"} tabIndex={0} className="ml-1 flex items-center justify-center focus:outline-none" onClick={() => setOpen((v) => !v)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setOpen((v) => !v); }} > <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`} aria-hidden="true" /> </button> </div> {open && ( <div ref={menuRef} className="mt-3 w-56 bg-white rounded-xl shadow-lg py-2 flex flex-col items-stretch text-base font-medium ring-1 ring-black/5 animate-fadeIn" tabIndex={-1}> <button className={`flex items-center gap-2 px-4 py-3 rounded-t-xl transition text-left ${ isAdmin ? "hover:bg-blue-50 focus:bg-blue-100 text-blue-700 cursor-pointer" : "text-gray-400 cursor-not-allowed relative" }`} onClick={() => { if (isAdmin) { setOpen(false); onAdminClick(); } }} disabled={!isAdmin} tabIndex={isAdmin ? 0 : -1} aria-disabled={!isAdmin} title={ isAdmin ? undefined : "Only admins can invite team members." } > <UserIcon className="h-5 w-5" /> Invite Team Members {!isAdmin && ( <span className="ml-2 text-xs text-gray-400">(admin only)</span> )} </button> <button className="flex items-center gap-2 px-4 py-3 rounded-b-xl transition text-left hover:bg-red-50 focus:bg-red-100 text-red-600 cursor-pointer" onClick={() => { setOpen(false); onLogout(); }} tabIndex={0}> <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg> Log Out </button> </div> )} </div> ); }
function AdminProfileInviteModal({ orgId, currentUserId, orgUsers, setOrgUsers, onClose, user, userRole, orgName, orgNameLoading, orgNameError }: { orgId: string; currentUserId: string; orgUsers: OrgUser[]; setOrgUsers: (users: OrgUser[]) => void; onClose: () => void; user: any; userRole: string | null; orgName: string; orgNameLoading: boolean; orgNameError: string | null; }) { const supabase = useSupabase(); const [inviteName, setInviteName] = useState(""); const [inviteEmail, setInviteEmail] = useState(""); const [inviteAdmin, setInviteAdmin] = useState(false); const [inviteLoading, setInviteLoading] = useState(false); const [inviteError, setInviteError] = useState<string | null>(null); const [inviteSuccess, setInviteSuccess] = useState<string | null>(null); const [inviteNameError, setInviteNameError] = useState<string | null>(null); const [inviteEmailError, setInviteEmailError] = useState<string | null>(null); const [pendingInvites, setPendingInvites] = useState<{ name: string; email: string; role: string }[]>([]); const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; const isEmailValid = inviteEmail.length > 0 && emailRegex.test(inviteEmail); const isNameValid = inviteName.trim().length > 0; const canInvite = isEmailValid && isNameValid && !inviteLoading; const [roleLoadingId, setRoleLoadingId] = useState<string | null>(null); const [roleError, setRoleError] = useState<string | null>(null); const [roleSuccess, setRoleSuccess] = useState<string | null>(null); async function handleInvite(e: React.FormEvent) { e.preventDefault(); setInviteError(null); setInviteSuccess(null); setInviteNameError(null); setInviteEmailError(null); setInviteLoading(true); if (!inviteName.trim()) { setInviteNameError("Name is required."); setInviteLoading(false); return; } if (!emailRegex.test(inviteEmail)) { setInviteEmailError("Enter a valid email address."); setInviteLoading(false); return; } if ( orgUsers.some(u => u.email.toLowerCase() === inviteEmail.toLowerCase()) || pendingInvites.some(i => i.email.toLowerCase() === inviteEmail.toLowerCase()) ) { setInviteError("A user with this email already exists or is already invited."); setInviteLoading(false); return; } if (!orgName || orgName.trim() === "") { setInviteError("Organization name is missing. Please reload or contact support."); setInviteLoading(false); return; } if (userRole !== "admin") { setInviteError("You are not authorized to invite users. Only admins can invite."); setInviteLoading(false); return; } try { const { data: { session } } = await supabase.auth.getSession(); const accessToken = session?.access_token || ''; const res = await fetch("/api/admin-invite", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` }, body: JSON.stringify({ name: inviteName, email: inviteEmail, org_id: orgId, org_name: orgName, role: inviteAdmin ? "admin" : "viewer" }) }); const result = await res.json(); if (!res.ok) { setInviteError(result.error || "Failed to send invitation."); setInviteLoading(false); return; } setInviteSuccess("Invitation sent!"); setPendingInvites([ ...pendingInvites, { name: inviteName, email: inviteEmail, role: inviteAdmin ? "admin" : "viewer" }, ]); setInviteName(""); setInviteEmail(""); setInviteAdmin(false); setInviteLoading(false); } catch (err: any) { setInviteError(err?.message || "Failed to send invitation."); setInviteLoading(false); } } async function handleRoleToggle(user: OrgUser) { setRoleError(null); setRoleSuccess(null); setRoleLoadingId(user.id); const newRole = user.role === "admin" ? "viewer" : "admin"; const { error } = await supabase.from("users").update({ role: newRole }).eq("id", user.id); if (error) { setRoleError(error.message || "Failed to update role."); setRoleLoadingId(null); return; } setOrgUsers( orgUsers.map(u => u.id === user.id ? { ...u, role: newRole } : u) ); setRoleSuccess(`Role updated for ${user.email}`); setRoleLoadingId(null); } return ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"> <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg mx-2 relative"> <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 focus:outline-none" onClick={onClose} aria-label="Close modal"> <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg> </button> <h2 className="text-2xl font-bold mb-6 text-center">Admin Profile/Invite</h2> {orgName && ( <div className="mb-4 text-center text-sm text-gray-500">Organization: <span className="font-semibold text-gray-700">{orgName}</span></div> )} {userRole !== "admin" && ( <div className="mb-6 text-center text-red-600 font-semibold">You are not authorized to invite users. Only admins can invite.</div> )} {userRole === "admin" && orgName && !orgNameLoading && !orgNameError && ( <form onSubmit={handleInvite} className="mb-6"> <div className="flex flex-col sm:flex-row gap-4 mb-4"> <div className="flex-1"> <label className="block text-xs font-semibold mb-1"> Name <span className="text-red-600">*</span> </label> <input className={`border rounded-md px-3 py-2 w-full ${inviteNameError ? 'border-red-500' : ''}`} value={inviteName} onChange={e => { setInviteName(e.target.value); if (inviteNameError && e.target.value.trim()) setInviteNameError(null); }} placeholder="Name" type="text" autoComplete="off" required /> {inviteNameError && <div className="mt-1 text-red-600 text-xs">{inviteNameError}</div>} </div> <div className="flex-1"> <label className="block text-xs font-semibold mb-1">Email <span className="text-red-500">*</span></label> <input className={`border rounded-md px-3 py-2 w-full ${inviteEmailError || (inviteEmail && !isEmailValid) ? 'border-red-500' : ''}`} value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); if (inviteEmailError && emailRegex.test(e.target.value)) setInviteEmailError(null); }} placeholder="Email" type="email" required autoComplete="off" /> {(inviteEmailError || (inviteEmail && !isEmailValid)) && ( <div className="mt-1 text-red-600 text-xs">{inviteEmailError || "Enter a valid email address."}</div> )} </div> </div> <div className="flex items-center gap-2 mb-4"> <Switch checked={inviteAdmin} onChange={setInviteAdmin} className={`${inviteAdmin ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}> <span className="sr-only">Make Admin</span> <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${inviteAdmin ? 'translate-x-6' : 'translate-x-1'}`} /> </Switch> <span className="text-sm">Make Admin</span> </div> <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition disabled:opacity-50" disabled={!canInvite}> {inviteLoading ? "Inviting..." : "Invite User"} </button> {inviteError && <div className="mt-2 text-red-600 text-center text-sm">{inviteError}</div>} {inviteSuccess && <div className="mt-2 text-green-600 text-center text-sm">{inviteSuccess}</div>} </form> )} {orgNameLoading && ( <div className="mb-6 text-center text-gray-500">Loading organization name...</div> )} {orgNameError && ( <div className="mb-6 text-center text-red-600">{orgNameError}</div> )} <div className="mb-6"> <h3 className="font-semibold mb-2">Team Members</h3> <div className="max-h-48 overflow-y-auto border rounded-md"> {orgUsers.length <= 1 && pendingInvites.length === 0 ? ( <div className="p-4 text-gray-500 text-center">No other team members yet.</div> ) : ( <table className="min-w-full text-sm"> <thead> <tr className="bg-gray-100"> <th className="px-3 py-2 text-left">Name</th> <th className="px-3 py-2 text-left">Email</th> <th className="px-3 py-2 text-left">Role</th> <th className="px-3 py-2"></th> </tr> </thead> <tbody> {pendingInvites.map((invite, idx) => ( <tr key={invite.email} className="bg-yellow-50 text-yellow-700 italic"> <td className="px-3 py-2 flex items-center gap-2"> {invite.name} <span className="text-xs bg-yellow-200 text-yellow-800 rounded px-2 py-0.5 ml-2">Pending</span> </td> <td className="px-3 py-2">{invite.email}</td> <td className="px-3 py-2">{invite.role}</td> <td className="px-3 py-2"></td> </tr> ))} {orgUsers.filter(u => u.id !== currentUserId).map(user => ( <tr key={user.id} className="even:bg-gray-50"> <td className="px-3 py-2">{user.name || <span className="text-gray-400">—</span>}</td> <td className="px-3 py-2">{user.email}</td> <td className="px-3 py-2">{user.role}</td> <td className="px-3 py-2"> <Switch checked={user.role === "admin"} onChange={() => handleRoleToggle(user)} className={`${user.role === "admin" ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none`} disabled={roleLoadingId === user.id}> <span className="sr-only">Toggle admin</span> <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.role === "admin" ? 'translate-x-5' : 'translate-x-1'}`} /> </Switch> </td> </tr> ))} </tbody> </table> )} </div> {roleError && <div className="mt-2 text-red-600 text-center text-sm">{roleError}</div>} {roleSuccess && <div className="mt-2 text-green-600 text-center text-sm">{roleSuccess}</div>} </div> </div> </div> ); }


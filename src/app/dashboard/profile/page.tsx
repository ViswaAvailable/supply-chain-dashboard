'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/supabase/useAuth';
import { useSupabase } from '@/components/SupabaseProvider';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Building2, 
  Shield, 
  UserPlus, 
  Trash2, 
  RefreshCw,
  Users,
  Crown,
  Eye
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  org_id: string;
  org_name: string | null;
  created_at: string;
}

interface OrgUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const supabase = useSupabase();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<OrgUser | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfile();
  }, [user, supabase]);

  // Fetch organization users (for admins)
  useEffect(() => {
    async function fetchOrgUsers() {
      if (!profile || profile.role !== 'admin') return;
      
      setUsersLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, name, role, created_at')
          .eq('org_id', profile.org_id)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        setOrgUsers(data || []);
      } catch (err) {
        console.error('Error fetching org users:', err);
        toast.error('Failed to load team members');
      } finally {
        setUsersLoading(false);
      }
    }
    
    fetchOrgUsers();
  }, [profile, supabase]);

  // Handle invite user
  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteName) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/admin-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          role: inviteRole,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation');
      }
      
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('viewer');
      
      // Refresh user list
      if (profile) {
        const { data } = await supabase
          .from('users')
          .select('id, email, name, role, created_at')
          .eq('org_id', profile.org_id)
          .order('created_at', { ascending: true });
        
        if (data) setOrgUsers(data);
      }
    } catch (err) {
      console.error('Error inviting user:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!userToDelete || deleteConfirmEmail.toLowerCase() !== userToDelete.email.toLowerCase()) {
      toast.error('Email confirmation does not match');
      return;
    }
    
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/admin-delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: userToDelete.id,
          confirmEmail: deleteConfirmEmail,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove user');
      }
      
      toast.success('User removed successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeleteConfirmEmail('');
      
      // Remove user from list
      setOrgUsers(prev => prev.filter(u => u.id !== userToDelete.id));
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to remove user');
    } finally {
      setDeleting(false);
    }
  };

  // Refresh users list
  const refreshUsers = async () => {
    if (!profile) return;
    
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setOrgUsers(data || []);
      toast.success('User list refreshed');
    } catch (err) {
      console.error('Error refreshing users:', err);
      toast.error('Failed to refresh user list');
    } finally {
      setUsersLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load profile</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and {isAdmin ? 'team members' : 'view your settings'}
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Profile
          </CardTitle>
          <CardDescription>
            Your account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Name
              </Label>
              <p className="font-medium">{profile.name || 'Not set'}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <p className="font-medium">{profile.email}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organization
              </Label>
              <p className="font-medium">{profile.org_name || 'Not set'}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role
              </Label>
              <Badge 
                variant={isAdmin ? 'default' : 'secondary'}
                className={isAdmin ? 'bg-amber-500 hover:bg-amber-600' : ''}
              >
                {isAdmin ? (
                  <><Crown className="h-3 w-3 mr-1" /> Admin</>
                ) : (
                  <><Eye className="h-3 w-3 mr-1" /> Viewer</>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Management (Admin Only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
                <CardDescription>
                  Manage who has access to your organization
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refreshUsers}
                  disabled={usersLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Send an invitation email to add a new user to your organization.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="invite-name">Name</Label>
                        <Input
                          id="invite-name"
                          placeholder="John Doe"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-email">Email</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="john@company.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-role">Role</Label>
                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'viewer')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                Viewer - Can view forecasts and reports
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4" />
                                Admin - Full access including user management
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleInviteUser} disabled={inviting}>
                        {inviting ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Send Invitation
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : orgUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No team members found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgUsers.map((orgUser) => (
                    <TableRow key={orgUser.id}>
                      <TableCell className="font-medium">
                        {orgUser.name || 'Not set'}
                        {orgUser.id === profile.id && (
                          <Badge variant="outline" className="ml-2">You</Badge>
                        )}
                      </TableCell>
                      <TableCell>{orgUser.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={orgUser.role === 'admin' ? 'default' : 'secondary'}
                          className={orgUser.role === 'admin' ? 'bg-amber-500' : ''}
                        >
                          {orgUser.role === 'admin' ? (
                            <><Crown className="h-3 w-3 mr-1" /> Admin</>
                          ) : (
                            <><Eye className="h-3 w-3 mr-1" /> Viewer</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(orgUser.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {orgUser.id !== profile.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setUserToDelete(orgUser);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Remove User</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to remove <strong>{userToDelete?.name || userToDelete?.email}</strong> from your organization?
                </p>
                <p className="text-destructive font-medium">
                  This action cannot be undone. The user will lose all access immediately.
                </p>
                <div className="pt-2">
                  <Label htmlFor="confirm-email" className="text-foreground">
                    Type or paste the user&apos;s email to confirm:
                  </Label>
                  <div className="mt-2 p-2 bg-muted rounded-md flex items-center justify-between gap-2">
                    <code className="text-sm font-mono text-foreground select-all">
                      {userToDelete?.email}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        if (userToDelete?.email) {
                          navigator.clipboard.writeText(userToDelete.email);
                          toast.success('Email copied to clipboard');
                        }
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <Input
                    id="confirm-email"
                    placeholder="Paste email here..."
                    value={deleteConfirmEmail}
                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setUserToDelete(null);
              setDeleteConfirmEmail('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting || deleteConfirmEmail.toLowerCase() !== userToDelete?.email.toLowerCase()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


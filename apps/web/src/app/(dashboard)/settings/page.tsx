'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  User,
  Building2,
  Users,
  Key,
  Bell,
  Shield,
  Trash2,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Check,
  Loader2,
  ExternalLink,
  X,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettingsTab = 'profile' | 'organization' | 'members' | 'api-keys' | 'notifications';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  avatarInitial: string;
  joinedAt: string;
}

interface ApiKey {
  id: string;
  name: string;
  provider: string;
  createdAt: string;
  lastUsedAt?: string;
  maskedKey: string;
}

interface NotificationPrefs {
  gateApprovals: boolean;
  executionFailures: boolean;
  executionCompletions: boolean;
  teamActivity: boolean;
}

// ---------------------------------------------------------------------------
// Sample / fallback data
// ---------------------------------------------------------------------------

const SAMPLE_MEMBERS: Member[] = [
  { id: '1', name: 'You', email: 'admin@example.com', role: 'owner', avatarInitial: 'Y', joinedAt: '2026-03-16' },
  { id: '2', name: 'Alice Chen', email: 'alice@example.com', role: 'admin', avatarInitial: 'A', joinedAt: '2026-03-16' },
  { id: '3', name: 'Bob Smith', email: 'bob@example.com', role: 'member', avatarInitial: 'B', joinedAt: '2026-03-16' },
];

const DEFAULT_API_KEYS: ApiKey[] = [
  { id: '1', name: 'Production Anthropic', provider: 'Anthropic', createdAt: '2026-03-16', lastUsedAt: '2026-03-16', maskedKey: 'sk-ant-***...***7ygA' },
  { id: '2', name: 'OpenAI GPT-5', provider: 'OpenAI', createdAt: '2026-03-16', maskedKey: 'sk-proj-***...***xQ3w' },
];

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  gateApprovals: true,
  executionFailures: true,
  executionCompletions: false,
  teamActivity: false,
};

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const roleColors: Record<string, string> = {
  owner: 'bg-amber-500/10 text-amber-500',
  admin: 'bg-blue-500/10 text-blue-500',
  member: 'bg-green-500/10 text-green-500',
  viewer: 'bg-muted text-muted-foreground',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapApiMember(m: any): Member {
  return {
    id: m.id ?? m.userId ?? '',
    name: m.name ?? m.user?.name ?? m.email ?? 'Unknown',
    email: m.email ?? m.user?.email ?? '',
    role: m.role ?? 'member',
    avatarInitial: (m.name ?? m.user?.name ?? m.email ?? 'U').charAt(0).toUpperCase(),
    joinedAt: m.joinedAt ?? m.createdAt ?? '',
  };
}

function loadApiKeys(): ApiKey[] {
  if (typeof window === 'undefined') return DEFAULT_API_KEYS;
  const saved = localStorage.getItem('toa-api-keys');
  return saved ? JSON.parse(saved) : DEFAULT_API_KEYS;
}

function saveApiKeys(keys: ApiKey[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('toa-api-keys', JSON.stringify(keys));
  }
}

function loadNotificationPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFS;
  const saved = localStorage.getItem('toa-notification-prefs');
  return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATION_PREFS;
}

function saveNotificationPrefs(prefs: NotificationPrefs) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('toa-notification-prefs', JSON.stringify(prefs));
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saved, setSaved] = useState(false);

  // ==================== Profile state ====================
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/get-session', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setProfileName(data.user.name ?? '');
          setProfileEmail(data.user.email ?? '');
        } else {
          // Fallback from localStorage
          const savedName = typeof window !== 'undefined' ? localStorage.getItem('toa-profile-name') : null;
          const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('toa-profile-email') : null;
          setProfileName(savedName ?? 'Admin User');
          setProfileEmail(savedEmail ?? 'admin@example.com');
        }
      })
      .catch(() => {
        const savedName = typeof window !== 'undefined' ? localStorage.getItem('toa-profile-name') : null;
        const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('toa-profile-email') : null;
        setProfileName(savedName ?? 'Admin User');
        setProfileEmail(savedEmail ?? 'admin@example.com');
      })
      .finally(() => setProfileLoading(false));
  }, []);

  function handleSaveProfile() {
    // No user.update tRPC route yet -- persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('toa-profile-name', profileName);
      localStorage.setItem('toa-profile-email', profileEmail);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleDeleteAccount() {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      alert('Account deletion requested. This feature is not yet implemented on the backend.');
    }
  }

  // ==================== Organization state ====================
  const utils = trpc.useUtils();
  const { data: orgData, isLoading: orgLoading, error: orgError } = trpc.organization.get.useQuery(undefined, {
    retry: false,
  });

  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orgInitialized, setOrgInitialized] = useState(false);

  useEffect(() => {
    if (orgData && !orgInitialized) {
      setOrgName((orgData as any).name ?? '');
      setOrgSlug((orgData as any).slug ?? '');
      setOrgInitialized(true);
    }
  }, [orgData, orgInitialized]);

  const orgUpdateMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      utils.organization.get.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: any) => {
      alert(`Failed to update organization: ${err.message}`);
    },
  });

  function handleSaveOrg() {
    orgUpdateMutation.mutate({
      name: orgName || undefined,
      slug: orgSlug || undefined,
    });
  }

  // ==================== Members state ====================
  const { data: membersData, isLoading: membersLoading, error: membersError } = trpc.organization.listMembers.useQuery(undefined, {
    retry: false,
  });

  const apiMembers: Member[] = membersData
    ? (membersData as any[]).map(mapApiMember)
    : [];

  const members = apiMembers.length > 0 || (!membersError && !membersLoading)
    ? apiMembers
    : SAMPLE_MEMBERS;

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

  const inviteMemberMutation = trpc.organization.inviteMember.useMutation({
    onSuccess: () => {
      utils.organization.listMembers.invalidate();
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteRole('member');
      alert('Invitation sent successfully!');
    },
    onError: (err: any) => {
      alert(`Failed to invite member: ${err.message}`);
    },
  });

  const removeMemberMutation = trpc.organization.removeMember.useMutation({
    onSuccess: () => {
      utils.organization.listMembers.invalidate();
    },
    onError: (err: any) => {
      alert(`Failed to remove member: ${err.message}`);
    },
  });

  function handleInviteMember() {
    if (!inviteEmail.trim()) return;
    inviteMemberMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  }

  function handleRemoveMember(member: Member) {
    if (window.confirm(`Remove ${member.name} (${member.email}) from the organization?`)) {
      removeMemberMutation.mutate({ memberId: member.id });
    }
  }

  // ==================== API Keys state ====================
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(() => loadApiKeys());
  const [showAddKeyForm, setShowAddKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  function handleAddKey() {
    if (!newKeyName.trim() || !newKeyProvider.trim() || !newKeyValue.trim()) {
      alert('Please fill in all fields.');
      return;
    }
    const masked = newKeyValue.slice(0, 6) + '***...***' + newKeyValue.slice(-4);
    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim(),
      provider: newKeyProvider.trim(),
      createdAt: new Date().toISOString().split('T')[0] ?? '',
      maskedKey: masked,
    };
    const updated = [...apiKeys, newKey];
    setApiKeys(updated);
    saveApiKeys(updated);
    setShowAddKeyForm(false);
    setNewKeyName('');
    setNewKeyProvider('');
    setNewKeyValue('');
  }

  function handleDeleteKey(keyId: string) {
    if (!window.confirm('Delete this API key? This cannot be undone.')) return;
    const updated = apiKeys.filter((k) => k.id !== keyId);
    setApiKeys(updated);
    saveApiKeys(updated);
  }

  // ==================== Notifications state ====================
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() => loadNotificationPrefs());

  function toggleNotifPref(key: keyof NotificationPrefs) {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    saveNotificationPrefs(updated);
  }

  // ==================== Render ====================
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, organization, and integrations
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar tabs */}
        <nav className="flex lg:w-52 lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ==================== Profile Tab ==================== */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Profile Information</h2>
                {profileLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading profile...
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">Full Name</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">Email</label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button onClick={handleSaveProfile} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
                        {saved ? <Check className="h-4 w-4" /> : null}
                        {saved ? 'Saved' : 'Save Changes'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-lg border border-destructive/30 bg-card p-6">
                <h2 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h2>
                <p className="text-xs text-muted-foreground mb-4">Permanently delete your account and all associated data.</p>
                <button
                  onClick={handleDeleteAccount}
                  className="inline-flex items-center gap-2 rounded-md border border-destructive/50 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* ==================== Organization Tab ==================== */}
          {activeTab === 'organization' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Organization Details</h2>
                {orgLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading organization...
                  </div>
                ) : orgError ? (
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">No organization configured. Set up your organization to collaborate with your team.</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">Organization Name</label>
                        <input
                          type="text"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          placeholder="My Organization"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">Slug</label>
                        <input
                          type="text"
                          value={orgSlug}
                          onChange={(e) => setOrgSlug(e.target.value)}
                          placeholder="my-org"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleSaveOrg}
                        disabled={orgUpdateMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {orgUpdateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {saved ? <Check className="h-4 w-4" /> : null}
                        {saved ? 'Saved' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">Organization Name</label>
                        <input
                          type="text"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">Slug</label>
                        <input
                          type="text"
                          value={orgSlug}
                          onChange={(e) => setOrgSlug(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleSaveOrg}
                        disabled={orgUpdateMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {orgUpdateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {saved ? <Check className="h-4 w-4" /> : null}
                        {saved ? 'Saved' : 'Save Changes'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-2">Plan</h2>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">Free</span>
                  <button className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    Upgrade
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== Members Tab ==================== */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Team Members</h2>
                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  {showInviteForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showInviteForm ? 'Cancel' : 'Invite Member'}
                </button>
              </div>

              {/* Invite member inline form */}
              {showInviteForm && (
                <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Invite a new member</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1 sm:col-span-1">
                      <label className="block text-xs font-medium text-muted-foreground">Email</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-muted-foreground">Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as any)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleInviteMember}
                        disabled={inviteMemberMutation.isPending || !inviteEmail.trim()}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {inviteMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Send Invite
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {membersLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading members...
                </div>
              )}

              {/* Error fallback */}
              {membersError && !membersLoading && (
                <div className="rounded-md bg-muted/50 border border-border px-4 py-2 text-xs text-muted-foreground">
                  No organization configured. Member management requires an organization.
                </div>
              )}

              <div className="rounded-lg border border-border bg-card divide-y divide-border">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-4 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                      {member.avatarInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${roleColors[member.role]}`}>
                      {member.role}
                    </span>
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        disabled={removeMemberMutation.isPending}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {members.length === 0 && !membersLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed border-border">
                  <Users className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">No members found</p>
                </div>
              )}
            </div>
          )}

          {/* ==================== API Keys Tab ==================== */}
          {activeTab === 'api-keys' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">API Keys</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage provider API keys for agent execution</p>
                </div>
                <button
                  onClick={() => setShowAddKeyForm(!showAddKeyForm)}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  {showAddKeyForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showAddKeyForm ? 'Cancel' : 'Add Key'}
                </button>
              </div>

              {/* Add key inline form */}
              {showAddKeyForm && (
                <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Add a new API key</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-muted-foreground">Name</label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="Production Anthropic"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-muted-foreground">Provider</label>
                      <input
                        type="text"
                        value={newKeyProvider}
                        onChange={(e) => setNewKeyProvider(e.target.value)}
                        placeholder="Anthropic"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-muted-foreground">API Key</label>
                      <input
                        type="password"
                        value={newKeyValue}
                        onChange={(e) => setNewKeyValue(e.target.value)}
                        placeholder="sk-..."
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddKey}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Key
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-border bg-card divide-y divide-border">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center gap-4 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      <Key className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{key.name}</p>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {key.provider}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{key.maskedKey}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground hidden sm:block">
                      <p>Created {key.createdAt}</p>
                      {key.lastUsedAt && <p>Used {key.lastUsedAt}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {apiKeys.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed border-border">
                  <Key className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">No API keys configured</p>
                  <p className="text-xs text-muted-foreground">Add your provider API keys to start running agent workflows</p>
                </div>
              )}
            </div>
          )}

          {/* ==================== Notifications Tab ==================== */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Notification Preferences</h2>
                <div className="space-y-4">
                  {([
                    { key: 'gateApprovals' as const, label: 'Gate approvals assigned to me', desc: 'Get notified when a workflow needs your approval' },
                    { key: 'executionFailures' as const, label: 'Execution failures', desc: 'Get notified when a workflow execution fails' },
                    { key: 'executionCompletions' as const, label: 'Execution completions', desc: 'Get notified when a workflow run finishes successfully' },
                    { key: 'teamActivity' as const, label: 'Team member activity', desc: 'Get notified when team members make changes to workflows' },
                  ]).map((pref) => (
                    <div key={pref.key} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{pref.label}</p>
                        <p className="text-xs text-muted-foreground">{pref.desc}</p>
                      </div>
                      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={notifPrefs[pref.key]}
                          onChange={() => toggleNotifPref(pref.key)}
                          className="peer sr-only"
                        />
                        <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-background after:transition-transform peer-checked:after:translate-x-4" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Channels</h2>
                <div className="space-y-3">
                  {[
                    { label: 'In-app notifications', icon: Bell, enabled: true },
                    { label: 'Email notifications', icon: ExternalLink, enabled: false },
                    { label: 'Slack integration', icon: ExternalLink, enabled: false },
                  ].map((ch, i) => {
                    const ChIcon = ch.icon;
                    return (
                      <div key={i} className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ChIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{ch.label}</span>
                        </div>
                        {ch.enabled ? (
                          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-500">Active</span>
                        ) : (
                          <button className="text-xs text-primary hover:underline">Configure</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

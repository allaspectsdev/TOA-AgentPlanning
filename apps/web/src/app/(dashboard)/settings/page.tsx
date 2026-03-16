'use client';

import { useState } from 'react';
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
} from 'lucide-react';

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

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const MEMBERS: Member[] = [
  { id: '1', name: 'You', email: 'admin@example.com', role: 'owner', avatarInitial: 'Y', joinedAt: '2026-03-16' },
  { id: '2', name: 'Alice Chen', email: 'alice@example.com', role: 'admin', avatarInitial: 'A', joinedAt: '2026-03-16' },
  { id: '3', name: 'Bob Smith', email: 'bob@example.com', role: 'member', avatarInitial: 'B', joinedAt: '2026-03-16' },
];

const API_KEYS: ApiKey[] = [
  { id: '1', name: 'Production Anthropic', provider: 'Anthropic', createdAt: '2026-03-16', lastUsedAt: '2026-03-16', maskedKey: 'sk-ant-***...***7ygA' },
  { id: '2', name: 'OpenAI GPT-5', provider: 'OpenAI', createdAt: '2026-03-16', maskedKey: 'sk-proj-***...***xQ3w' },
];

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
// Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Profile Information</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Full Name</label>
                    <input
                      type="text"
                      defaultValue="Admin User"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Email</label>
                    <input
                      type="email"
                      defaultValue="admin@example.com"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
                    {saved ? <Check className="h-4 w-4" /> : null}
                    {saved ? 'Saved' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-destructive/30 bg-card p-6">
                <h2 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h2>
                <p className="text-xs text-muted-foreground mb-4">Permanently delete your account and all associated data.</p>
                <button className="inline-flex items-center gap-2 rounded-md border border-destructive/50 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* Organization Tab */}
          {activeTab === 'organization' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Organization Details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Organization Name</label>
                    <input
                      type="text"
                      defaultValue="My Organization"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Slug</label>
                    <input
                      type="text"
                      defaultValue="my-org"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
                    {saved ? <Check className="h-4 w-4" /> : null}
                    {saved ? 'Saved' : 'Save Changes'}
                  </button>
                </div>
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

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Team Members</h2>
                <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
                  <Plus className="h-4 w-4" />
                  Invite Member
                </button>
              </div>

              <div className="rounded-lg border border-border bg-card divide-y divide-border">
                {MEMBERS.map((member) => (
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
                      <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api-keys' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">API Keys</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage provider API keys for agent execution</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
                  <Plus className="h-4 w-4" />
                  Add Key
                </button>
              </div>

              <div className="rounded-lg border border-border bg-card divide-y divide-border">
                {API_KEYS.map((key) => (
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
                    <button className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {API_KEYS.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed border-border">
                  <Key className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">No API keys configured</p>
                  <p className="text-xs text-muted-foreground">Add your provider API keys to start running agent workflows</p>
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Notification Preferences</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Gate approvals assigned to me', desc: 'Get notified when a workflow needs your approval', defaultOn: true },
                    { label: 'Execution failures', desc: 'Get notified when a workflow execution fails', defaultOn: true },
                    { label: 'Execution completions', desc: 'Get notified when a workflow run finishes successfully', defaultOn: false },
                    { label: 'Team member activity', desc: 'Get notified when team members make changes to workflows', defaultOn: false },
                  ].map((pref, i) => (
                    <div key={i} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{pref.label}</p>
                        <p className="text-xs text-muted-foreground">{pref.desc}</p>
                      </div>
                      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                        <input type="checkbox" defaultChecked={pref.defaultOn} className="peer sr-only" />
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

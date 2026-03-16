'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderKanban,
  LayoutTemplate,
  ShieldCheck,
  Settings,
  ChevronDown,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/approvals', label: 'Approvals', icon: ShieldCheck },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

function Sidebar({
  className,
  user,
  onLogout,
}: {
  className?: string;
  user: { id: string; name: string; email: string } | null;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar ${className ?? ''}`}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
          T
        </div>
        <span className="text-sm font-semibold text-foreground">
          Teams of Agents
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-active text-sidebar-active-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-active/50 hover:text-sidebar-active-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-active/50 hover:text-sidebar-active-foreground"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="flex-1 truncate text-left">{user?.name ?? 'User'}</span>
          <LogOut className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
      </div>
    </aside>
  );
}

function TopBar({
  onToggleMobileSidebar,
  user,
}: {
  onToggleMobileSidebar: () => void;
  user: { id: string; name: string; email: string } | null;
}) {
  const [orgOpen, setOrgOpen] = useState(false);

  const orgName = user?.name ? `${user.name}'s Organization` : 'My Organization';

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      {/* Mobile menu button */}
      <button
        onClick={onToggleMobileSidebar}
        className="mr-2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Org switcher */}
      <div className="relative">
        <button
          onClick={() => setOrgOpen(!orgOpen)}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
            {orgName[0]?.toUpperCase() ?? 'O'}
          </div>
          {orgName}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>

        {orgOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOrgOpen(false)}
            />
            <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-popover p-1 shadow-lg">
              <button
                onClick={() => setOrgOpen(false)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground hover:bg-accent"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                  {orgName[0]?.toUpperCase() ?? 'O'}
                </div>
                {orgName}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <button className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <User className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/get-session', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar className="hidden lg:flex" user={user} onLogout={handleLogout} />

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 h-full w-60">
            <Sidebar user={user} onLogout={handleLogout} />
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute right-2 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          user={user}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

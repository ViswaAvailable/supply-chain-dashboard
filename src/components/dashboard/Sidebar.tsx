'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Activity,
  Calendar,
  CalendarDays,
  BarChart3,
  Settings,
  User,
  ChevronDown,
  LogOut,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/supabase/useAuth';
import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const forecastingItems: NavItem[] = [
  { href: '/dashboard', label: 'Demand Forecast', icon: Activity },
  { href: '/dashboard/daily', label: 'Daily Forecast Detail', icon: CalendarDays },
  { href: '/dashboard/event-analysis', label: 'Event Analysis', icon: BarChart3 },
];

const configItems: NavItem[] = [
  { href: '/dashboard/sku-settings', label: 'SKU Settings', icon: Settings },
  { href: '/dashboard/events', label: 'Event Manager', icon: Calendar },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const supabase = useSupabase();
  const [userInitials, setUserInitials] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('name, email, role')
        .eq('id', user.id)
        .single();

      if (data) {
        const displayName = data.name || data.email || user.email || '';
        setUserName(displayName);
        setUserRole(data.role);

        const parts = displayName.split(/[@\s.]+/).filter(Boolean);
        if (parts.length >= 2) {
          setUserInitials(parts[0][0].toUpperCase() + parts[1][0].toUpperCase());
        } else if (parts.length === 1) {
          setUserInitials(parts[0][0].toUpperCase());
        }
      }
    }

    fetchUserProfile();
  }, [user, supabase]);

  const isAdmin = userRole === 'admin';

  return (
    <aside className="fixed left-4 top-4 bottom-4 w-64 flex flex-col rounded-2xl glass-dark shadow-xl border border-white/5 z-50 animate-slide-right">
      {/* Logo Section */}
      <div className="p-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <Image
              src="/lemondots-logo.png"
              alt="LemonDots Logo"
              width={36}
              height={36}
              className="h-9 w-auto transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute -inset-1 bg-[var(--lemon-500)]/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-white tracking-tight font-[family-name:var(--font-display)]">
              LemonDots
            </span>
            <span className="text-[10px] font-medium tracking-widest uppercase text-[var(--lemon-500)] flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              AI Forecasting
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 scrollbar-thin">
        {/* Forecasting Section */}
        <div className="mb-8">
          <h3 className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
            Forecasting
          </h3>
          <ul className="space-y-1">
            {forecastingItems.map((item, index) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <li key={item.href} className={cn('opacity-0 animate-slide-up', `stagger-${index + 1}`)}>
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <div className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-[var(--lemon-500)] text-[var(--charcoal-900)]'
                        : 'bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white'
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--lemon-500)] animate-pulse-glow" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Configuration Section - Only visible to admins */}
        {isAdmin && (
          <div className="mb-6">
            <h3 className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Configuration
            </h3>
            <ul className="space-y-1">
              {configItems.map((item, index) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <li key={item.href} className={cn('opacity-0 animate-slide-up', `stagger-${index + 4}`)}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-[var(--lemon-500)] text-[var(--charcoal-900)]'
                          : 'bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white'
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span>{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--lemon-500)] animate-pulse-glow" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Profile Section */}
      <div className="p-3 border-t border-white/10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-white/5 focus-ring group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm bg-gradient-to-br from-[var(--lemon-400)] to-[var(--lemon-600)] text-[var(--charcoal-900)] shadow-lg shadow-[var(--lemon-500)]/20 transition-transform duration-200 group-hover:scale-105">
                  {userInitials || <User className="h-5 w-5" />}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--success)] border-2 border-[var(--charcoal-900)]" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {userName || 'User'}
                </p>
                {userRole && (
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                    {userRole}
                  </p>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-white/40 transition-transform duration-200 group-hover:text-white/60 group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 animate-scale-in">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

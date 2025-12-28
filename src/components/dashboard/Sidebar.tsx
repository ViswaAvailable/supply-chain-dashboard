'use client';

import Link from 'next/link';
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

// LemonDots theme colors
const theme = {
  sidebar: '#1e293b',
  sidebarForeground: '#ffffff',
  sidebarForeground70: 'rgba(255, 255, 255, 0.7)',
  sidebarForeground60: 'rgba(255, 255, 255, 0.6)',
  sidebarAccent: '#334155',
  sidebarAccent50: 'rgba(51, 65, 85, 0.5)',
  sidebarPrimary: '#fbbf24',
  sidebarBorder: '#334155',
};

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
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
        
        // Generate initials
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
    <aside 
      className="fixed left-0 top-16 bottom-0 w-64 flex flex-col"
      style={{ 
        backgroundColor: theme.sidebar, 
        borderRight: `1px solid ${theme.sidebarBorder}` 
      }}
    >
      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Forecasting Section */}
        <div className="mb-6">
          <h3 
            className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: theme.sidebarForeground60 }}
          >
            Forecasting
          </h3>
          <ul className="space-y-1 px-2">
            {forecastingItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? theme.sidebarAccent : 'transparent',
                      color: isActive ? theme.sidebarForeground : theme.sidebarForeground70,
                      borderRight: isActive ? `2px solid ${theme.sidebarPrimary}` : 'none',
                    }}
                  >
                    <Icon 
                      className="h-4 w-4" 
                      style={{ color: isActive ? theme.sidebarPrimary : 'inherit' }}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Configuration Section - Only visible to admins */}
        {isAdmin && (
          <div className="mb-6">
            <h3 
              className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: theme.sidebarForeground60 }}
            >
              Configuration
            </h3>
            <ul className="space-y-1 px-2">
              {configItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: isActive ? theme.sidebarAccent : 'transparent',
                        color: isActive ? theme.sidebarForeground : theme.sidebarForeground70,
                        borderRight: isActive ? `2px solid ${theme.sidebarPrimary}` : 'none',
                      }}
                    >
                      <Icon 
                        className="h-4 w-4" 
                        style={{ color: isActive ? theme.sidebarPrimary : 'inherit' }}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Profile Section */}
      <div 
        className="p-4"
        style={{ borderTop: `1px solid ${theme.sidebarBorder}` }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="w-full flex items-center gap-3 p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.sidebarAccent50}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md"
                style={{ 
                  background: `linear-gradient(to bottom right, ${theme.sidebarPrimary}, #d97706)`,
                  color: theme.sidebar
                }}
              >
                {userInitials || <User className="h-5 w-5" />}
              </div>
              <div className="flex-1 text-left">
                <p 
                  className="text-sm font-medium truncate"
                  style={{ color: theme.sidebarForeground }}
                >
                  {userName || 'User'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4" style={{ color: theme.sidebarForeground60 }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
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

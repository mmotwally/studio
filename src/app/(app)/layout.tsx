import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Package,
  FileText,
  ShoppingCart,
  BarChart3,
  Settings as SettingsIcon,
  Sparkles,
  Library,
} from 'lucide-react';
import type { NavItem } from '@/types';
import { AppShell } from '@/components/layout/app-shell';

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { title: 'Inventory', href: '/inventory', icon: 'Package' },
  { title: 'Requisitions', href: '/requisitions', icon: 'FileText' },
  { title: 'Purchase Orders', href: '/purchase-orders', icon: 'ShoppingCart' },
  { title: 'Reports', href: '/reports', icon: 'BarChart3' },
  { title: 'Cabinet Designer', href: '/cabinet-designer', icon: 'Library' },
  { title: 'Special Feature', href: '/special-feature', icon: 'Sparkles' },
  { title: 'Settings', href: '/settings', icon: 'SettingsIcon' },
];

export const runtime = 'nodejs';

export default function AppLayout({ children }: { children: ReactNode }) {
  const defaultUser = {
    id: 'default-user',
    name: 'Cabinet User',
    email: 'user@cabinetconsole.com',
    role: 'User',
    avatarUrl: 'https://placehold.co/40x40.png?text=U'
  };

  return (
    <AppShell navItems={navItems} user={defaultUser}>
      {children}
    </AppShell>
  );
}
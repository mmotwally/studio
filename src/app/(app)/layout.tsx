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
import { getUserPermissions } from '@/lib/permissions';
import { AppShell } from '@/components/layout/app-shell';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

const allNavItems: (NavItem & { requiredPermission?: string })[] = [
    { title: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { title: 'Inventory', href: '/inventory', icon: 'Package', requiredPermission: 'View Inventory' },
    { title: 'Requisitions', href: '/requisitions', icon: 'FileText', requiredPermission: 'View All Requisitions' },
    { title: 'Purchase Orders', href: '/purchase-orders', icon: 'ShoppingCart', requiredPermission: 'View All Purchase Orders' },
    { title: 'Reports', href: '/reports', icon: 'BarChart3', requiredPermission: 'Generate & View Reports' },
    { title: 'Cabinet Designer', href: '/cabinet-designer', icon: 'Library', requiredPermission: 'Use Cabinet Designer & Project Planner' },
    { title: 'Special Feature', href: '/special-feature', icon: 'Sparkles', requiredPermission: 'Use Nesting Optimization' },
    { title: 'Settings', href: '/settings', icon: 'SettingsIcon', requiredPermission: 'Create Roles' },
];

export const runtime = 'nodejs';

export default async function AppLayout({ children }: { children: ReactNode }) {
    const session = await getSession();
    console.log("Session in layout:", session);
    if (!session?.user) {
        redirect('/login');
    }

    const permissions = await getUserPermissions();
    const navItems = allNavItems.filter(item =>
        !item.requiredPermission || permissions.has(item.requiredPermission)
    );

    return (
        <AppShell navItems={navItems} user={session.user}>
            {children}
        </AppShell>
    );
}

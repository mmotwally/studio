
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/types';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';

interface SidebarNavProps {
  items: NavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  if (!items?.length) {
    return null;
  }

  return (
    <SidebarMenu>
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <SidebarMenuItem key={index}>
            <Link href={item.disabled ? '#' : item.href} legacyBehavior passHref>
              <SidebarMenuButton
                variant="default"
                size="default"
                className={cn(
                  'justify-start w-full',
                  isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                  item.disabled && 'cursor-not-allowed opacity-80'
                )}
                isActive={isActive}
                aria-disabled={item.disabled}
                disabled={item.disabled}
                tooltip={item.title}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                {item.label && (
                  <Badge variant="outline" className="ml-auto group-data-[collapsible=icon]:hidden">
                    {item.label}
                  </Badge>
                )}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

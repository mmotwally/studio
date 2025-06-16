
"use client"; // Required for Tabs

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { User, Role } from '@/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Users, ShieldCheck } from 'lucide-react';

const sampleUsers: User[] = [
  { id: 'USR001', name: 'Alice Wonderland', email: 'alice@example.com', role: 'Administrator', avatarUrl: 'https://placehold.co/40x40/FFA500/FFFFFF.png?text=AW' },
  { id: 'USR002', name: 'Bob The Builder', email: 'bob@example.com', role: 'Inventory Manager', avatarUrl: 'https://placehold.co/40x40/008000/FFFFFF.png?text=BB' },
  { id: 'USR003', name: 'Charlie Brown', email: 'charlie@example.com', role: 'Requester', avatarUrl: 'https://placehold.co/40x40/0000FF/FFFFFF.png?text=CB' },
];

const sampleRoles: Role[] = [
  { id: 'ROL001', name: 'Administrator', description: 'Full access to all system features.', userCount: 1 },
  { id: 'ROL002', name: 'Inventory Manager', description: 'Manages inventory, stock levels, and suppliers.', userCount: 1 },
  { id: 'ROL003', name: 'Requester', description: 'Can create and submit requisitions.', userCount: 1 },
  { id: 'ROL004', name: 'Approver', description: 'Can approve or reject requisitions.', userCount: 0 },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage users, roles, and application configurations."
      />
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-[400px]">
          <TabsTrigger value="users"><Users className="mr-2 h-4 w-4 inline-block" /> User Management</TabsTrigger>
          <TabsTrigger value="roles"><ShieldCheck className="mr-2 h-4 w-4 inline-block" /> Role Management</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add User
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Avatar</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="avatar person" />
                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" /> Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
           {sampleUsers.length === 0 && (
            <div className="mt-4 text-center text-muted-foreground">
              No users found. Add users to manage access.
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
           <div className="flex justify-end mb-4">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Role
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{role.description}</TableCell>
                    <TableCell className="text-right">{role.userCount}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" /> Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Role
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
           {sampleRoles.length === 0 && (
            <div className="mt-4 text-center text-muted-foreground">
              No roles found. Define roles to manage permissions.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

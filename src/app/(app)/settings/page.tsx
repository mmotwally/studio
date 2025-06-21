import { getUsers } from './users/actions';
import { getRoles } from './roles/actions';
import { getPermissions } from './permissions/actions';
import { SettingsClient } from './client';

export default async function SettingsPage() {
  // Fetch all necessary data on the server in parallel
  const [users, roles, permissions] = await Promise.all([
    getUsers(),
    getRoles(),
    getPermissions(),
  ]);

  return <SettingsClient 
            users={users} 
            roles={roles} 
            permissions={permissions} 
         />;
}

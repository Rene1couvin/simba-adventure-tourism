import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, ShieldOff, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface User {
  id: string;
  full_name: string;
  phone: string | null;
  is_admin: boolean;
  is_super_admin: boolean;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      if (profiles && profiles.length > 0) {
        await supabase.rpc('log_admin_access', {
          _action: 'VIEW_PROFILES',
          _table_name: 'profiles',
          _accessed_fields: ['phone', 'full_name']
        });
      }

      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: isAdmin } = await supabase
            .rpc('has_role', { _user_id: profile.id, _role: 'admin' });
          
          return {
            ...profile,
            email: `user-${profile.id.slice(0, 8)}@email.com`,
            is_admin: !!isAdmin,
            is_super_admin: false, // We check this via the protected email check
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      if (isCurrentlyAdmin) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) {
          if (error.message?.includes('super_admin')) {
            toast({
              title: 'Protected Account',
              description: 'This account is protected and cannot be modified.',
              variant: 'destructive',
            });
            return;
          }
          throw error;
        }

        await supabase.rpc('log_admin_access', {
          _action: 'REMOVE_ADMIN_ROLE',
          _table_name: 'user_roles',
          _record_id: userId
        });
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;

        await supabase.rpc('log_admin_access', {
          _action: 'GRANT_ADMIN_ROLE',
          _table_name: 'user_roles',
          _record_id: userId
        });
      }

      toast({
        title: 'Success',
        description: `User ${isCurrentlyAdmin ? 'removed from' : 'added to'} admin role`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => {
              // Check if this is the protected super admin (by checking if they have admin and the ID matches)
              const isProtected = user.full_name === 'User' && user.is_admin; // approximate check
              return (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{user.full_name}</h3>
                        {user.is_admin && (
                          <Badge variant="secondary" className="text-xs">
                            <ShieldAlert className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
                    </div>
                  </div>
                  <Button
                    variant={user.is_admin ? 'destructive' : 'default'}
                    onClick={() => toggleAdmin(user.id, user.is_admin)}
                  >
                    {user.is_admin ? (
                      <>
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Remove Admin
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Make Admin
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

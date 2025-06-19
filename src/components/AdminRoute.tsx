
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, profile, isLoading } = useAuth();

  // Check if user has admin role
  const { data: hasAdminRole, isLoading: roleLoading } = useQuery({
    queryKey: ['user-admin-role', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return false;
      
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: profile.id,
        _role: 'admin'
      });
      
      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
      
      return data;
    },
    enabled: !!profile?.id,
  });

  if (isLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!hasAdminRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>
              You don't have permission to access this area. Please contact an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>If you believe this is an error, please contact support.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;

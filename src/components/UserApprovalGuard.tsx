
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface UserApprovalGuardProps {
  children: React.ReactNode;
}

const UserApprovalGuard: React.FC<UserApprovalGuardProps> = ({ children }) => {
  const { profile, signOut, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return <>{children}</>;
  }

  if (profile.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Clock className="h-12 w-12 text-yellow-500" />
            </div>
            <CardTitle>Account Pending Approval</CardTitle>
            <CardDescription>
              Your account is awaiting admin approval. You'll be notified once it's been reviewed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Account created: {new Date(profile.approval_requested_at).toLocaleDateString()}</p>
              <p>Email: {profile.email}</p>
            </div>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={signOut}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile.status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle>Account Not Approved</CardTitle>
            <CardDescription>
              Your account request has been declined. Please contact an administrator if you believe this is an error.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={signOut}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is approved, show the app
  return <>{children}</>;
};

export default UserApprovalGuard;

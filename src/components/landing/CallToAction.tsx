
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AnimatedTransition } from '@/components/AnimatedTransition';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '../AuthModal';

interface CallToActionProps {
  show: boolean;
}

export const CallToAction = ({ show }: CallToActionProps) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { isAuthenticated, profile } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated && profile?.status === 'approved') {
      window.location.href = '/chat';
    } else {
      setIsAuthModalOpen(true);
    }
  };

  return (
    <AnimatedTransition show={show} animation="slide-up" duration={600}>
      <div className="py-16 md:py-24 text-primary-foreground rounded-2xl text-center bg-blue-600">
        <h2 className="text-4xl font-bold mb-4 md:text-7xl">Ready to Start?</h2>
        <p className="text-xl mb-10 max-w-2xl mx-auto">
          Join your FSG colleagues who are already transforming their work with secure AI tools.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Button 
            size="lg" 
            variant="outline" 
            onClick={handleGetStarted}
            className="rounded-full px-8 py-6 text-base font-medium bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10 transition-all duration-300"
          >
            {isAuthenticated && profile?.status === 'approved' ? 'Access Your Workspace' : 'Request Access'}
          </Button>
        </div>

        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
        />
      </div>
    </AnimatedTransition>
  );
};

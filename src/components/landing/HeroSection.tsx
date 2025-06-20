import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedTransition } from '@/components/AnimatedTransition';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '../AuthModal';
import DiagramComponent from './DiagramComponent';

interface HeroSectionProps {
  showTitle: boolean;
}

export const HeroSection = ({ showTitle }: HeroSectionProps) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { isAuthenticated, profile } = useAuth();
  const [activeSection, setActiveSection] = useState<'scattered' | 'convergence' | 'organized'>('scattered');
  const [heroText, setHeroText] = useState("Secure AI workspace for FSG employees. Process documents, analyze content, and collaborate with AI models in a protected environment designed for your business needs.");

  const handleSectionClick = (section: 'scattered' | 'convergence' | 'organized', text: string) => {
    setActiveSection(section);
    setHeroText(text);
  };

  const getCallToActionButton = () => {
    if (isAuthenticated && profile?.status === 'approved') {
      return (
        <Button 
          size="lg" 
          onClick={() => window.location.href = '/chat'}
          className="rounded-full px-8 py-6 text-base font-medium bg-primary hover:bg-primary/90 transition-all duration-300"
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          Access Your Workspace
        </Button>
      );
    }

    if (isAuthenticated && profile?.status === 'pending') {
      return (
        <Button 
          size="lg" 
          disabled
          className="rounded-full px-8 py-6 text-base font-medium bg-muted text-muted-foreground"
        >
          Account Pending Approval
        </Button>
      );
    }

    return (
      <Button 
        size="lg" 
        onClick={() => setIsAuthModalOpen(true)} 
        className="rounded-full px-8 py-6 text-base font-medium bg-primary hover:bg-primary/90 transition-all duration-300"
      >
        Get Started
      </Button>
    );
  };

  return (
    <div className="py-20 md:py-28 flex flex-col items-center text-center">
      <AnimatedTransition show={showTitle} animation="slide-up" duration={600}>
        {/* Updated title for FSG Hub */}
        <h1 className="text-4xl sm:text-5xl font-bold mb-6 bg-clip-text text-blue-600 md:text-7xl">
          FSG Hub
        </h1>
        
        {/* Updated FSG-specific text */}
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" key={heroText}>
          {heroText}
        </p>
        
        {/* Keep existing diagram */}
        <div className="mb-8">
          <DiagramComponent onSectionClick={handleSectionClick} activeSection={activeSection} />
        </div>
        
        {/* Updated call to action */}
        {getCallToActionButton()}

        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
        />
      </AnimatedTransition>
    </div>
  );
};


import { Users, Lock, Workflow, BarChart3 } from 'lucide-react';
import { AnimatedTransition } from '@/components/AnimatedTransition';

interface SecureCollaborationSectionProps {
  show: boolean;
}

export const SecureCollaborationSection = ({ show }: SecureCollaborationSectionProps) => {
  const collaborationFeatures = [
    {
      icon: <Users size={32} className="text-primary" />,
      title: "Team Workspaces",
      description: "Organize projects and share insights with your FSG colleagues securely."
    },
    {
      icon: <Lock size={32} className="text-primary" />,
      title: "Enterprise Security",
      description: "Built-in compliance and security controls designed for FSG's requirements."
    },
    {
      icon: <Workflow size={32} className="text-primary" />,
      title: "Streamlined Workflows",
      description: "Integrate with existing FSG processes and maintain consistent workflows."
    },
    {
      icon: <BarChart3 size={32} className="text-primary" />,
      title: "Usage Insights",
      description: "Track team productivity and optimize AI model usage across departments."
    }
  ];

  return (
    <AnimatedTransition show={show} animation="slide-up" duration={600}>
      <div className="py-16 md:py-24">
        <div className="flex flex-col items-center text-center gap-2 mb-12">
          <h2 className="text-4xl font-bold text-blue-600 md:text-8xl">Secure Collaboration</h2>
          <p className="text-foreground max-w-3xl text-xl md:text-2xl mt-2">
            Work together with confidence in a secure, FSG-designed environment.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {collaborationFeatures.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </AnimatedTransition>
  );
};

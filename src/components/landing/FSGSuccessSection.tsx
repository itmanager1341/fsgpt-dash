
import { AnimatedTransition } from '@/components/AnimatedTransition';
import { Card } from '@/components/ui/card';
import { Quote } from 'lucide-react';

interface FSGSuccessSectionProps {
  show: boolean;
}

export const FSGSuccessSection = ({ show }: FSGSuccessSectionProps) => {
  const successStories = [
    {
      quote: "FSG Hub has transformed how I process client research. What used to take hours now takes minutes.",
      role: "Senior Consultant",
      department: "Strategy Team"
    },
    {
      quote: "The document analysis capabilities are incredible. I can quickly extract key insights from complex reports.",
      role: "Principal",
      department: "Healthcare Practice"
    },
    {
      quote: "Having secure AI tools designed for our work has been a game-changer for our team's productivity.",
      role: "Managing Director",
      department: "Leadership"
    },
    {
      quote: "The ability to collaborate and share insights while maintaining our security standards is exactly what we needed.",
      role: "Senior Manager",
      department: "Operations"
    },
    {
      quote: "FSG Hub helps me prepare better presentations and analysis for our clients in half the time.",
      role: "Consultant",
      department: "Education Practice"
    },
    {
      quote: "The AI-powered search across all our documents has made finding past work so much easier.",
      role: "Associate",
      department: "Research Team"
    }
  ];

  return (
    <AnimatedTransition show={show} animation="slide-up" duration={600}>
      <div className="py-16 md:py-24">
        <div className="flex flex-col items-center gap-2 mb-12 text-center">
          <h2 className="text-4xl font-bold text-blue-600 md:text-8xl">
            FSG Success Stories
          </h2>
          <p className="text-foreground max-w-3xl text-xl md:text-2xl mt-2">
            See how FSG colleagues are transforming their work with AI.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
          {successStories.map((story, index) => (
            <Card key={index} className="bg-card border border-border/50 p-6 rounded-lg shadow-sm h-full">
              <Quote className="w-8 h-8 text-primary/30 mb-4" />
              <p className="text-lg font-medium mb-6 italic">"{story.quote}"</p>
              <div className="mt-auto">
                <p className="font-bold text-primary">{story.role}</p>
                <p className="text-sm text-muted-foreground">{story.department}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AnimatedTransition>
  );
};

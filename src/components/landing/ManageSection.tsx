
import { useState } from 'react';
import { AnimatedTransition } from '@/components/AnimatedTransition';
import { FeatureIllustration } from './FeatureIllustration';
import { FeatureIcon } from './FeatureIllustrations/FeatureIcon';

interface ManageSectionProps {
  show: boolean;
}

export const ManageSection = ({ show }: ManageSectionProps) => {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  
  const features = [
    {
      title: "Document Processing",
      description: "Upload PDFs and images for AI-powered text extraction and analysis using Azure Document Intelligence."
    },
    {
      title: "AI Models",
      description: "Access OpenAI GPT models and Perplexity for different types of analysis and content generation."
    },
    {
      title: "Secure Storage",
      description: "Your documents and conversations are stored securely with individual access controls and audit trails."
    },
    {
      title: "Project Organization",
      description: "Organize your work into persistent conversation threads and project folders for easy retrieval."
    },
    {
      title: "Company Knowledge",
      description: "Access shared FSG resources, brand guidelines, and company reference materials in one place."
    },
    {
      title: "Smart Search",
      description: "Find information across all your documents and conversations with AI-powered semantic search."
    },
    {
      title: "Collaboration",
      description: "Share insights and collaborate with team members while maintaining security and access controls."
    },
    {
      title: "Analytics",
      description: "Track usage, costs, and productivity metrics through comprehensive admin dashboards."
    }
  ];

  const handleFeatureClick = (index: number) => {
    setActiveFeature(index === activeFeature ? null : index);
  };

  return (
    <AnimatedTransition show={show} animation="slide-up" duration={600}>
      <div className="py-16 md:py-24">
        <div className="flex flex-col items-center text-center gap-2 mb-12">
          <h2 className="text-4xl font-bold text-blue-600 md:text-8xl">Core Capabilities</h2>
          <p className="text-foreground max-w-3xl text-xl md:text-2xl mt-2">
            Powerful AI tools designed for FSG's secure business environment.
          </p>
        </div>

        <FeatureIllustration featureIndex={activeFeature} className="transition-all duration-500" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`flex flex-col items-center text-center transition-all duration-300 ${
                activeFeature === index ? 'scale-105' : 'hover:scale-102'
              } cursor-pointer`}
              onClick={() => handleFeatureClick(index)}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
                activeFeature === index ? 'bg-primary/20 ring-2 ring-primary/50' : 'bg-primary/10'
              }`}>
                <FeatureIcon index={index} size={32} />
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

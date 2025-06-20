
import { AnimatedTransition } from '@/components/AnimatedTransition';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { FileAudio, FileVideo, Search, Megaphone, FileText, Users } from 'lucide-react';

interface UseCasesSectionProps {
  show: boolean;
}

const workflowExamples = [
  {
    icon: <FileAudio className="w-8 h-8 text-white" />,
    title: "Upload audio and video files",
    subtitle: "and summarize",
    description: "Upload meeting recordings, client calls, or presentation videos. Get instant AI-powered summaries, key insights, and action items extracted automatically.",
    background: 'bg-[#0ea5e9]'
  },
  {
    icon: <Megaphone className="w-8 h-8 text-white" />,
    title: "Create marketing campaign",
    subtitle: "outlines",
    description: "Generate comprehensive marketing strategies, campaign timelines, and content plans tailored to your target audience and business objectives.",
    background: 'bg-[#8b5cf6]'
  },
  {
    icon: <Search className="w-8 h-8 text-white" />,
    title: "Search company data",
    subtitle: "and documents",
    description: "Quickly find information across all your uploaded documents, research reports, and knowledge base using intelligent semantic search.",
    background: 'bg-[#059669]'
  },
  {
    icon: <FileText className="w-8 h-8 text-white" />,
    title: "Generate client proposals",
    subtitle: "and reports",
    description: "Create professional proposals, executive summaries, and detailed reports based on your research and client requirements.",
    background: 'bg-[#f97316]'
  },
  {
    icon: <Users className="w-8 h-8 text-white" />,
    title: "Analyze stakeholder",
    subtitle: "feedback",
    description: "Process survey responses, interview transcripts, and feedback forms to identify patterns, sentiment, and actionable insights.",
    background: 'bg-[#d946ef]'
  }
];

const UseCasesSection = ({ show }: UseCasesSectionProps) => {
  return (
    <AnimatedTransition show={show} animation="slide-up" duration={600}>
      <div className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-4 mb-16">
          <h2 className="text-3xl text-center mb-12 tracking-tight text-blue-700 font-bold md:text-7xl">
            Simplify your workflow.
          </h2>
          
          <Carousel className="w-full max-w-5xl mx-auto">
            <CarouselContent className="-ml-2 md:-ml-4">
              {workflowExamples.map((workflow, index) => (
                <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className={`rounded-xl overflow-hidden transition-all duration-500 h-full ${workflow.background}`}>
                    <div className="p-8 h-full flex flex-col">
                      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-6 mx-auto">
                        {workflow.icon}
                      </div>
                      <div className="text-center text-white flex-1">
                        <h3 className="text-xl md:text-2xl font-medium mb-2">
                          {workflow.title}
                          <span className="block italic font-light text-lg">{workflow.subtitle}</span>
                        </h3>
                        <p className="text-sm md:text-base opacity-90 leading-relaxed">
                          {workflow.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </div>
    </AnimatedTransition>
  );
};

export default UseCasesSection;

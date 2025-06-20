
import { FileText, Image, FileSpreadsheet, FileVideo, Brain, Shield } from 'lucide-react';
import { AnimatedTransition } from '@/components/AnimatedTransition';
import { Card } from '@/components/ui/card';

interface DocumentProcessingSectionProps {
  show: boolean;
}

export const DocumentProcessingSection = ({ show }: DocumentProcessingSectionProps) => {
  const supportedFormats = [
    {
      icon: <FileText className="w-8 h-8 text-primary" />,
      title: "PDFs & Documents",
      description: "Extract text, analyze structure, and process complex documents"
    },
    {
      icon: <Image className="w-8 h-8 text-primary" />,
      title: "Images & Scans",
      description: "OCR text recognition from scanned documents and images"
    },
    {
      icon: <FileSpreadsheet className="w-8 h-8 text-primary" />,
      title: "Spreadsheets",
      description: "Process Excel files and structured data formats"
    },
    {
      icon: <FileVideo className="w-8 h-8 text-primary" />,
      title: "Presentations",
      description: "Extract content from PowerPoint and presentation files"
    }
  ];

  const capabilities = [
    {
      icon: <Brain className="w-6 h-6 text-primary" />,
      title: "AI-Powered Analysis",
      description: "Leverage Azure Document Intelligence for accurate text extraction and analysis"
    },
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "Secure Processing",
      description: "All document processing happens within FSG's secure cloud environment"
    }
  ];

  return (
    <AnimatedTransition show={show} animation="slide-up" duration={600}>
      <div className="py-16 md:py-24">
        <div className="flex flex-col items-center text-center gap-2 mb-12">
          <h2 className="text-4xl font-bold text-blue-600 md:text-8xl">Document Processing</h2>
          <p className="text-foreground max-w-3xl text-xl md:text-2xl mt-2">
            Transform any document into actionable insights with AI-powered processing.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {supportedFormats.map((format, index) => (
            <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow duration-300">
              <div className="flex justify-center mb-4">
                {format.icon}
              </div>
              <h3 className="font-bold mb-2">{format.title}</h3>
              <p className="text-sm text-muted-foreground">{format.description}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {capabilities.map((capability, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {capability.icon}
              </div>
              <div>
                <h3 className="font-bold mb-2">{capability.title}</h3>
                <p className="text-muted-foreground">{capability.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnimatedTransition>
  );
};

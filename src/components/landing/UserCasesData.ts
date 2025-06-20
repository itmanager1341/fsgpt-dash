
import { UserCasesData, Book } from './UseCasesTypes';

export const userCasesData: UserCasesData = {
  Staff: {
    title: 'Process documents and',
    subtitle: 'create content efficiently.',
    description: "Upload client briefs, research documents, and reference materials. Use AI to extract key insights, generate summaries, and create first drafts of proposals, emails, and presentations. Organize everything in project folders for easy access.",
    quote: "AI-powered productivity for daily tasks.",
    background: 'bg-[#0ea5e9]',
    textColor: 'text-white',
    ctaText: 'START PROCESSING'
  },
  Leadership: {
    title: 'Strategic analysis and',
    subtitle: 'executive decision support.',
    description: "Get comprehensive analysis of market research, competitive intelligence, and business documents. Generate executive summaries, board presentation materials, and strategic recommendations based on multiple data sources.",
    quote: "Data-driven insights for leadership.",
    background: 'bg-[#8b5cf6]',
    textColor: 'text-white',
    ctaText: 'ANALYZE NOW'
  },
  Admin: {
    title: 'System oversight and',
    subtitle: 'usage analytics.',
    description: "Monitor system usage, manage user access, track costs across AI models, and maintain security compliance. Access comprehensive dashboards showing team productivity and system performance metrics.",
    quote: "Complete control and visibility.",
    background: 'bg-[#059669]',
    textColor: 'text-white',
    ctaText: 'VIEW DASHBOARD'
  }
};

export const booksData: Book[] = [
  {
    title: "FSG Brand Guide",
    author: "Creative Team",
    coverColor: "bg-[#f97316]",
    textColor: "text-white"
  },
  {
    title: "Client Protocols",
    author: "Account Management",
    coverColor: "bg-[#8b5cf6]",
    textColor: "text-white"
  },
  {
    title: "Strategy Framework",
    author: "Leadership",
    coverColor: "bg-[#0ea5e9]",
    textColor: "text-white"
  },
  {
    title: "Process Manual",
    author: "Operations",
    coverColor: "bg-[#d946ef]",
    textColor: "text-white"
  },
  {
    title: "Industry Reports",
    author: "Research Team",
    coverColor: "bg-[#059669]",
    textColor: "text-white"
  }
];

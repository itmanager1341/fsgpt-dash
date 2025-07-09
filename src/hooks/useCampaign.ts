import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useCampaign = () => {
  const queryClient = useQueryClient();
  const [selectedCampaignTool, setSelectedCampaignTool] = useState(false);

  const createCampaign = useMutation({
    mutationFn: async (campaignName: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      // Create public project for campaign
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([{
          name: `Campaign: ${campaignName}`,
          description: `Campaign project for ${campaignName}`,
          color: '#3B82F6',
          icon: 'megaphone',
          user_id: session.user.id,
          is_public: true,
        }])
        .select()
        .single();
      
      if (projectError) throw projectError;

      // Create blank Campaign Brief template as knowledge item
      const { data: template, error: templateError } = await supabase
        .from('knowledge_items')
        .insert([{
          title: '01_Campaign_Brief',
          description: 'Campaign Brief Template - Complete and upload this document',
          content_type: 'template',
          category: 'Campaign Templates',
          user_id: session.user.id,
          project_id: project.id,
          classification_level: 'public',
        }])
        .select()
        .single();

      if (templateError) throw templateError;

      return { project, template };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['public-projects'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-items'] });
      toast.success('Campaign created successfully');
    },
    onError: (error) => {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    },
  });

  const generateCampaignBriefLink = useCallback(() => {
    // Generate download link for blank Campaign Brief template
    const templateContent = `# Campaign Brief Template

## Campaign Overview
- **Campaign Name:** [Enter campaign name]
- **Campaign Objective:** [Primary goal of the campaign]
- **Target Audience:** [Define your target audience]
- **Campaign Duration:** [Start and end dates]

## Key Messages
- **Primary Message:** [Main message you want to convey]
- **Supporting Messages:** [Secondary messages]

## Channels & Tactics
- **Primary Channels:** [List main marketing channels]
- **Content Types:** [Types of content to be created]
- **Budget Allocation:** [Budget breakdown by channel]

## Success Metrics
- **Primary KPIs:** [Key performance indicators]
- **Secondary Metrics:** [Additional metrics to track]
- **Reporting Schedule:** [How often to review performance]

## Timeline & Milestones
- **Planning Phase:** [Key planning milestones]
- **Execution Phase:** [Campaign execution timeline]
- **Review Phase:** [Post-campaign analysis schedule]

## Additional Notes
[Any additional information, requirements, or considerations]
`;

    const blob = new Blob([templateContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Campaign_Brief_Template.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return {
    selectedCampaignTool,
    setSelectedCampaignTool,
    createCampaign,
    generateCampaignBriefLink,
  };
};
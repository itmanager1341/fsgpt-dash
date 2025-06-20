
import { supabase } from '@/integrations/supabase/client';

export const cleanupStuckDocuments = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Find documents stuck in processing state for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: stuckDocs, error: findError } = await supabase
      .from('document_uploads')
      .select('id, original_name, processing_status, created_at')
      .eq('user_id', user.id)
      .in('processing_status', ['processing', 'pending'])
      .lt('created_at', tenMinutesAgo);

    if (findError) {
      console.error('Error finding stuck documents:', findError);
      return;
    }

    if (stuckDocs && stuckDocs.length > 0) {
      console.log(`Found ${stuckDocs.length} stuck documents, cleaning up...`);
      
      // Update stuck documents to failed status
      const { error: updateError } = await supabase
        .from('document_uploads')
        .update({
          processing_status: 'failed',
          processing_error: 'Processing timeout - document may be too large or service unavailable'
        })
        .in('id', stuckDocs.map(doc => doc.id));

      if (updateError) {
        console.error('Error updating stuck documents:', updateError);
      } else {
        console.log(`Cleaned up ${stuckDocs.length} stuck documents`);
      }
    }

    return stuckDocs?.length || 0;
  } catch (error) {
    console.error('Error in cleanup process:', error);
    return 0;
  }
};

export const getDocumentProcessingStats = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: stats, error } = await supabase
      .from('document_uploads')
      .select('processing_status, file_size, created_at')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error getting document stats:', error);
      return null;
    }

    const statusCounts = stats?.reduce((acc, doc) => {
      acc[doc.processing_status] = (acc[doc.processing_status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const totalSize = stats?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0;

    return {
      total: stats?.length || 0,
      statusCounts,
      totalSizeMB: Math.round(totalSize / (1024 * 1024)),
      recentCount: stats?.filter(doc => {
        const docDate = new Date(doc.created_at);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return docDate > oneDayAgo;
      }).length || 0
    };
  } catch (error) {
    console.error('Error getting document processing stats:', error);
    return null;
  }
};

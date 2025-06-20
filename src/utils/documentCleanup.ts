
import { supabase } from '@/integrations/supabase/client';

export const cleanupStuckDocuments = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Find documents stuck in processing state for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: stuckDocs, error: findError } = await supabase
      .from('document_uploads')
      .select('id, original_name, processing_status, uploaded_at, storage_path')
      .eq('user_id', user.id)
      .in('processing_status', ['processing', 'pending'])
      .lt('uploaded_at', tenMinutesAgo);

    if (findError) {
      console.error('Error finding stuck documents:', findError);
      return;
    }

    if (stuckDocs && stuckDocs.length > 0) {
      console.log(`Found ${stuckDocs.length} stuck documents, cleaning up...`);
      
      // Separate documents with invalid storage paths
      const invalidStorageDocs = stuckDocs.filter(doc => !doc.storage_path || doc.storage_path === 'temp');
      const validStorageDocs = stuckDocs.filter(doc => doc.storage_path && doc.storage_path !== 'temp');
      
      // Update stuck documents to failed status with appropriate error messages
      const updates = [];
      
      if (invalidStorageDocs.length > 0) {
        updates.push(supabase
          .from('document_uploads')
          .update({
            processing_status: 'failed',
            processing_error: 'Upload failed - invalid storage path. Please try uploading again.'
          })
          .in('id', invalidStorageDocs.map(doc => doc.id)));
      }
      
      if (validStorageDocs.length > 0) {
        updates.push(supabase
          .from('document_uploads')
          .update({
            processing_status: 'failed',
            processing_error: 'Processing timeout - document may be too large or service unavailable'
          })
          .in('id', validStorageDocs.map(doc => doc.id)));
      }
      
      const results = await Promise.all(updates);
      const hasErrors = results.some(result => result.error);
      
      if (hasErrors) {
        console.error('Error updating some stuck documents');
      } else {
        console.log(`Cleaned up ${stuckDocs.length} stuck documents (${invalidStorageDocs.length} had invalid storage paths)`);
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
      .select('processing_status, file_size, uploaded_at, storage_path')
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
    
    // Count documents with storage issues
    const storageIssues = stats?.filter(doc => !doc.storage_path || doc.storage_path === 'temp').length || 0;

    return {
      total: stats?.length || 0,
      statusCounts,
      totalSizeMB: Math.round(totalSize / (1024 * 1024)),
      recentCount: stats?.filter(doc => {
        const docDate = new Date(doc.uploaded_at);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return docDate > oneDayAgo;
      }).length || 0,
      storageIssues
    };
  } catch (error) {
    console.error('Error getting document processing stats:', error);
    return null;
  }
};

// New function to clean up documents with invalid storage paths
export const cleanupInvalidStoragePaths = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Find documents with invalid storage paths
    const { data: invalidDocs, error: findError } = await supabase
      .from('document_uploads')
      .select('id, original_name, storage_path')
      .eq('user_id', user.id)
      .or('storage_path.is.null,storage_path.eq.temp');

    if (findError) {
      console.error('Error finding documents with invalid storage paths:', findError);
      return 0;
    }

    if (invalidDocs && invalidDocs.length > 0) {
      console.log(`Found ${invalidDocs.length} documents with invalid storage paths, updating to failed status...`);
      
      const { error: updateError } = await supabase
        .from('document_uploads')
        .update({
          processing_status: 'failed',
          processing_error: 'Upload failed - file not properly stored. Please try uploading again.'
        })
        .in('id', invalidDocs.map(doc => doc.id));

      if (updateError) {
        console.error('Error updating documents with invalid storage paths:', updateError);
        return 0;
      } else {
        console.log(`Updated ${invalidDocs.length} documents with invalid storage paths to failed status`);
        return invalidDocs.length;
      }
    }

    return 0;
  } catch (error) {
    console.error('Error cleaning up invalid storage paths:', error);
    return 0;
  }
};

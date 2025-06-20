
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Trash2, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cleanupStuckDocuments, getDocumentProcessingStats } from '@/utils/documentCleanup';

interface Document {
  id: string;
  original_name: string;
  file_size: number;
  processing_status: string;
  processing_error?: string;
  summary?: string;
  uploaded_at: string;
  upload_status: string;
  metadata?: any;
}

const DocumentLibrary: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [cleaningUp, setCleaningUp] = useState(false);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('document_uploads')
        .select('id, original_name, file_size, processing_status, processing_error, summary, uploaded_at, upload_status, metadata')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);

      // Load stats
      const documentStats = await getDocumentProcessingStats();
      setStats(documentStats);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    setCleaningUp(true);
    try {
      const cleaned = await cleanupStuckDocuments();
      if (cleaned > 0) {
        toast.success(`Cleaned up ${cleaned} stuck documents`);
        await loadDocuments(); // Reload to show updated status
      } else {
        toast.info('No stuck documents found');
      }
    } catch (error) {
      toast.error('Failed to cleanup documents');
    } finally {
      setCleaningUp(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      // Also delete associated chunks
      await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId);

      const { error } = await supabase
        .from('document_uploads')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      toast.success('Document deleted successfully');
      
      // Reload stats
      const documentStats = await getDocumentProcessingStats();
      setStats(documentStats);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getStatusBadge = (status: string, error?: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Processed</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'failed':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle size={12} />
            Failed
          </Badge>
        );
      case 'pending':
        return <Badge variant="outline" className="flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" />
          Pending
        </Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProcessingDetails = (doc: Document) => {
    const metadata = doc.metadata || {};
    const details = [];
    
    if (metadata.text_length) {
      details.push(`${metadata.text_length.toLocaleString()} chars`);
    }
    if (metadata.page_count) {
      details.push(`${metadata.page_count} pages`);
    }
    if (metadata.chunk_count) {
      details.push(`${metadata.chunk_count} chunks`);
    }
    if (metadata.processing_time_seconds) {
      details.push(`${metadata.processing_time_seconds}s processing`);
    }
    
    return details.join(' • ');
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading documents...</span>
      </div>
    );
  }

  const stuckCount = documents.filter(doc => 
    ['processing', 'pending'].includes(doc.processing_status)
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Document Library</h3>
        <div className="flex gap-2">
          {stuckCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCleanup}
              disabled={cleaningUp}
              className="text-orange-600"
            >
              {cleaningUp ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Cleanup Stuck ({stuckCount})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadDocuments}>
            Refresh
          </Button>
        </div>
      </div>

      {stats && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">Total Documents</div>
                <div className="text-muted-foreground">{stats.total}</div>
              </div>
              <div>
                <div className="font-medium">Total Size</div>
                <div className="text-muted-foreground">{stats.totalSizeMB} MB</div>
              </div>
              <div>
                <div className="font-medium">Recent (24h)</div>
                <div className="text-muted-foreground">{stats.recentCount}</div>
              </div>
              <div>
                <div className="font-medium">Status</div>
                <div className="text-muted-foreground">
                  ✓{stats.statusCounts.completed || 0} 
                  {stats.statusCounts.failed ? ` ✗${stats.statusCounts.failed}` : ''}
                  {stats.statusCounts.processing ? ` ⏳${stats.statusCounts.processing}` : ''}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No documents uploaded yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Upload PDFs in the chat to get started
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((document) => (
            <Card key={document.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {document.original_name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFileSize(document.file_size)} • {new Date(document.uploaded_at).toLocaleDateString()}
                      </p>
                      {getProcessingDetails(document) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {getProcessingDetails(document)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(document.processing_status, document.processing_error)}
                  </div>
                </div>
              </CardHeader>
              
              {(document.summary || document.processing_error) && (
                <CardContent className="pt-0">
                  {document.processing_error ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-3">
                      <p className="text-sm text-red-800 font-medium">Processing Error:</p>
                      <p className="text-sm text-red-700">{document.processing_error}</p>
                    </div>
                  ) : null}
                  
                  {document.summary && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {document.summary}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument(document.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentLibrary;


import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Download, Edit2, Share2, FileAudio, Clock, User, Calendar, Loader2, Copy, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KnowledgeItem } from '@/hooks/useKnowledgeItems';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SummaryTemplate {
  id: string;
  name: string;
  description: string;
  prompt_template: string;
}

interface SummaryRequest {
  id: string;
  template_id: string;
  summary_content: string | null;
  status: string;
  created_at: string;
  template_name?: string;
}

interface KnowledgeItemDetailPaneProps {
  item: KnowledgeItem | null;
  onClose: () => void;
}

const KnowledgeItemDetailPane = ({ item, onClose }: KnowledgeItemDetailPaneProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [summaryTemplates, setSummaryTemplates] = useState<SummaryTemplate[]>([]);
  const [summaryRequests, setSummaryRequests] = useState<SummaryRequest[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load audio URL when item changes
  useEffect(() => {
    const loadAudioUrl = async () => {
      if (!item?.file_path) return;
      
      setLoadingAudio(true);
      try {
        const { data, error } = await supabase.storage
          .from('user-audio')
          .createSignedUrl(item.file_path, 3600); // 1 hour expiry
        
        if (error) {
          console.error('Error creating signed URL:', error);
          toast.error('Failed to load audio file');
          return;
        }
        
        setAudioUrl(data.signedUrl);
      } catch (error) {
        console.error('Error loading audio:', error);
        toast.error('Failed to load audio file');
      } finally {
        setLoadingAudio(false);
      }
    };

    loadAudioUrl();
  }, [item?.file_path]);

  // Load summary templates and existing summaries
  useEffect(() => {
    const loadSummaryData = async () => {
      if (!item?.id) return;

      try {
        // Load summary templates
        const { data: templatesData, error: templatesError } = await supabase
          .from('summary_templates')
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        if (templatesError) {
          console.warn('Could not load templates:', templatesError);
          // Set default templates if query fails
          setSummaryTemplates([
            { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Executive Summary', description: 'High-level overview', prompt_template: '' },
            { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Meeting Notes', description: 'Detailed notes', prompt_template: '' },
            { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Action Items', description: 'Extract tasks', prompt_template: '' }
          ]);
        } else {
          setSummaryTemplates(templatesData || []);
        }

        // Load existing summary requests
        const { data: requestsData, error: requestsError } = await supabase
          .from('summary_requests')
          .select('*')
          .eq('knowledge_item_id', item.id);

        if (requestsError) {
          console.warn('Could not load summary requests:', requestsError);
          setSummaryRequests([]);
        } else {
          // Get template names for the requests
          const requestsWithNames = (requestsData || []).map((request: any) => {
            const template = templatesData?.find((t: any) => t.id === request.template_id);
            return {
              ...request,
              template_name: template?.name || 'Unknown Template'
            };
          });
          setSummaryRequests(requestsWithNames);
        }
      } catch (error) {
        console.error('Error loading summary data:', error);
        // Set default templates if everything fails
        setSummaryTemplates([
          { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Executive Summary', description: 'High-level overview', prompt_template: '' },
          { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Meeting Notes', description: 'Detailed notes', prompt_template: '' },
          { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Action Items', description: 'Extract tasks', prompt_template: '' }
        ]);
        setSummaryRequests([]);
      }
    };

    loadSummaryData();
  }, [item?.id]);

  // Audio event handlers
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const generateSummary = async () => {
    if (!item?.id || !selectedTemplateId || !item.transcript_text) {
      toast.error('Please select a summary type');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      // Create summary request record
      const { data: summaryRequest, error: requestError } = await supabase
        .from('summary_requests')
        .insert({
          knowledge_item_id: item.id,
          template_id: selectedTemplateId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'processing'
        })
        .select()
        .single();

      if (requestError) {
        throw requestError;
      }

      // Call the summary generation edge function
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: {
          summaryRequestId: summaryRequest.id,
          transcript: item.transcript_text,
          templateId: selectedTemplateId
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Summary generated successfully');
      
      // Reload summary requests
      const { data: updatedRequestsData, error: updatedRequestsError } = await supabase
        .from('summary_requests')
        .select('*')
        .eq('knowledge_item_id', item.id);

      if (!updatedRequestsError && updatedRequestsData) {
        const requestsWithNames = updatedRequestsData.map((request: any) => {
          const template = summaryTemplates.find(t => t.id === request.template_id);
          return {
            ...request,
            template_name: template?.name || 'Unknown Template'
          };
        });
        setSummaryRequests(requestsWithNames);
      }

      setSelectedTemplateId('');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Template-specific functions
  const handleCopyToClipboard = async () => {
    if (!item.transcript_text) return;
    
    try {
      await navigator.clipboard.writeText(item.transcript_text);
      setCopySuccess(true);
      toast.success('Template content copied to clipboard');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownloadTemplate = () => {
    if (!item.transcript_text) return;
    
    const element = document.createElement('a');
    const file = new Blob([item.transcript_text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Template downloaded successfully');
  };

  if (!item) return null;

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="w-96 border-l border-border bg-background flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Item Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start gap-3 mb-3">
              <FileAudio size={20} className="text-primary mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-base leading-tight">{item.title}</h4>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Badge className={getStatusColor(item.processing_status)}>
                {item.processing_status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {item.content_type}
              </Badge>
            </div>
          </div>

          {/* Template Content Section */}
          {item.content_type === 'template' && item.transcript_text && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText size={16} />
                    Template Content
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCopyToClipboard}
                      disabled={!item.transcript_text}
                    >
                      {copySuccess ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                      {copySuccess ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDownloadTemplate}
                      disabled={!item.transcript_text}
                    >
                      <Download size={14} className="mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-md p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                    {item.transcript_text}
                  </pre>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {item.transcript_text.length} characters • {item.transcript_text.split('\n').length} lines
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audio Player & Controls */}
          {item.content_type === 'audio' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Audio Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingAudio ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="ml-2 text-sm">Loading audio...</span>
                  </div>
                ) : audioUrl ? (
                  <>
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                      preload="metadata"
                    />
                    
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={handlePlayPause}
                        disabled={!audioUrl}
                      >
                        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                        <span className="ml-2">{isPlaying ? 'Pause' : 'Play'}</span>
                      </Button>
                      <div className="text-sm text-muted-foreground">
                        {formatDuration(currentTime)} / {formatDuration(duration)}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Download size={14} className="mr-1" />
                        Download
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share2 size={14} className="mr-1" />
                        Share
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Audio file not available
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary Generation Section */}
          {item.transcript_text && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Generate Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choose summary type" />
                    </SelectTrigger>
                    <SelectContent>
                      {summaryTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={generateSummary}
                    disabled={!selectedTemplateId || isGeneratingSummary}
                    size="sm"
                  >
                    {isGeneratingSummary ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      'Generate'
                    )}
                  </Button>
                </div>
                
                {selectedTemplateId && (
                  <p className="text-xs text-muted-foreground">
                    {summaryTemplates.find(t => t.id === selectedTemplateId)?.description}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Existing Summaries */}
          {summaryRequests.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Generated Summaries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summaryRequests.map((request) => (
                  <div key={request.id} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{request.template_name}</span>
                      <Badge className={getStatusColor(request.status)} variant="secondary">
                        {request.status}
                      </Badge>
                    </div>
                    {request.summary_content && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {request.summary_content}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="font-medium text-muted-foreground">Category</div>
                  <div className="capitalize">{item.category.replace('_', ' ')}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Classification</div>
                  <div className="capitalize">{item.classification_level}</div>
                </div>
                {item.department && (
                  <div>
                    <div className="font-medium text-muted-foreground">Department</div>
                    <div className="capitalize">{item.department}</div>
                  </div>
                )}
                <div>
                  <div className="font-medium text-muted-foreground">Created</div>
                  <div>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</div>
                </div>
              </div>

              {item.audio_metadata && (
                <div className="pt-2 border-t">
                  <div className="font-medium text-muted-foreground text-sm mb-2">Audio Details</div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    {item.audio_metadata.size && (
                      <div>Size: {formatFileSize(item.audio_metadata.size)}</div>
                    )}
                    {item.audio_metadata.type && (
                      <div>Type: {item.audio_metadata.type}</div>
                    )}
                    {item.speaker_count && (
                      <div>Speakers: {item.speaker_count}</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcript */}
          {item.transcript_text && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Transcript</CardTitle>
                  <Button variant="ghost" size="sm">
                    <Edit2 size={14} className="mr-1" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {item.transcript_text}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Status for pending items */}
          {(item.processing_status === 'pending' || item.processing_status === 'processing') && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-sm text-muted-foreground">
                  {item.processing_status === 'processing' ? (
                    <>
                      <div className="animate-pulse mb-2">🎧</div>
                      <div>Transcribing audio...</div>
                      <div className="text-xs mt-1">This may take a few minutes</div>
                    </>
                  ) : (
                    <>
                      <div className="mb-2">⏳</div>
                      <div>Queued for processing</div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default KnowledgeItemDetailPane;

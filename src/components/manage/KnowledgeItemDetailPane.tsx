
import React from 'react';
import { X, Play, Pause, Download, Edit2, Share2, FileAudio, Clock, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KnowledgeItem } from '@/hooks/useKnowledgeItems';
import { formatDistanceToNow } from 'date-fns';

interface KnowledgeItemDetailPaneProps {
  item: KnowledgeItem | null;
  onClose: () => void;
}

const KnowledgeItemDetailPane = ({ item, onClose }: KnowledgeItemDetailPaneProps) => {
  const [isPlaying, setIsPlaying] = React.useState(false);

  if (!item) return null;

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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

          {/* Audio Player & Controls */}
          {item.content_type === 'audio' && item.file_path && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Audio Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    <span className="ml-2">{isPlaying ? 'Pause' : 'Play'}</span>
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    {formatDuration(item.audio_duration_seconds)}
                  </div>
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

          {/* AI Summary */}
          {item.ai_summary && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">AI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{item.ai_summary}</p>
              </CardContent>
            </Card>
          )}

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

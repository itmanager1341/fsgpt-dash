
import React, { useState, useRef } from 'react';
import { Upload, Mic, FileAudio, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCreateKnowledgeItem } from '@/hooks/useKnowledgeItems';

interface AudioUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId?: string;
}

const AudioUploadDialog = ({ open, onOpenChange, categoryId }: AudioUploadDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [classificationLevel, setClassificationLevel] = useState<'public' | 'internal' | 'confidential'>('internal');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createKnowledgeItem = useCreateKnowledgeItem();

  const acceptedTypes = [
    'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 
    'audio/webm', 'video/mp4', '.mp3', '.wav', '.mp4', '.m4a'
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file size (100MB limit)
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }
      
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        input.files = dataTransfer.files;
        handleFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.onerror = () => resolve(0);
      audio.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast.error('Please provide a file and title');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get audio duration
      const duration = await getAudioDuration(file);
      
      // Upload to storage - simulate progress since Supabase doesn't support onUploadProgress
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-audio')
        .upload(fileName, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      // Determine category with proper typing
      const categoryValue = (categoryId && ['company_resources', 'department_library', 'project_workspace', 'personal_collection'].includes(categoryId)) 
        ? categoryId as 'company_resources' | 'department_library' | 'project_workspace' | 'personal_collection'
        : 'personal_collection' as const;

      // Create knowledge item record
      const knowledgeItem = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || undefined,
        content_type: 'audio' as const,
        category: categoryValue,
        classification_level: classificationLevel,
        department: department || undefined,
        file_path: uploadData.path,
        processing_status: 'pending' as const,
        audio_duration_seconds: Math.round(duration),
        audio_metadata: {
          originalName: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        },
        tags: []
      };

      const createdItem = await createKnowledgeItem.mutateAsync(knowledgeItem);

      // Trigger transcription processing
      await supabase.functions.invoke('transcribe-audio', {
        body: { 
          filePath: uploadData.path,
          knowledgeItemId: createdItem.id
        }
      });

      toast.success('Audio file uploaded and transcription started!');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload audio file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setDepartment('');
    setClassificationLevel('internal');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileAudio size={20} />
            Upload Audio File
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Area */}
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {file ? (
              <div className="space-y-2">
                <FileAudio size={48} className="mx-auto text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="mt-2"
                >
                  <X size={16} className="mr-1" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload size={48} className="mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">Drop audio file here</p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse (MP3, WAV, MP4, M4A - Max 100MB)
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2"
                >
                  <Mic size={16} className="mr-2" />
                  Choose File
                </Button>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
            />
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Metadata Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter audio title"
                disabled={uploading}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the audio content"
                rows={3}
                disabled={uploading}
              />
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={department} onValueChange={setDepartment} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="strategy">Strategy</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="classification">Classification Level</Label>
              <Select 
                value={classificationLevel} 
                onValueChange={(value: 'public' | 'internal' | 'confidential') => setClassificationLevel(value)}
                disabled={uploading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="confidential">Confidential</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || !title.trim() || uploading}>
            {uploading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload & Transcribe'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AudioUploadDialog;

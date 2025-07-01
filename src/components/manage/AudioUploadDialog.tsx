
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SecureAudioUpload } from './SecureAudioUpload';
import { KnowledgeItem } from '@/types/knowledge';

interface AudioUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (item: Partial<KnowledgeItem>) => void;
}

const AudioUploadDialog = ({ open, onOpenChange, onUploadComplete }: AudioUploadDialogProps) => {
  const handleUploadComplete = (filePath: string, file: File) => {
    const knowledgeItem: Partial<KnowledgeItem> = {
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
      description: `Audio file uploaded: ${file.name}`,
      content_type: 'audio',
      category: 'personal_collection',
      classification_level: 'internal',
      file_path: filePath,
      processing_status: 'pending',
      audio_metadata: {
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      }
    };
    
    onUploadComplete(knowledgeItem);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Audio File</DialogTitle>
          <DialogDescription>
            Upload an audio file to add to your knowledge base. The audio will be automatically transcribed and processed.
          </DialogDescription>
        </DialogHeader>
        
        <SecureAudioUpload
          onUploadComplete={handleUploadComplete}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AudioUploadDialog;

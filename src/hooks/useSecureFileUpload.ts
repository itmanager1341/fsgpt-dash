
import { useState } from 'react';
import { validateFileUpload, logSecurityEvent } from '@/utils/security';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecureFileUploadOptions {
  bucket: string;
  maxSize?: number;
  allowedTypes?: string[];
  onSuccess?: (path: string) => void;
  onError?: (error: string) => void;
}

export const useSecureFileUpload = (options: SecureFileUploadOptions) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File): Promise<string | null> => {
    setUploading(true);
    setProgress(0);

    try {
      // Validate file
      const validation = validateFileUpload(file);
      if (!validation.isValid) {
        toast.error(validation.error);
        await logSecurityEvent('file_upload_validation_failed', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          error: validation.error
        });
        return null;
      }

      // Generate secure filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(options.bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      setProgress(100);
      toast.success('File uploaded successfully');
      
      await logSecurityEvent('file_upload_success', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storagePath: data.path
      });

      options.onSuccess?.(data.path);
      return data.path;

    } catch (error: any) {
      const errorMessage = error.message || 'Upload failed';
      toast.error(errorMessage);
      
      await logSecurityEvent('file_upload_error', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        error: errorMessage
      });

      options.onError?.(errorMessage);
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return {
    uploadFile,
    uploading,
    progress
  };
};

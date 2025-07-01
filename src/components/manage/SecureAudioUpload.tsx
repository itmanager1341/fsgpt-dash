
import React, { useState } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSecureFileUpload } from '@/hooks/useSecureFileUpload';
import { RateLimitWrapper } from '@/components/security/RateLimitWrapper';
import { validateFileUpload } from '@/utils/security';

interface SecureAudioUploadProps {
  onUploadComplete: (filePath: string, file: File) => void;
  onCancel: () => void;
}

export const SecureAudioUpload: React.FC<SecureAudioUploadProps> = ({
  onUploadComplete,
  onCancel
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { uploadFile, uploading, progress } = useSecureFileUpload({
    bucket: 'user-audio',
    onSuccess: (path) => {
      if (selectedFile) {
        onUploadComplete(path, selectedFile);
      }
    },
    onError: (error) => {
      setValidationError(error);
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file immediately
    const validation = validateFileUpload(file);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid file');
      setSelectedFile(null);
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await uploadFile(selectedFile);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium">Upload Audio File</p>
          <p className="text-sm text-gray-500">
            Select an audio file to upload (MP3, WAV, M4A, OGG, FLAC)
          </p>
          <p className="text-xs text-gray-400">Maximum file size: 100MB</p>
        </div>
        
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
          id="audio-upload"
          disabled={uploading}
        />
        
        <label
          htmlFor="audio-upload"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 cursor-pointer mt-4 disabled:opacity-50"
        >
          Select File
        </label>
      </div>

      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {selectedFile && !validationError && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(selectedFile.size)} • {selectedFile.type}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setValidationError(null);
              }}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onCancel} disabled={uploading}>
              Cancel
            </Button>
            <RateLimitWrapper
              limitKey="audio-upload"
              maxRequests={5}
              windowMs={300000} // 5 minutes
            >
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </RateLimitWrapper>
          </div>
        </div>
      )}
    </div>
  );
};

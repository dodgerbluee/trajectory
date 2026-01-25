/**
 * File Upload Component
 * Handles file selection and upload for measurement attachments
 */

import { useState, useRef, ChangeEvent } from 'react';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
}

function FileUpload({
  onUpload,
  accept = 'image/*,.pdf',
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size
    if (file.size > maxSize) {
      setError(`File too large. Maximum size: ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      return;
    }

    // Validate file type
    const acceptedTypes = accept.split(',').map((t) => t.trim());
    const isImage = acceptedTypes.includes('image/*') && file.type.startsWith('image/');
    const isPdf = acceptedTypes.includes('.pdf') && file.type === 'application/pdf';
    const isSpecificType = acceptedTypes.includes(file.type);

    if (!isImage && !isPdf && !isSpecificType) {
      setError('File type not allowed. Please upload an image or PDF.');
      return;
    }

    try {
      setUploading(true);
      await onUpload(file);
      // Clear the input so the same file can be uploaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="file-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        style={{ display: 'none' }}
      />
      
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || uploading}
        className="btn btn-secondary"
      >
        {uploading ? '📤 Uploading...' : '📎 Attach File'}
      </button>

      {error && <div className="upload-error">{error}</div>}
      
      <div className="upload-hint">
        Images (JPEG, PNG, GIF, WebP) or PDF • Max 10MB
      </div>
    </div>
  );
}

export default FileUpload;

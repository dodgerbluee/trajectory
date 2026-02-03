/**
 * File Upload Component
 * Handles file selection and upload for measurement attachments
 */

import { useState, useRef, ChangeEvent } from 'react';
import Button from './Button';
import styles from './FileUpload.module.css';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  multiple?: boolean;
}

function FileUpload({
  onUpload,
  accept = 'image/*,.pdf',
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  multiple = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Validate file size
    if (file.size > maxSize) {
      return `File "${file.name}" is too large. Maximum size: ${(maxSize / 1024 / 1024).toFixed(0)}MB`;
    }

    // Validate file type
    const acceptedTypes = accept.split(',').map((t) => t.trim());
    const isImage = acceptedTypes.includes('image/*') && file.type.startsWith('image/');
    const isPdf = acceptedTypes.includes('.pdf') && file.type === 'application/pdf';
    const isSpecificType = acceptedTypes.includes(file.type);

    if (!isImage && !isPdf && !isSpecificType) {
      return `File "${file.name}" type not allowed. Please upload an image or PDF.`;
    }

    return null;
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError(null);

    // Validate all files first
    const errors: string[] = [];
    files.forEach(file => {
      const error = validateFile(file);
      if (error) errors.push(error);
    });

    if (errors.length > 0) {
      setError(errors.join(' '));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setUploading(true);
      // Upload files sequentially to avoid overwhelming the server
      for (const file of files) {
        await onUpload(file);
      }
      // Clear the input so the same files can be uploaded again
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
    <div className={styles.root}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        multiple={multiple}
        style={{ display: 'none' }}
      />
      
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled || uploading}
        variant="secondary"
      >
        {uploading ? '📤 Uploading...' : '📎 Attach File'}
      </Button>

      {error && <div className={styles.uploadError}>{error}</div>}
      
      <div className={styles.uploadHint}>
        Images (JPEG, PNG, GIF, WebP) or PDF • Max 10MB
      </div>
    </div>
  );
}

export default FileUpload;

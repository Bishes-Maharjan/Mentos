import { useRef, useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  accept?: string;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export default function FileDropzone({
  onFileSelect,
  isUploading,
  accept = 'image/jpeg,image/png,image/webp',
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    if (file.size > MAX_SIZE) {
      toast.error('File too large. Maximum size is 10 MB.');
      return false;
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }
    return true;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        onFileSelect(file);
      }
    },
    [validateFile, onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isUploading) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [isUploading, handleFile]
  );

  const handleClick = useCallback(() => {
    if (!isUploading) {
      inputRef.current?.click();
    }
  }, [isUploading]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [handleFile]
  );

  const classes = [
    'dropzone',
    isDragging && 'dropzone--active',
    isUploading && 'dropzone--disabled',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={handleInputChange}
      />

      {isUploading ? (
        <div className="dropzone__processing">
          <LoadingSpinner size="lg" />
          <p className="dropzone__processing-text">
            Kaji is reading your receipt...
          </p>
          <p className="dropzone__subtitle">
            This may take a few seconds while our AI processes the image
          </p>
        </div>
      ) : (
        <>
          <Upload className="dropzone__icon" />
          <p className="dropzone__title">
            Drag & drop your receipt here
          </p>
          <p className="dropzone__subtitle">
            or click to browse · JPG, PNG, WebP · Max 10 MB
          </p>
        </>
      )}
    </div>
  );
}

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { LuCamera } from 'react-icons/lu';
import Button from './Button';
import cropStyles from './ImageCropUpload.module.css';
import {
  isHeic,
  prepareImageSource,
  releaseImageSource,
  cropToFile,
  type PreparedImageSource,
} from '@lib/image-crop';

export interface ImageCropUploadHandle {
  saveCrop: () => Promise<void>;
  cancel: () => void;
}

interface ImageCropUploadProps {
  onImageCropped: (croppedImage: File) => void;
  currentImageUrl?: string | null;
  disabled?: boolean;
  isInModal?: boolean;
}

const HEIC_EXT_RE = /\.(heic|heif)$/i;

const ImageCropUpload = forwardRef<ImageCropUploadHandle, ImageCropUploadProps>(
  ({ onImageCropped, currentImageUrl, disabled, isInModal }, ref) => {
  const [source, setSource] = useState<PreparedImageSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading photo…');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Release the cropper source object URL whenever it changes and on unmount.
  useEffect(() => {
    return () => releaseImageSource(source);
  }, [source]);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  useImperativeHandle(ref, () => ({
    saveCrop: handleSaveCrop,
    cancel: handleCancel,
  }));

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB.');
      setShowCropper(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    // Allow files that don't claim image/* MIME but have a HEIC extension —
    // some Android pickers report HEIC as application/octet-stream.
    if (!file.type.startsWith('image/') && !HEIC_EXT_RE.test(file.name)) {
      setError('Please select an image file.');
      setShowCropper(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoadingMessage(isHeic(file) ? 'Converting HEIC photo…' : 'Loading photo…');
    setLoading(true);
    setShowCropper(true);
    setSource(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);

    try {
      const prepared = await prepareImageSource(file);
      console.info('[ImageCropUpload] prepared', {
        file: { name: file.name, type: file.type, size: file.size },
        decoded: { width: prepared.width, height: prepared.height },
      });
      setSource(prepared);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error preparing image';
      console.error('[ImageCropUpload] prepareImageSource failed', err, {
        file: { name: file.name, type: file.type, size: file.size },
      });
      setError(message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveCrop = async () => {
    if (!source || !croppedAreaPixels) return;
    try {
      const croppedImage = await cropToFile(source, croppedAreaPixels);
      onImageCropped(croppedImage);
      setPendingPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(croppedImage);
      });
      setShowCropper(false);
      setSource(null);
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('[ImageCropUpload] crop failed', err);
      setError(err instanceof Error ? err.message : 'Failed to crop image');
    }
  };

  const handleCancel = () => {
    setShowCropper(false);
    setSource(null);
    setError(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={cropStyles.root}>
      {!showCropper ? (
        <div className={cropStyles.uploadSection}>
          {/* Avatar IS the trigger: click anywhere on it to change photo.
              Keyboard-accessible because it's a real <button>. */}
          <button
            type="button"
            className={cropStyles.avatarTrigger}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            data-empty={!(pendingPreviewUrl || currentImageUrl) || undefined}
            aria-label={currentImageUrl ? 'Change avatar' : 'Upload avatar'}
            title={currentImageUrl ? 'Change avatar' : 'Upload avatar'}
          >
            {(pendingPreviewUrl || currentImageUrl) && (
              <img src={pendingPreviewUrl || currentImageUrl || undefined} alt="" />
            )}
            <span className={cropStyles.avatarOverlay} aria-hidden="true">
              <LuCamera />
              {currentImageUrl ? 'Change' : 'Add photo'}
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFileChange}
            disabled={disabled}
            style={{ display: 'none' }}
            id="avatar-upload"
          />

          <p className={cropStyles.uploadHint}>
            Max 10MB. Images will be cropped to a circle.
          </p>
        </div>
      ) : (
        <div className={cropStyles.cropperModal}>
          <div className={cropStyles.cropperContainer}>
            <div className={cropStyles.cropperHeader}>
              <h3>Adjust Your Avatar</h3>
              <p>Move and zoom to select the area you want</p>
            </div>

            <div className={cropStyles.cropperArea}>
              {loading && (
                <div className={cropStyles.cropperLoading} role="status" aria-live="polite">
                  <span className={cropStyles.cropperSpinner} aria-hidden="true" />
                  {loadingMessage}
                </div>
              )}
              {!loading && error && (
                <div className={cropStyles.cropperError} role="alert">
                  {error}
                </div>
              )}
              {!loading && !error && source && (
                <Cropper
                  image={source.url}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>

            <div className={cropStyles.cropperControls}>
              <div className={cropStyles.zoomControl}>
                <label htmlFor="zoom-slider">Zoom</label>
                <input
                  id="zoom-slider"
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className={cropStyles.zoomSlider}
                  disabled={!source || !!error || loading}
                />
              </div>

              {!isInModal && (
                <div className={cropStyles.cropperActions}>
                  <Button type="button" onClick={handleCancel} variant="secondary">
                    {error ? 'Close' : 'Cancel'}
                  </Button>
                  <Button type="button" onClick={handleSaveCrop} disabled={!source || !!error || loading}>
                    Save Avatar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
);

ImageCropUpload.displayName = 'ImageCropUpload';

export default ImageCropUpload;

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { LuCamera } from 'react-icons/lu';
import Button from './Button';
import cropStyles from './ImageCropUpload.module.css';

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

// Cap the source dimensions before handing the image to the cropper. Many
// Android devices cap canvas surfaces around 4096px and fail silently (black
// image) right near that limit. 2048px is plenty for an avatar — the user can
// still zoom in the cropper — and stays well under every device's hard ceiling.
const MAX_SOURCE_DIM = 2048;
const HEIC_EXT_RE = /\.(heic|heif)$/i;

function isUnsupportedFormat(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  // Android Chrome cannot decode HEIC/HEIF — the picker accepts the file but the
  // resulting <img> renders blank. Reject up front with a clear message.
  return t === 'image/heic' || t === 'image/heif' || HEIC_EXT_RE.test(file.name);
}

/**
 * Decode the picked file with EXIF orientation applied, downscale if it exceeds
 * the mobile-safe canvas budget, and re-encode to JPEG. Returns both an object
 * URL for the cropper UI and the oriented bitmap so the final crop can draw
 * from the same source without re-decoding the file.
 */
async function prepareSource(file: File): Promise<{ url: string; bitmap: ImageBitmap }> {
  const decoded = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const maxDim = Math.max(decoded.width, decoded.height);
  const scale = maxDim > MAX_SOURCE_DIM ? MAX_SOURCE_DIM / maxDim : 1;
  const width = Math.round(decoded.width * scale);
  const height = Math.round(decoded.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    decoded.close?.();
    throw new Error('Canvas 2D context unavailable');
  }
  ctx.drawImage(decoded, 0, 0, width, height);
  decoded.close?.();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode image'))),
      'image/jpeg',
      0.92,
    );
  });
  const bitmap = await createImageBitmap(blob);
  return { url: URL.createObjectURL(blob), bitmap };
}

const ImageCropUpload = forwardRef<ImageCropUploadHandle, ImageCropUploadProps>(
  ({ onImageCropped, currentImageUrl, disabled, isInModal }, ref) => {
  const [source, setSource] = useState<{ url: string; bitmap: ImageBitmap } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Release the cropper source (object URL + bitmap) whenever it changes and on unmount.
  useEffect(() => {
    return () => {
      if (source) {
        URL.revokeObjectURL(source.url);
        source.bitmap.close?.();
      }
    };
  }, [source]);

  // Revoke pending preview blob URL on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  // Expose crop and cancel methods to parent via ref
  useImperativeHandle(ref, () => ({
    saveCrop: handleSaveCrop,
    cancel: handleCancel
  }));

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (isUnsupportedFormat(file)) {
      alert(
        'HEIC/HEIF images aren’t supported on Android. Switch your camera to JPEG, or pick a different photo.',
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const prepared = await prepareSource(file);
      setSource(prepared);
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (err) {
      console.error('Failed to prepare image:', err);
      alert(
        'Couldn’t read that image. It may be in an unsupported format or too large for this device.',
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const createCroppedImage = async (): Promise<File> => {
    if (!source || !croppedAreaPixels) {
      throw new Error('No image to crop');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      source.bitmap,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSaveCrop = async () => {
    try {
      const croppedImage = await createCroppedImage();
      onImageCropped(croppedImage);
      // Show the new cropped image in the preview before user clicks modal "Save Avatar"
      setPendingPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(croppedImage);
      });
      setShowCropper(false);
      setSource(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Failed to crop image');
    }
  };

  const handleCancel = () => {
    setShowCropper(false);
    setSource(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
            accept="image/*"
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
              {source && (
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
                />
              </div>

              {!isInModal && (
                <div className={cropStyles.cropperActions}>
                  <Button type="button" onClick={handleCancel} variant="secondary">
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSaveCrop}>
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

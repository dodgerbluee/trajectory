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

// Cap source dimensions before handing the image to the cropper. Many Android
// devices cap canvas surfaces around 4096px and fail silently (black image)
// near that limit. 2048px is plenty for an avatar and stays well under every
// device's hard ceiling.
const MAX_SOURCE_DIM = 2048;
const HEIC_EXT_RE = /\.(heic|heif)$/i;

function isUnsupportedFormat(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  return t === 'image/heic' || t === 'image/heif' || HEIC_EXT_RE.test(file.name);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image element failed to decode'));
    img.src = url;
  });
}

interface PreparedSource {
  url: string;
  image: HTMLImageElement;
  width: number;
  height: number;
}

/**
 * Decode the picked file via Image element (universally compatible across
 * Android browsers), validate dimensions, and downscale through canvas if it
 * exceeds the mobile-safe size budget. Returns an object URL for the cropper
 * UI plus the decoded HTMLImageElement so the final crop drawImage uses the
 * same source. Modern browsers (Chrome 81+, Safari 13.1+) auto-apply EXIF
 * orientation when drawing an Image element to canvas, so rotation is handled.
 */
async function prepareSource(file: File): Promise<PreparedSource> {
  const sourceUrl = URL.createObjectURL(file);
  let image: HTMLImageElement;
  try {
    image = await loadImage(sourceUrl);
  } catch (err) {
    URL.revokeObjectURL(sourceUrl);
    throw new Error(`Couldn't decode this image (${file.type || 'unknown type'}). Try a JPEG or PNG.`);
  }

  const naturalW = image.naturalWidth;
  const naturalH = image.naturalHeight;
  if (!naturalW || !naturalH) {
    URL.revokeObjectURL(sourceUrl);
    throw new Error('Image decoded with 0 dimensions — the format may be unsupported on this device.');
  }

  const maxDim = Math.max(naturalW, naturalH);
  if (maxDim <= MAX_SOURCE_DIM) {
    return { url: sourceUrl, image, width: naturalW, height: naturalH };
  }

  // Downscale via canvas. drawImage from an Image element bakes EXIF
  // orientation into the output on modern browsers.
  const scale = MAX_SOURCE_DIM / maxDim;
  const w = Math.round(naturalW * scale);
  const h = Math.round(naturalH * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(sourceUrl);
    throw new Error('Canvas 2D context unavailable on this device.');
  }
  ctx.drawImage(image, 0, 0, w, h);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas failed to encode (out of memory?)'))),
      'image/jpeg',
      0.92,
    );
  });

  URL.revokeObjectURL(sourceUrl);

  const downscaledUrl = URL.createObjectURL(blob);
  const downscaledImage = await loadImage(downscaledUrl);
  return { url: downscaledUrl, image: downscaledImage, width: w, height: h };
}

const ImageCropUpload = forwardRef<ImageCropUploadHandle, ImageCropUploadProps>(
  ({ onImageCropped, currentImageUrl, disabled, isInModal }, ref) => {
  const [source, setSource] = useState<PreparedSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Release the cropper source object URL whenever it changes and on unmount.
  useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source.url);
    };
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
    if (!file.type.startsWith('image/') && !HEIC_EXT_RE.test(file.name)) {
      setError('Please select an image file.');
      setShowCropper(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (isUnsupportedFormat(file)) {
      setError('HEIC/HEIF images aren’t supported on Android. Switch your camera to JPEG, or pick a different photo.');
      setShowCropper(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const prepared = await prepareSource(file);
      console.info('[ImageCropUpload] prepared', {
        file: { name: file.name, type: file.type, size: file.size },
        decoded: { width: prepared.width, height: prepared.height },
      });
      setSource(prepared);
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error preparing image';
      console.error('[ImageCropUpload] prepareSource failed', err, {
        file: { name: file.name, type: file.type, size: file.size },
      });
      setError(message);
      setShowCropper(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const createCroppedImage = async (): Promise<File> => {
    if (!source || !croppedAreaPixels) {
      throw new Error('No image to crop');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      source.image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.95,
      );
    });
  };

  const handleSaveCrop = async () => {
    try {
      const croppedImage = await createCroppedImage();
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
              {error && (
                <div className={cropStyles.cropperError} role="alert">
                  {error}
                </div>
              )}
              {!error && source && (
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
                  disabled={!source || !!error}
                />
              </div>

              {!isInModal && (
                <div className={cropStyles.cropperActions}>
                  <Button type="button" onClick={handleCancel} variant="secondary">
                    {error ? 'Close' : 'Cancel'}
                  </Button>
                  <Button type="button" onClick={handleSaveCrop} disabled={!source || !!error}>
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

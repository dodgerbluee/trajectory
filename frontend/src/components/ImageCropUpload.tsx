import { useState, useCallback, useRef } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import Button from './Button';

interface ImageCropUploadProps {
  onImageCropped: (croppedImage: File) => void;
  currentImageUrl?: string | null;
  disabled?: boolean;
}

function ImageCropUpload({ onImageCropped, currentImageUrl, disabled }: ImageCropUploadProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image must be less than 10MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setShowCropper(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(file);
    }
  };

  const createCroppedImage = async (): Promise<File> => {
    if (!imageSrc || !croppedAreaPixels) {
      throw new Error('No image to crop');
    }

    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Set canvas size to the cropped area
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    // Draw the cropped image
    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    // Convert canvas to blob then to file
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
      setShowCropper(false);
      setImageSrc(null);
      // Reset file input
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
    setImageSrc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="image-crop-upload">
      {!showCropper ? (
        <div className="upload-section">
          {currentImageUrl && (
            <div className="current-avatar-preview">
              <img src={currentImageUrl} alt="Current avatar" />
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled}
            style={{ display: 'none' }}
            id="avatar-upload"
          />
          
          <label htmlFor="avatar-upload">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              variant="secondary"
            >
              📷 {currentImageUrl ? 'Change Avatar' : 'Upload Avatar'}
            </Button>
          </label>
          
          <p className="upload-hint">
            Max 10MB. Images will be cropped to a circle.
          </p>
        </div>
      ) : (
        <div className="cropper-modal">
          <div className="cropper-container">
            <div className="cropper-header">
              <h3>Adjust Your Avatar</h3>
              <p>Move and zoom to select the area you want</p>
            </div>
            
            <div className="cropper-area">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
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
            
            <div className="cropper-controls">
              <div className="zoom-control">
                <label htmlFor="zoom-slider">Zoom</label>
                <input
                  id="zoom-slider"
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="zoom-slider"
                />
              </div>
              
              <div className="cropper-actions">
                <Button type="button" onClick={handleCancel} variant="secondary">
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveCrop}>
                  Save Avatar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to create an image element from a URL
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });
}

export default ImageCropUpload;

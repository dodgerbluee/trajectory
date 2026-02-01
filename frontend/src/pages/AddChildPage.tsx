import { useState, FormEvent } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { FaMars, FaVenus } from 'react-icons/fa';
import { childrenApi, ApiClientError } from '../lib/api-client';
import { validateChildForm, getTodayDate } from '../lib/validation';
import type { Gender } from '../types/api';
import Card from '../components/Card';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Notification from '../components/Notification';
import ImageCropUpload from '../components/ImageCropUpload';
import ChildAvatar from '../components/ChildAvatar';

function AddChildPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const familyIdFromState = (location.state as { familyId?: number } | null)?.familyId;
  const familyIdFromQuery = searchParams.get('family_id');
  const familyId = familyIdFromState ?? (familyIdFromQuery ? parseInt(familyIdFromQuery, 10) : undefined);
  const familyIdValid = familyId != null && !Number.isNaN(familyId) && familyId > 0 ? familyId : undefined;
  const [formData, setFormData] = useState({
    name: '',
    date_of_birth: getTodayDate(),
    gender: 'male' as Gender,
    notes: '',
    due_date: '',
    birth_weight: '',
    birth_weight_ounces: '',
    birth_height: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleImageCropped = (croppedFile: File) => {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarFile(croppedFile);
    setAvatarPreviewUrl(URL.createObjectURL(croppedFile));
    setErrors((e) => ({ ...e, avatar: '' }));
    setShowAvatarEditor(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validation = validateChildForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const response = await childrenApi.create({
        ...(familyIdValid != null && { family_id: familyIdValid }),
        name: formData.name.trim(),
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        notes: formData.notes.trim() || undefined,
        due_date: formData.due_date || null,
        birth_weight: formData.birth_weight ? parseFloat(formData.birth_weight) : null,
        birth_weight_ounces: formData.birth_weight_ounces && formData.birth_weight_ounces.trim() !== ''
          ? (() => {
              const parsed = parseInt(formData.birth_weight_ounces, 10);
              return isNaN(parsed) ? null : parsed;
            })()
          : null,
        birth_height: formData.birth_height ? parseFloat(formData.birth_height) : null,
      });

      if (avatarFile) {
        try {
          await childrenApi.uploadAvatar(response.data.id, avatarFile);
        } catch (avatarError) {
          console.error('Failed to upload avatar:', avatarError);
        }
      }

      setNotification({
        message: `${formData.name} added successfully!`,
        type: 'success',
      });

      const fromOnboarding = (location.state as { fromOnboarding?: boolean } | null)?.fromOnboarding;
      setTimeout(() => {
        if (fromOnboarding) {
          navigate('/welcome', { state: { step: 4 }, replace: true });
        } else {
          navigate(`/children/${response.data.id}`);
        }
      }, 1000);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to add child', type: 'error' });
      }
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    const fromOnboarding = (location.state as { fromOnboarding?: boolean } | null)?.fromOnboarding;
    if (fromOnboarding) navigate('/welcome', { state: { step: 3 }, replace: true });
    else navigate(-1);
  };

  return (
    <div className="modal-overlay" onClick={() => !submitting && handleClose()}>
      <div
        className="modal-content card"
        onClick={(e) => e.stopPropagation()}
      >
          <div className="modal-header add-child-modal-header">
            <h2>Add Child</h2>
            <button
              type="button"
              onClick={handleClose}
              className="modal-close"
              disabled={submitting}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {notification && (
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          )}

          <form onSubmit={handleSubmit} className="form add-child-form">
            {/* Top row: Avatar left, Name right */}
            <div className="add-child-top-row">
              <div className="add-child-avatar-wrap">
                <button
                  type="button"
                  onClick={() => setShowAvatarEditor(true)}
                  className="overview-avatar-button add-child-avatar-button"
                  title="Click to change photo"
                  disabled={submitting}
                >
                  {avatarPreviewUrl ? (
                    <img
                      src={avatarPreviewUrl}
                      alt="New avatar"
                      className="add-child-avatar-img"
                    />
                  ) : (
                    <ChildAvatar
                      avatar={null}
                      gender={formData.gender}
                      alt="Default avatar"
                      className="add-child-avatar-img"
                    />
                  )}
                  <div className="overview-avatar-overlay add-child-avatar-overlay">
                    <span className="overview-avatar-edit-icon">✏️</span>
                  </div>
                </button>
                <p className="add-child-avatar-hint">Tap to change photo</p>
              </div>
              <FormField
                label="Name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
                required
                placeholder="Child's name"
                disabled={submitting}
              />
            </div>

            {/* Second row: DOB and Gender each 1/2 */}
            <div className="add-child-row add-child-row-half">
              <FormField
                label="Date of Birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                error={errors.date_of_birth}
                required
                max={getTodayDate()}
                disabled={submitting}
              />
              <div className="form-field add-child-gender-field">
                <label className="form-label.gender">
                  Gender <span className="required">*</span>
                </label>
                <div className="add-child-gender-toggle" role="group" aria-label="Gender">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'male' })}
                    className={`add-child-gender-option ${formData.gender === 'male' ? 'selected' : ''}`}
                    disabled={submitting}
                  >
                    <FaMars className="add-child-gender-option-icon" aria-hidden />
                    <span>Male</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'female' })}
                    className={`add-child-gender-option ${formData.gender === 'female' ? 'selected' : ''}`}
                    disabled={submitting}
                  >
                    <FaVenus className="add-child-gender-option-icon" aria-hidden />
                    <span>Female</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Birth details: Due Date, Weight, Height on one row */}
            <h3 className="add-child-section-title">Birth details</h3>
            <div className="add-child-birth-row">
              <FormField
                label="Due Date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                max={getTodayDate()}
                disabled={submitting}
              />
              <div className="add-child-number-wrap">
                <label className="form-label">Birth Weight</label>
                <div className="add-child-lb-oz">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.birth_weight}
                    onChange={(e) => setFormData({ ...formData, birth_weight: e.target.value })}
                    placeholder="7"
                    min="0"
                    disabled={submitting}
                    className="form-input input-no-spinner"
                  />
                  <span className="add-child-unit">lb</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.birth_weight_ounces}
                    onChange={(e) => setFormData({ ...formData, birth_weight_ounces: e.target.value })}
                    placeholder="8"
                    min="0"
                    max="15"
                    disabled={submitting}
                    className="form-input input-no-spinner"
                  />
                  <span className="add-child-unit">oz</span>
                </div>
              </div>
              <div className="add-child-number-wrap">
                <label className="form-label">Birth Height</label>
                <div className="add-child-height-in">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={formData.birth_height}
                    onChange={(e) => setFormData({ ...formData, birth_height: e.target.value })}
                    placeholder="20"
                    min="0"
                    step="0.1"
                    disabled={submitting}
                    className="form-input input-no-spinner"
                  />
                  <span className="add-child-unit">in</span>
                </div>
              </div>
            </div>

            <div className="add-child-notes-wrap">
              <FormField
                label="Notes"
                type="textarea"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
                rows={2}
                disabled={submitting}
              />
            </div>

            <div className="form-actions add-child-actions">
              <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Child'}
              </Button>
            </div>
          </form>
      </div>

      {/* Avatar editor modal */}
      {showAvatarEditor && (
        <div
          className="modal-overlay add-child-avatar-modal-overlay"
          style={{ zIndex: 1001 }}
          onClick={() => setShowAvatarEditor(false)}
        >
            <Card onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Change photo</h2>
                <button
                  type="button"
                  onClick={() => setShowAvatarEditor(false)}
                  className="modal-close"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <ImageCropUpload
                  onImageCropped={handleImageCropped}
                  currentImageUrl={avatarPreviewUrl ?? undefined}
                  disabled={false}
                />
              </div>
            </Card>
        </div>
      )}
    </div>
  );
}

export default AddChildPage;

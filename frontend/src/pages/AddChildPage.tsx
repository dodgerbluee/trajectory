import { useState, FormEvent } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { FaMars, FaVenus } from 'react-icons/fa';
import { childrenApi, ApiClientError } from '../lib/api-client';
import { useOnboarding } from '../contexts/OnboardingContext';
import { validateChildForm, getTodayDate } from '../lib/validation';
import type { Gender } from '../types/api';
import Card from '../shared/components/Card';
import FormField from '../shared/components/FormField';
import formFieldStyles from '../shared/components/FormField.module.css';
import Button from '../shared/components/Button';
import Notification from '../shared/components/Notification';
import ImageCropUpload from '../shared/components/ImageCropUpload';
import { ChildAvatar } from '../features/children';
import modalStyles from '../shared/components/Modal.module.css';
import styles from './AddChildPage.module.css';

function AddChildPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const onboarding = useOnboarding();
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

      setTimeout(() => {
        if (fromOnboarding && onboarding) {
          onboarding.reportChildAdded(response.data.id);
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

  const fromOnboarding = (location.state as { fromOnboarding?: boolean } | null)?.fromOnboarding;

  const handleClose = () => {
    if (fromOnboarding) navigate('/', { replace: true, state: { tab: 'family' } });
    else navigate(-1);
  };

  return (
    <div
      className={modalStyles.overlay}
      onClick={() => !fromOnboarding && !submitting && handleClose()}
    >
      <div
        className={`${modalStyles.content} ${modalStyles.contentCard}`}
        onClick={(e) => e.stopPropagation()}
      >
          <div className={`${modalStyles.header} ${styles.header}`}>
            <h2>Add Child</h2>
            <button
              type="button"
              onClick={handleClose}
              className={modalStyles.close}
              disabled={submitting || fromOnboarding}
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

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Top section: Avatar left, Name/DOB/Gender right */}
            <div className={styles.topRow}>
              <div className={styles.avatarWrap}>
                <button
                  type="button"
                  onClick={() => setShowAvatarEditor(true)}
                  className={styles.avatarButton}
                  title="Click to change photo"
                  disabled={submitting}
                >
                  {avatarPreviewUrl ? (
                    <img
                      src={avatarPreviewUrl}
                      alt="New avatar"
                      className={styles.avatarImg}
                    />
                  ) : (
                    <ChildAvatar
                      avatar={null}
                      gender={formData.gender}
                      alt="Default avatar"
                      className={styles.avatarImg}
                    />
                  )}
                  <div className={styles.avatarOverlay}>
                    <span className={styles.avatarEditIcon} aria-hidden>✏️</span>
                  </div>
                </button>
                <p className={styles.avatarHint}>Tap to change photo</p>
              </div>
              <div className={styles.nameAndDetails}>
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
                <div className={`${styles.row} ${styles.rowHalf}`}>
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
                  <div className={`${formFieldStyles.root} ${styles.genderField}`}>
                    <label className={formFieldStyles.label}>
                      Gender <span className={formFieldStyles.requiredIndicator}>*</span>
                    </label>
                    <div className={styles.genderToggle} role="group" aria-label="Gender">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: 'male' })}
                        className={`${styles.genderOption} ${formData.gender === 'male' ? styles.selected : ''}`}
                        disabled={submitting}
                      >
                        <FaMars className={styles.genderOptionIcon} aria-hidden />
                        <span>Male</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: 'female' })}
                        className={`${styles.genderOption} ${formData.gender === 'female' ? styles.selected : ''}`}
                        disabled={submitting}
                      >
                        <FaVenus className={styles.genderOptionIcon} aria-hidden />
                        <span>Female</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Birth details: Due Date, Weight, Height on one row */}
            <h3 className={styles.sectionTitle}>Birth details</h3>
            <div className={styles.birthRow}>
              <FormField
                label="Due Date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                max={getTodayDate()}
                disabled={submitting}
              />
              <div className={styles.numberWrap}>
                <label className={formFieldStyles.label}>Birth Weight</label>
                <div className={styles.lbOz}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.birth_weight}
                    onChange={(e) => setFormData({ ...formData, birth_weight: e.target.value })}
                    placeholder="7"
                    min="0"
                    disabled={submitting}
                    className={`form-input ${styles.inputNoSpinner}`}
                  />
                  <span className={styles.unit}>lb</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.birth_weight_ounces}
                    onChange={(e) => setFormData({ ...formData, birth_weight_ounces: e.target.value })}
                    placeholder="8"
                    min="0"
                    max="15"
                    disabled={submitting}
                    className={`form-input ${styles.inputNoSpinner}`}
                  />
                  <span className={styles.unit}>oz</span>
                </div>
              </div>
              <div className={styles.numberWrap}>
                <label className={formFieldStyles.label}>Birth Height</label>
                <div className={styles.heightIn}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={formData.birth_height}
                    onChange={(e) => setFormData({ ...formData, birth_height: e.target.value })}
                    placeholder="20"
                    min="0"
                    step="0.1"
                    disabled={submitting}
                    className={`form-input ${styles.inputNoSpinner}`}
                  />
                  <span className={styles.unit}>in</span>
                </div>
              </div>
            </div>

            <div className={styles.notesWrap}>
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

            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting || fromOnboarding}>
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
          className={`${modalStyles.overlay} ${styles.avatarModalOverlay}`}
          style={{ zIndex: 1001 }}
          onClick={() => setShowAvatarEditor(false)}
        >
            <Card onClick={(e) => e.stopPropagation()}>
              <div className={modalStyles.header}>
                <h2>Change photo</h2>
                <button
                  type="button"
                  onClick={() => setShowAvatarEditor(false)}
                  className={modalStyles.close}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className={modalStyles.body}>
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

import { FormEvent, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { peopleApi, ApiClientError } from '@lib/api-client';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { getTodayDate } from '@lib/validation';
import FormField, { FormFieldGroup } from '@shared/components/FormField';
import Button from '@shared/components/Button';
import Notification from '@shared/components/Notification';
import ImageCropUpload from '@shared/components/ImageCropUpload';
import {
  GenderToggle,
  BirthWeightInput,
  BirthHeightInput,
} from '@features/people/components';
import { usePersonFormState } from '@features/people/hooks/usePersonFormState';
import modalStyles from '@shared/components/Modal.module.css';
import styles from './AddPersonPage.module.css';

function AddPersonPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const onboarding = useOnboarding();
  const [searchParams] = useSearchParams();
  const familyIdFromState = (location.state as { familyId?: number } | null)?.familyId;
  const familyIdFromQuery = searchParams.get('family_id');
  const familyId = familyIdFromState ?? (familyIdFromQuery ? parseInt(familyIdFromQuery, 10) : undefined);
  const familyIdValid = familyId != null && !Number.isNaN(familyId) && familyId > 0 ? familyId : undefined;
  const fromOnboarding = (location.state as { fromOnboarding?: boolean } | null)?.fromOnboarding;

  const {
    formData,
    updateField,
    errors,
    clearError,
    validate,
    toCreatePayload,
  } = usePersonFormState();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleImageCropped = (croppedFile: File) => {
    setAvatarFile(croppedFile);
    clearError('avatar');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;
    setSubmitting(true);

    try {
      const response = await peopleApi.create(
        toCreatePayload({ family_id: familyIdValid }),
      );

      if (avatarFile) {
        try {
          await peopleApi.uploadAvatar(response.data.id, avatarFile);
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
          onboarding.reportPersonAdded(response.data.id);
        } else {
          navigate(`/people/${response.data.id}`);
        }
      }, 1000);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to add person', type: 'error' });
      }
      setSubmitting(false);
    }
  };

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
          <h2>Add Person</h2>
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
          {/* Avatar (left) + Name & DOB (right) */}
          <div className={styles.topRow}>
            <div className={styles.avatarWrap}>
              <ImageCropUpload
                onImageCropped={handleImageCropped}
                disabled={submitting}
              />
              <p className={styles.avatarHint}>Tap to change photo</p>
            </div>
            <div className={styles.nameAndDetails}>
              <div className={styles.pairRowNameGender}>
                <FormField
                  label="Name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  error={errors.name}
                  required
                  placeholder="Person's name"
                  disabled={submitting}
                />
                <FormFieldGroup label="Gender" required>
                  <GenderToggle
                    value={formData.gender}
                    onChange={(g) => updateField('gender', g)}
                    disabled={submitting}
                  />
                </FormFieldGroup>
              </div>
            </div>
          </div>

          {/* Date of Birth + Due Date */}
          <div className={styles.pairRow}>
            <FormField
              label="Date of Birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => updateField('date_of_birth', e.target.value)}
              error={errors.date_of_birth}
              required
              max={getTodayDate()}
              disabled={submitting}
            />
            <FormField
              label="Due Date"
              type="date"
              value={formData.due_date}
              onChange={(e) => updateField('due_date', e.target.value)}
              max={getTodayDate()}
              disabled={submitting}
            />
          </div>

          {/* Birth Weight + Birth Height */}
          <div className={styles.pairRow}>
            <BirthWeightInput
              pounds={formData.birth_weight}
              ounces={formData.birth_weight_ounces}
              onPoundsChange={(v) => updateField('birth_weight', v)}
              onOuncesChange={(v) => updateField('birth_weight_ounces', v)}
              disabled={submitting}
            />
            <BirthHeightInput
              value={formData.birth_height}
              onChange={(v) => updateField('birth_height', v)}
              disabled={submitting}
            />
          </div>

          <div className={styles.notesWrap}>
            <FormField
              label="Notes"
              type="textarea"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Optional notes"
              rows={2}
              disabled={submitting}
            />
          </div>

          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={submitting || fromOnboarding}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Person'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPersonPage;

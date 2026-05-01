import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { LuCheck, LuX } from 'react-icons/lu';
import { peopleApi, ApiClientError } from '@lib/api-client';
import { getTodayDate } from '@lib/validation';
import type { Person } from '@shared/types/api';
import Card from '@shared/components/Card';
import FormField, { FormFieldGroup } from '@shared/components/FormField';
import Notification from '@shared/components/Notification';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import ImageCropUpload from '@shared/components/ImageCropUpload';
import {
  GenderToggle,
  BirthWeightInput,
  BirthHeightInput,
} from '@features/people/components';
import {
  personFormDataFromPerson,
  usePersonFormState,
} from '@features/people/hooks/usePersonFormState';
import pageLayout from '@shared/styles/page-layout.module.css';
import detailLayout from '@shared/styles/visit-detail-layout.module.css';
import styles from './EditPersonPage.module.css';

function EditPersonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    formData,
    updateField,
    reset,
    errors,
    clearError,
    validate,
    toUpdatePayload,
  } = usePersonFormState();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    loadChild();
  }, [id]);

  const loadChild = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setLoadError(null);
      const response = await peopleApi.getById(parseInt(id));
      setPerson(response.data);
      reset(personFormDataFromPerson(response.data));
      if (response.data.avatar) {
        setCurrentAvatarUrl(peopleApi.getAvatarUrl(response.data.avatar));
      } else {
        setCurrentAvatarUrl(peopleApi.getDefaultAvatarUrl(response.data.gender));
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        setLoadError(error.message);
      } else {
        setLoadError('Failed to load person');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageCropped = (croppedFile: File) => {
    setAvatarFile(croppedFile);
    clearError('avatar');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!id) return;

    setSubmitting(true);

    try {
      await peopleApi.update(parseInt(id), toUpdatePayload());

      if (avatarFile) {
        try {
          await peopleApi.uploadAvatar(parseInt(id), avatarFile);
        } catch (avatarError) {
          console.error('Failed to upload avatar:', avatarError);
        }
      }

      setNotification({ message: 'Person updated successfully!', type: 'success' });
      setTimeout(() => navigate(`/people/${id}`), 1000);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to update person', type: 'error' });
      }
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading person..." />;
  if (loadError) return <ErrorMessage message={loadError} onRetry={loadChild} />;
  if (!person) return <ErrorMessage message="Person not found" />;

  return (
    <div className={pageLayout.pageContainer}>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={detailLayout.detailHeader}>
            <Link to={`/people/${id}`} className={pageLayout.breadcrumb}>
              ← Back to {person.name}
            </Link>
            <div className={detailLayout.iconActions}>
              <button
                type="submit"
                className={`${detailLayout.iconAction} ${detailLayout.iconActionPrimary}`}
                disabled={submitting}
                title={submitting ? 'Saving…' : 'Save'}
                aria-label={submitting ? 'Saving' : 'Save'}
              >
                <LuCheck aria-hidden />
              </button>
              <Link
                to={`/people/${id}`}
                className={detailLayout.iconAction}
                title="Cancel"
                aria-label="Cancel"
                aria-disabled={submitting || undefined}
              >
                <LuX aria-hidden />
              </Link>
            </div>
          </div>

          <h1 className={detailLayout.headerTitle}>Edit {person.name}</h1>

          <div className={styles.avatarSection}>
            <ImageCropUpload
              onImageCropped={handleImageCropped}
              currentImageUrl={currentAvatarUrl}
              disabled={submitting}
            />
            {errors.avatar && <span className={styles.formError}>{errors.avatar}</span>}
          </div>

          {/* Name + Gender */}
          <div className={styles.pairRowNameGender}>
            <FormField
              label="Name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              error={errors.name}
              required
              placeholder="Enter person's name"
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
              label="Due Date (Optional)"
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
              label="Birth Weight (Optional)"
              pounds={formData.birth_weight}
              ounces={formData.birth_weight_ounces}
              onPoundsChange={(v) => updateField('birth_weight', v)}
              onOuncesChange={(v) => updateField('birth_weight_ounces', v)}
              disabled={submitting}
            />
            <BirthHeightInput
              label="Birth Height (Optional)"
              value={formData.birth_height}
              onChange={(v) => updateField('birth_height', v)}
              disabled={submitting}
            />
          </div>

          <FormField
            label="Notes"
            type="textarea"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Optional notes (e.g., allergies, medical conditions)"
            rows={4}
            disabled={submitting}
          />
        </form>
      </Card>
    </div>
  );
}

export default EditPersonPage;

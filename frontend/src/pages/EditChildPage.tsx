import { useState, FormEvent, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { childrenApi, ApiClientError } from '@lib/api-client';
import { validateChildForm, formatDateForInput, getTodayDate } from '@lib/validation';
import type { Child, Gender } from '@shared/types/api';
import Card from '../shared/components/Card';
import FormField from '../shared/components/FormField';
import Button from '../shared/components/Button';
import Notification from '../shared/components/Notification';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import ErrorMessage from '../shared/components/ErrorMessage';
import ImageCropUpload from '../shared/components/ImageCropUpload';
import pageLayout from '../shared/styles/page-layout.module.css';
import formLayout from '../shared/styles/FormLayout.module.css';
import styles from './EditChildPage.module.css';

function EditChildPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    date_of_birth: '',
    gender: 'male' as Gender,
    notes: '',
    due_date: '',
    birth_weight: '',
    birth_weight_ounces: '',
    birth_height: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
      const response = await childrenApi.getById(parseInt(id));
      setChild(response.data);
      setFormData({
        name: response.data.name,
        date_of_birth: formatDateForInput(response.data.date_of_birth),
        gender: response.data.gender,
        notes: response.data.notes || '',
        due_date: response.data.due_date ? formatDateForInput(response.data.due_date) : '',
        birth_weight: response.data.birth_weight?.toString() || '',
        birth_weight_ounces: response.data.birth_weight_ounces?.toString() || '',
        birth_height: response.data.birth_height?.toString() || '',
      });
      // Set current avatar URL if exists
      if (response.data.avatar) {
        setCurrentAvatarUrl(childrenApi.getAvatarUrl(response.data.avatar));
      } else {
        setCurrentAvatarUrl(childrenApi.getDefaultAvatarUrl(response.data.gender));
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        setLoadError(error.message);
      } else {
        setLoadError('Failed to load child');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageCropped = (croppedFile: File) => {
    setAvatarFile(croppedFile);
    setErrors({ ...errors, avatar: '' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate form
    const validation = validateChildForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    if (!id) return;

    setErrors({});
    setSubmitting(true);

    try {
      await childrenApi.update(parseInt(id), {
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

      // Upload new avatar if provided
      if (avatarFile) {
        try {
          await childrenApi.uploadAvatar(parseInt(id), avatarFile);
        } catch (avatarError) {
          console.error('Failed to upload avatar:', avatarError);
          // Continue - child was updated successfully
        }
      }

      setNotification({
        message: 'Child updated successfully!',
        type: 'success',
      });

      // Navigate back after a short delay
      setTimeout(() => {
        navigate(`/children/${id}`);
      }, 1000);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({
          message: error.message,
          type: 'error',
        });
      } else {
        setNotification({
          message: 'Failed to update child',
          type: 'error',
        });
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading child..." />;
  }

  if (loadError) {
    return <ErrorMessage message={loadError} onRetry={loadChild} />;
  }

  if (!child) {
    return <ErrorMessage message="Child not found" />;
  }

  return (
    <div className={pageLayout.pageContainer}>
      <div className={pageLayout.pageHeader}>
        <div>
          <Link to={`/children/${id}`} className={pageLayout.breadcrumb}>← Back to Child</Link>
          <h1>Edit {child.name}</h1>
        </div>
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          <FormField
            label="Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
            placeholder="Enter child's name"
            disabled={submitting}
          />

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

          <FormField
            label="Due Date (Optional)"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            max={getTodayDate()}
            disabled={submitting}
          />

          <div className={styles.formField}>
            <label className={styles.formLabel}>Birth Weight (Optional)</label>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <FormField
                  label="Pounds"
                  type="number"
                  value={formData.birth_weight}
                  onChange={(e) => setFormData({ ...formData, birth_weight: e.target.value })}
                  placeholder="e.g., 7"
                  step="1"
                  min="0"
                  disabled={submitting}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FormField
                  label="Ounces"
                  type="number"
                  value={formData.birth_weight_ounces}
                  onChange={(e) => setFormData({ ...formData, birth_weight_ounces: e.target.value })}
                  placeholder="e.g., 8"
                  step="1"
                  min="0"
                  max="15"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          <FormField
            label="Birth Height (inches) (Optional)"
            type="number"
            value={formData.birth_height}
            onChange={(e) => setFormData({ ...formData, birth_height: e.target.value })}
            placeholder="e.g., 20.5"
            step="0.1"
            min="0"
            disabled={submitting}
          />

          <div className={styles.formField}>
              <label htmlFor="gender" className={styles.formLabel}>
                Gender <span className={styles.required}>*</span>
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                className={styles.formInput}
                disabled={submitting}
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Avatar (Optional)
              </label>
              <ImageCropUpload
                onImageCropped={handleImageCropped}
                currentImageUrl={currentAvatarUrl}
                disabled={submitting}
              />
              {errors.avatar && <span className={styles.formError}>{errors.avatar}</span>}
            </div>

            <FormField
              label="Notes"
              type="textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes (e.g., allergies, medical conditions)"
              rows={4}
              disabled={submitting}
            />

          <div className={formLayout.formActions}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
            <Link to={`/children/${id}`}>
              <Button type="button" variant="secondary" disabled={submitting}>
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default EditChildPage;

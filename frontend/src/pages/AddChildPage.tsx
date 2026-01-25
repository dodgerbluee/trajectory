import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { childrenApi, ApiClientError } from '../lib/api-client';
import { validateChildForm, getTodayDate } from '../lib/validation';
import type { Gender } from '../types/api';
import Card from '../components/Card';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Notification from '../components/Notification';
import ImageCropUpload from '../components/ImageCropUpload';

function AddChildPage() {
  const navigate = useNavigate();
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

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

    setErrors({});
    setSubmitting(true);

    try {
      const response = await childrenApi.create({
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

      // Upload avatar if provided
      if (avatarFile) {
        try {
          await childrenApi.uploadAvatar(response.data.id, avatarFile);
        } catch (avatarError) {
          console.error('Failed to upload avatar:', avatarError);
          // Continue - child was created successfully
        }
      }

      setNotification({
        message: `${formData.name} added successfully!`,
        type: 'success',
      });

      // Navigate to the child detail page after a short delay
      setTimeout(() => {
        navigate(`/children/${response.data.id}`);
      }, 1000);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({
          message: error.message,
          type: 'error',
        });
      } else {
        setNotification({
          message: 'Failed to add child',
          type: 'error',
        });
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link to="/" className="breadcrumb">← Back to Children</Link>
          <h1>Add Child</h1>
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
        <form onSubmit={handleSubmit} className="form">
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

          <div className="form-field">
            <label className="form-label">Birth Weight (Optional)</label>
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

          <div className="form-field">
            <label htmlFor="gender" className="form-label">
              Gender <span className="required">*</span>
            </label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
              className="form-input"
              disabled={submitting}
              required
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">
              Avatar (Optional)
            </label>
            <ImageCropUpload
              onImageCropped={handleImageCropped}
              disabled={submitting}
            />
            {errors.avatar && <span className="form-error">{errors.avatar}</span>}
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

          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Child'}
            </Button>
            <Link to="/">
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

export default AddChildPage;

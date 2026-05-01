/**
 * SelfRecordPromptModal — first-login prompt that asks the user whether they
 * want to track their own health alongside the people/family members they
 * track. Shown on HomePage when:
 *   - user is authenticated
 *   - user.hasSelfRecord === false
 *   - user.selfRecordPromptDismissed === false
 *
 * Either action ("Add me" or "Not now") sets users.self_record_prompt_dismissed
 * = TRUE on the server so the prompt never re-fires for this account. Users
 * who skip can still self-record later via the "Add yourself" button on the
 * Family page.
 *
 * The `onResolved` callback receives a result describing what happened so
 * the parent can surface a follow-up notification (e.g. for a non-fatal
 * avatar-upload failure).
 */

import { FormEvent, useState } from 'react';
import { meApi, peopleApi, ApiClientError } from '@lib/api-client';
import { getTodayDate } from '@lib/validation';
import FormField, { FormFieldGroup } from '@shared/components/FormField';
import Button from '@shared/components/Button';
import Notification from '@shared/components/Notification';
import ImageCropUpload from '@shared/components/ImageCropUpload';
import { GenderToggle } from '@features/people/components';
import {
  emptyChildFormData,
  usePersonFormState,
} from '@features/people/hooks/usePersonFormState';
import modalStyles from '@shared/components/Modal.module.css';
import s from './SelfRecordPromptModal.module.css';

export type SelfRecordPromptResult =
  | { kind: 'created'; personId: number }
  | { kind: 'created-avatar-failed'; personId: number; avatarError: string }
  | { kind: 'dismissed' };

interface Props {
  /** Called after a successful create or skip; parent should refresh auth user. */
  onResolved: (result: SelfRecordPromptResult) => void;
}

function SelfRecordPromptModal({ onResolved }: Props) {
  // Adults: clear DOB rather than defaulting to today (which is the
  // newborn-friendly default in emptyChildFormData).
  const { formData, updateField, errors, clearError, validate } = usePersonFormState({
    initial: { ...emptyChildFormData(), date_of_birth: '' },
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const busy = submitting || skipping;

  const handleImageCropped = (croppedFile: File) => {
    setAvatarFile(croppedFile);
    clearError('avatar');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const response = await meApi.createSelfRecord({
        name: formData.name.trim(),
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
      });

      const personId = response.data.personId;

      if (avatarFile) {
        try {
          await peopleApi.uploadAvatar(personId, avatarFile);
        } catch (avatarError) {
          // Non-fatal: profile is created; let the parent surface a toast.
          const message =
            avatarError instanceof ApiClientError
              ? avatarError.message
              : 'Photo upload failed';
          onResolved({ kind: 'created-avatar-failed', personId, avatarError: message });
          return;
        }
      }

      onResolved({ kind: 'created', personId });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to create profile', type: 'error' });
      }
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await meApi.dismissSelfRecordPrompt();
    } catch (error) {
      // If the dismiss call fails we still resolve locally so the user isn't
      // trapped in the modal; the server flag stays unset and they'll see the
      // prompt again next session, which is acceptable.
      console.error('Failed to dismiss self-record prompt:', error);
    }
    onResolved({ kind: 'dismissed' });
  };

  return (
    <div
      className={modalStyles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="self-record-prompt-title"
    >
      <div
        className={`${modalStyles.content} ${modalStyles.contentCard}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${modalStyles.header} ${s.header}`}>
          <h2 id="self-record-prompt-title">Track your own health?</h2>
        </div>

        <p className={s.intro}>
          You can add yourself as a profile to track visits, illnesses, and
          measurements alongside your family members. You can always add this
          later from the Family page.
        </p>

        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        <form onSubmit={handleSubmit} className={s.form}>
          <div className={s.topRow}>
            <div className={s.avatarWrap}>
              <ImageCropUpload
                onImageCropped={handleImageCropped}
                disabled={busy}
              />
              <p className={s.avatarHint}>Tap to add a photo</p>
            </div>
            <div className={s.nameAndDetails}>
              <div className={s.pairRowNameGender}>
                <FormField
                  label="Name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  error={errors.name}
                  required
                  placeholder="Your name"
                  disabled={busy}
                />
                <FormFieldGroup label="Gender" required>
                  <GenderToggle
                    value={formData.gender}
                    onChange={(g) => updateField('gender', g)}
                    disabled={busy}
                  />
                </FormFieldGroup>
              </div>
            </div>
          </div>

          <FormField
            label="Date of Birth"
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => updateField('date_of_birth', e.target.value)}
            error={errors.date_of_birth}
            required
            max={getTodayDate()}
            disabled={busy}
          />

          <div className={s.actions}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSkip}
              disabled={busy}
            >
              {skipping ? 'Skipping...' : 'Not now'}
            </Button>
            <Button type="submit" disabled={busy}>
              {submitting ? 'Adding...' : 'Add me'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SelfRecordPromptModal;

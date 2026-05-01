/**
 * useSelfRecordPrompt — shared state + resolve callback for the
 * SelfRecordPromptModal. Encapsulates:
 *   - the optimistic local "resolved" override (so the modal closes
 *     immediately, before checkAuth() round-trips),
 *   - calling AuthContext.checkAuth() to refresh hasSelfRecord and
 *     selfRecordPromptDismissed,
 *   - calling a caller-supplied people reload (HomePage and FamilyPage
 *     each have their own people list to refresh),
 *   - surfacing a follow-up notification when the avatar upload failed
 *     after profile creation.
 *
 * Used by HomePage (auto-prompt on first login) and FamilyPage
 * ("Add yourself" card).
 */

import { useCallback, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import type { SelfRecordPromptResult } from '../components/SelfRecordPromptModal';

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UseSelfRecordPromptOptions {
  /** Called after a successful resolution; typically reloads the family list. */
  onChildrenInvalidated?: () => void | Promise<void>;
}

interface UseSelfRecordPromptResult {
  /** Whether the modal should currently render. */
  shouldShow: boolean;
  /** Pass to <SelfRecordPromptModal onResolved={...}>. */
  onResolved: (result: SelfRecordPromptResult) => void;
  /** Inline notification produced by resolution (e.g. avatar upload failure). */
  notification: Notification | null;
  /** Clear the inline notification. */
  clearNotification: () => void;
  /**
   * Force-show the modal (used by FamilyPage's "Add yourself" button).
   * The auto-show path uses `shouldShow` instead.
   */
  forceShow: () => void;
}

export function useSelfRecordPrompt(
  options: UseSelfRecordPromptOptions = {}
): UseSelfRecordPromptResult {
  const { user, checkAuth } = useAuth();
  const [resolvedLocally, setResolvedLocally] = useState(false);
  const [forced, setForced] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Auto-show: the user has neither a self-record nor dismissed the prompt.
  // The local override hides the modal immediately on resolve so we don't
  // wait for checkAuth() to complete before closing.
  const autoShow =
    !!user &&
    user.hasSelfRecord === false &&
    user.selfRecordPromptDismissed === false &&
    !resolvedLocally;

  const shouldShow = autoShow || forced;

  const onResolved = useCallback(
    (result: SelfRecordPromptResult) => {
      setResolvedLocally(true);
      setForced(false);

      if (result.kind === 'created-avatar-failed') {
        setNotification({
          message: `Profile created, but photo upload failed: ${result.avatarError}. You can add a photo later.`,
          type: 'error',
        });
      }

      // Refresh server state. Both calls are fire-and-forget; failures don't
      // block the modal from closing because we already flipped resolvedLocally.
      void checkAuth();
      if (options.onChildrenInvalidated) {
        void Promise.resolve(options.onChildrenInvalidated());
      }
    },
    [checkAuth, options]
  );

  const clearNotification = useCallback(() => setNotification(null), []);
  const forceShow = useCallback(() => {
    setResolvedLocally(false);
    setForced(true);
  }, []);

  return {
    shouldShow,
    onResolved,
    notification,
    clearNotification,
    forceShow,
  };
}

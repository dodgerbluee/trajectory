/**
 * Onboarding / Welcome flow context.
 * State-driven, resilient to navigation and refresh. Persists current step so users can resume.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { completeOnboarding } from '../lib/api-client';
import { useAuth } from './AuthContext';

export const ONBOARDING_STEPS = [
  'welcome_home',
  'go_settings_family',
  'create_family',
  'add_child',
  'return_home_click_child',
  'feature_visits',
  'feature_illness',
  'feature_metrics',
  'wrap_up',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const STEP_INDEX: Record<OnboardingStep, number> = ONBOARDING_STEPS.reduce(
  (acc, step, i) => {
    acc[step] = i;
    return acc;
  },
  {} as Record<OnboardingStep, number>
);

/** Canonical route for each step so Back can navigate to the right page */
const STEP_CANONICAL: Partial<Record<OnboardingStep, { pathname: string; state?: { tab?: string; familySubTab?: string } }>> = {
  welcome_home: { pathname: '/' },
  go_settings_family: { pathname: '/settings', state: { tab: 'family' } },
  create_family: { pathname: '/settings', state: { tab: 'family' } },
  add_child: { pathname: '/settings', state: { tab: 'family', familySubTab: 'members' } },
  return_home_click_child: { pathname: '/' },
};

const STORAGE_KEY_PREFIX = 'trajectory_onboarding';

function storageKeyStep(userId: number): string {
  return `${STORAGE_KEY_PREFIX}_step_${userId}`;
}

function storageKeyCompleted(userId: number): string {
  return `${STORAGE_KEY_PREFIX}_completed_${userId}`;
}

function getStoredStep(userId: number | undefined): OnboardingStep | null {
  if (userId == null) return null;
  try {
    const raw = localStorage.getItem(storageKeyStep(userId));
    if (!raw) return null;
    if (ONBOARDING_STEPS.includes(raw as OnboardingStep)) {
      return raw as OnboardingStep;
    }
  } catch {
    // ignore
  }
  return null;
}

function setStoredStep(step: OnboardingStep | null, userId: number | undefined) {
  if (userId == null) return;
  try {
    const key = storageKeyStep(userId);
    if (step) localStorage.setItem(key, step);
    else localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function isCompletedFromStorage(userId: number | undefined): boolean {
  if (userId == null) return false;
  try {
    return localStorage.getItem(storageKeyCompleted(userId)) === 'true';
  } catch {
    return false;
  }
}

function setCompletedInStorage(userId: number | undefined) {
  if (userId == null) return;
  try {
    const key = storageKeyCompleted(userId);
    localStorage.setItem(key, 'true');
    localStorage.removeItem(storageKeyStep(userId));
  } catch {
    // ignore
  }
}

export interface OnboardingContextType {
  /** Current step in the flow */
  step: OnboardingStep;
  /** Whether the onboarding flow is active (not completed/skipped) */
  isActive: boolean;
  /** Move to the next step (or a specific step). Persists. */
  advance: (toStep?: OnboardingStep) => void;
  /** Go back to the previous step. Persists. No-op on first step. */
  goBack: () => void;
  /** Skip the entire flow: mark completed and restore normal app behavior */
  skip: () => Promise<void>;
  /** Mark flow complete (e.g. from wrap-up "Done"). Same as skip for now. */
  complete: () => Promise<void>;
  /** Call when user has created a family (Settings > Add Family > Create) */
  reportFamilyCreated: () => void;
  /** Call when user has added a child (Add Child page submit). Advances and navigates to Home. */
  reportChildAdded: (childId: number) => void;
  /** Call when user is on Settings with Family tab visible (so overlay can advance go_settings_family → create_family) */
  reportOnSettingsFamilyTab: () => void;
  /** Step index 0..N for progress display */
  stepIndex: number;
  /** Total number of steps */
  totalSteps: number;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, checkAuth } = useAuth();

  const fromInvite = (location.state as { fromInvite?: boolean } | null)?.fromInvite === true;

  const userId = user?.id;
  const isCompletedFromBackend = user?.onboardingCompleted === true;
  const isCompletedFromLocal = isCompletedFromStorage(userId);

  const isActive = useMemo(() => {
    if (fromInvite) return false;
    if (isCompletedFromBackend || isCompletedFromLocal) return false;
    return true;
  }, [fromInvite, isCompletedFromBackend, isCompletedFromLocal]);

  const [step, setStepState] = useState<OnboardingStep>(() => {
    const stored = getStoredStep(userId);
    return stored ?? 'welcome_home';
  });

  useEffect(() => {
    if (!isActive || userId == null) return;
    const stored = getStoredStep(userId);
    if (stored && ONBOARDING_STEPS.includes(stored)) {
      setStepState(stored);
    }
  }, [isActive, userId]);

  const advance = useCallback(
    (toStep?: OnboardingStep) => {
      setStepState((current) => {
        const next = toStep ?? (ONBOARDING_STEPS[STEP_INDEX[current] + 1] ?? current);
        setStoredStep(next, userId);
        return next;
      });
    },
    [userId]
  );

  const goBack = useCallback(() => {
    const current = step;
    const idx = STEP_INDEX[current];
    if (idx <= 0) return;
    const prevStep = ONBOARDING_STEPS[idx - 1];
    setStoredStep(prevStep, userId);
    setStepState(prevStep);
    const canonical = STEP_CANONICAL[prevStep];
    if (canonical && location.pathname !== canonical.pathname) {
      navigate(canonical.pathname, { replace: true, state: canonical.state });
    } else if (canonical?.state && location.pathname === canonical.pathname) {
      navigate(canonical.pathname, { replace: true, state: { ...location.state, ...canonical.state } });
    }
  }, [step, userId, location.pathname, location.state, navigate]);

  const skip = useCallback(async () => {
    setCompletedInStorage(userId);
    try {
      await completeOnboarding();
      await checkAuth();
    } catch {
      // still mark completed locally
    }
    // Leave user on current page; no redirect
  }, [checkAuth, userId]);

  const complete = useCallback(async () => {
    setCompletedInStorage(userId);
    try {
      await completeOnboarding();
      await checkAuth();
    } catch {
      // still mark completed locally
    }
    // Leave user on current page; no redirect
  }, [checkAuth, userId]);

  const reportFamilyCreated = useCallback(() => {
    advance('add_child');
  }, [advance]);

  const reportChildAdded = useCallback(
    (_childId: number) => {
      advance('return_home_click_child');
      navigate('/', { replace: true, state: { tab: 'family' } });
    },
    [advance, navigate]
  );

  const reportOnSettingsFamilyTab = useCallback(() => {
    setStepState((current) => {
      if (current !== 'go_settings_family') return current;
      const next: OnboardingStep = 'create_family';
      setStoredStep(next, userId);
      return next;
    });
  }, [userId]);

  const stepIndex = STEP_INDEX[step];
  const totalSteps = ONBOARDING_STEPS.length;

  const value = useMemo<OnboardingContextType>(
    () => ({
      step,
      isActive,
      advance,
      goBack,
      skip,
      complete,
      reportFamilyCreated,
      reportChildAdded,
      reportOnSettingsFamilyTab,
      stepIndex,
      totalSteps,
    }),
    [
      step,
      isActive,
      advance,
      goBack,
      skip,
      complete,
      reportFamilyCreated,
      reportChildAdded,
      reportOnSettingsFamilyTab,
      stepIndex,
      totalSteps,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextType | null {
  return useContext(OnboardingContext);
}

export function useOnboardingRequired(): OnboardingContextType {
  const ctx = useOnboarding();
  if (!ctx) {
    throw new Error('useOnboardingRequired must be used within OnboardingProvider');
  }
  return ctx;
}

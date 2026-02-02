/**
 * Guided welcome overlay: step-specific prompts, spotlights, and persistent Skip.
 * Renders when onboarding is active; content depends on current route and step.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { LuSparkles, LuHouse, LuActivity, LuPill, LuTrendingUp } from 'react-icons/lu';
import { useOnboarding, type OnboardingStep } from '../../contexts/OnboardingContext';
import Button from '../Button';
import Card from '../Card';
import styles from './OnboardingOverlay.module.css';

const STREAMER_COLORS = [
  'var(--color-primary)',
  '#1e88e5',
  '#22c55e',
  '#8b5cf6',
  '#f59e0b',
];

function Streamers() {
  const count = 24;
  return (
    <div className={styles.streamers} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={styles.streamer}
          style={{
            left: `${(i * (100 / count)) + (Math.random() * 4)}%`,
            backgroundColor: STREAMER_COLORS[i % STREAMER_COLORS.length],
            animationDelay: `${(i * 0.08) % 2}s`,
            animationDuration: `${2.2 + (i % 3) * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Skip and Back actions for prompt cards */
function PromptActions({
  onBack,
  onSkip,
  showBack,
  showSkip,
}: {
  onBack: () => void;
  onSkip: () => void;
  showBack: boolean;
  showSkip: boolean;
}) {
  return (
    <div className={`${styles.promptActions} ${styles.promptActionsRow}`}>
      <div className={styles.promptActionsRight}>
        {showBack && (
          <Button variant="secondary" size="sm" onClick={onBack}>
            Back
          </Button>
        )}
        {showSkip && (
          <Button variant="secondary" size="sm" onClick={onSkip}>
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}

const BLOCKING_MASK_Z = 10001;

/** Blocks pointer events outside the spotlight and prompt areas so only the highlighted element and popups are clickable */
function BlockingMask({
  targetRect,
  padding = 8,
}: {
  targetRect: DOMRect | null;
  padding?: number;
}) {
  if (targetRect) {
    const left = targetRect.left - padding;
    const top = targetRect.top - padding;
    const width = targetRect.width + padding * 2;
    const height = targetRect.height + padding * 2;
    return (
      <div className={styles.blockingMask} aria-hidden>
        <div
          className={styles.blockingPanel}
          style={{ position: 'fixed', left: 0, top: 0, right: 0, height: top, zIndex: BLOCKING_MASK_Z }}
        />
        <div
          className={styles.blockingPanel}
          style={{ position: 'fixed', left: 0, top: top + height, right: 0, bottom: 0, zIndex: BLOCKING_MASK_Z }}
        />
        <div
          className={styles.blockingPanel}
          style={{ position: 'fixed', left: 0, top, width: left, height, zIndex: BLOCKING_MASK_Z }}
        />
        <div
          className={styles.blockingPanel}
          style={{ position: 'fixed', left: left + width, top, right: 0, height, zIndex: BLOCKING_MASK_Z }}
        />
      </div>
    );
  }
  return (
    <div
      className={styles.blockingPanel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: BLOCKING_MASK_Z,
      }}
      aria-hidden
    />
  );
}

function SpotlightOverlay({
  targetRect,
  padding = 8,
}: {
  targetRect: DOMRect | null;
  padding?: number;
}) {
  if (!targetRect) return null;
  return (
    <div
      className={styles.spotlightCutout}
      style={{
        position: 'fixed',
        left: targetRect.left - padding,
        top: targetRect.top - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
        borderRadius: 10,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
        pointerEvents: 'none',
        zIndex: 10002,
      }}
      aria-hidden
    />
  );
}

function useSpotlightRect(selector: string | null, step: OnboardingStep, pathname: string): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(selector);
    if (!el) {
      setRect(null);
      return;
    }
    setRect(el.getBoundingClientRect());
  }, [selector]);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    measure();
    const interval = setInterval(measure, 200);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [selector, step, pathname, measure]);

  return rect;
}

export default function OnboardingOverlay() {
  const location = useLocation();
  const onboarding = useOnboarding();
  const pathname = location.pathname;
  const isSettings = pathname === '/settings';
  const isHome = pathname === '/';
  const isChildDetail = /^\/children\/\d+$/.test(pathname);
  const isAddChild = pathname === '/children/new';

  const [spotlightSelector, setSpotlightSelector] = useState<string | null>(null);
  const [dropdownCheckTick, setDropdownCheckTick] = useState(0);
  const [createFamilyModalTick, setCreateFamilyModalTick] = useState(0);
  useEffect(() => {
    if (!onboarding?.isActive || onboarding.step !== 'go_settings_family' || !isHome) return;
    const id = setInterval(() => setDropdownCheckTick((t) => t + 1), 300);
    return () => clearInterval(id);
  }, [onboarding?.isActive, onboarding?.step, isHome]);

  useEffect(() => {
    if (!onboarding?.isActive || onboarding.step !== 'create_family' || !isSettings) return;
    const id = setInterval(() => setCreateFamilyModalTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, [onboarding?.isActive, onboarding?.step, isSettings]);

  useEffect(() => {
    if (!onboarding?.isActive) {
      setSpotlightSelector(null);
      return;
    }
    if (onboarding.step === 'go_settings_family' && isHome) {
      setSpotlightSelector(
        typeof document !== 'undefined' && document.querySelector('[data-onboarding="settings-menu-item"]')
          ? '[data-onboarding="settings-menu-item"]'
          : '[data-onboarding="settings-menu"]'
      );
    } else if (onboarding.step === 'go_settings_family' && isSettings) {
      setSpotlightSelector('[data-onboarding="settings-family-tab"]');
    } else if (onboarding.step === 'create_family' && isSettings) {
      const modalOpen = typeof document !== 'undefined' && document.querySelector('[data-onboarding="create-family-modal"]');
      setSpotlightSelector(modalOpen ? '[data-onboarding="create-family-modal"]' : '[data-onboarding="add-family"]');
    } else if (onboarding.step === 'add_child' && isSettings) {
      setSpotlightSelector('[data-onboarding="add-child"]');
    } else if (onboarding.step === 'return_home_click_child' && isHome) {
      setSpotlightSelector('[data-onboarding="child-card"]');
    } else if (
      (onboarding.step === 'feature_visits' || onboarding.step === 'feature_illness' || onboarding.step === 'feature_metrics') &&
      isChildDetail
    ) {
      /* Spotlight the tab we're asking them to click (Illness when on Visits step, Metrics when on Illness step) */
      const tabId =
        onboarding.step === 'feature_visits'
          ? 'illnesses'
          : onboarding.step === 'feature_illness'
            ? 'metrics'
            : 'metrics';
      setSpotlightSelector(`[data-onboarding-tab="${tabId}"]`);
    } else {
      setSpotlightSelector(null);
    }
  }, [onboarding?.isActive, onboarding?.step, isHome, isSettings, isChildDetail, dropdownCheckTick, createFamilyModalTick]);

  /* When Create family modal is spotlighted, add body class so CSS can highlight the Create button */
  useEffect(() => {
    if (spotlightSelector === '[data-onboarding="create-family-modal"]') {
      document.body.classList.add('onboarding-modal-active');
      return () => document.body.classList.remove('onboarding-modal-active');
    }
  }, [spotlightSelector]);

  const spotlightRect = useSpotlightRect(
    spotlightSelector,
    onboarding?.step ?? 'welcome_home',
    pathname
  );

  if (!onboarding?.isActive) return null;

  const { step, advance, goBack, skip, complete, stepIndex, totalSteps } = onboarding;

  const handleSkip = () => {
    skip();
  };

  const showBack = stepIndex > 0;
  const showSkipInPopup = step !== 'wrap_up';

  const content = (() => {
    if (step === 'welcome_home' && isHome) {
      return (
        <div className={`${styles.fullscreen} ${styles.welcomeCard}`}>
          <Streamers />
          <div className={styles.fullscreenInner}>
            <Card className={styles.welcomeCard}>
              <div className={styles.welcomeLogo}>
                <img src="/logo/trajectory.png" alt="" className={styles.logoImg} />
              </div>
              <h1 className={styles.welcomeTitle}>Welcome to Trajectory</h1>
              <p className={styles.welcomeSubtitle}>
                This is a guided setup so you can get your family and first child added in just a few steps.
              </p>
              <p className={styles.welcomeHint}>You can skip anytime.</p>
              <div className={styles.welcomeActions}>
                <Button variant="primary" size="lg" onClick={() => advance()}>
                  <LuSparkles className={styles.btnIcon} aria-hidden />
                  Get started
                </Button>
              </div>
              <PromptActions showBack={false} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
            </Card>
          </div>
        </div>
      );
    }

    if (step === 'go_settings_family') {
      if (isHome) {
        return (
          <>
            <SpotlightOverlay targetRect={spotlightRect} padding={12} />
            <div className={`${styles.promptFloating} ${styles.promptFloatingBottom}`}>
              <Card className={styles.promptCard}>
                <h2 className={styles.promptTitle}>Go to Settings, then Family</h2>
                <p className={styles.promptCopy}>
                  Click the <strong>down arrow (▼)</strong> next to your name in the top right, then choose <strong>Settings</strong>. Once there, click <strong>Family</strong> in the left sidebar.
                </p>
                <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
              </Card>
            </div>
          </>
        );
      }
      if (isSettings) {
        return (
          <>
            <SpotlightOverlay targetRect={spotlightRect} padding={8} />
            <div className={`${styles.promptFloating} ${styles.promptFloatingBottom}`}>
              <Card className={styles.promptCard}>
                <h2 className={styles.promptTitle}>Click Family</h2>
                <p className={styles.promptCopy}>
                  In the left sidebar, click <strong>Family</strong> to open Family Settings.
                </p>
                <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
              </Card>
            </div>
          </>
        );
      }
    }

    if (step === 'create_family') {
      if (!isSettings) {
        return (
          <div className={`${styles.promptFloating} ${styles.promptFloatingBottom}`}>
            <Card className={styles.promptCard}>
              <h2 className={styles.promptTitle}>Create a family</h2>
              <p className={styles.promptCopy}>
                Go to <strong>Settings → Family</strong> to add a family. Use the menu in the top right.
              </p>
              <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
            </Card>
          </div>
        );
      }
      return (
        <>
          <SpotlightOverlay targetRect={spotlightRect} padding={10} />
          <div className={`${styles.promptFloating} ${styles.promptFloatingBottom}`}>
            <Card className={styles.promptCard}>
              <h3 className={styles.tooltipTitle}>Create a family</h3>
              <p className={styles.promptCopy}>
                Click <strong>Add Family</strong>, enter a family name, then click <strong>Create</strong>.
              </p>
              <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
            </Card>
          </div>
        </>
      );
    }

    if (step === 'add_child') {
      if (!isSettings && !isAddChild) {
        return (
          <div className={`${styles.promptFloating} ${styles.promptFloatingBottom}`}>
            <Card className={styles.promptCard}>
              <h2 className={styles.promptTitle}>Add a child</h2>
              <p className={styles.promptCopy}>
                Go to <strong>Settings → Family</strong> and click <strong>Add Child</strong> for your family.
              </p>
              <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
            </Card>
          </div>
        );
      }
      if (isSettings) {
        return (
          <>
            <SpotlightOverlay targetRect={spotlightRect} padding={10} />
            {spotlightRect && (
              <div
                className={styles.tooltipAnchor}
                style={{
                  position: 'fixed',
                  left: Math.max(16, Math.min(spotlightRect.left, typeof window !== 'undefined' ? window.innerWidth - 340 : 0)),
                  top: spotlightRect.bottom + 12,
                  zIndex: 10003,
                }}
              >
                <Card className={styles.tooltipCard}>
                  <h3 className={styles.tooltipTitle}>Add a child</h3>
                  <p className={styles.tooltipCopy}>
                    Click <strong>Add Child</strong>, then enter your child's name and optional details. Click <strong>Add Child</strong> to save.
                  </p>
                  <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
                </Card>
              </div>
            )}
          </>
        );
      }
      if (isAddChild) {
        return (
          <div className={`${styles.promptFloating} ${styles.promptFloatingBottom}`}>
            <Card className={`${styles.promptCard} ${styles.promptCardCompact}`}>
              <p className={styles.promptCopy}>
                Fill in your child's name and any details, then click <strong>Add Child</strong>.
              </p>
              <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
            </Card>
          </div>
        );
      }
    }

    if (step === 'return_home_click_child') {
      if (!isHome) {
        return (
          <div className={`${styles.promptFloating} ${styles.promptFloatingBottom}`}>
            <Card className={styles.promptCard}>
              <h2 className={styles.promptTitle}>Almost there</h2>
              <p className={styles.promptCopy}>
                Go back to <strong>Home</strong> (click the logo) and click on your child's card to continue the tour.
              </p>
              <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
            </Card>
          </div>
        );
      }
      return (
        <>
          <SpotlightOverlay targetRect={spotlightRect} padding={10} />
          <div className={`${styles.promptFloating} ${styles.promptFloatingBottom}`}>
            <Card className={styles.promptCard}>
              <h2 className={styles.promptTitle}>Click on your child</h2>
              <p className={styles.promptCopy}>
                Open the card for the child you just added to see their profile and the main features.
              </p>
              <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
            </Card>
          </div>
        </>
      );
    }

    if (step === 'feature_visits') {
      if (!isChildDetail) {
        return (
          <div className={`${styles.promptFloating} ${styles.promptFloatingBottom}`}>
            <Card className={styles.promptCard}>
              <h2 className={styles.promptTitle}>Tour your child's profile</h2>
              <p className={styles.promptCopy}>
                Open a child's card from <strong>Home</strong> to see Visits, Illness, and Metrics.
              </p>
              <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
            </Card>
          </div>
        );
      }
      return (
        <>
          <SpotlightOverlay targetRect={spotlightRect} padding={6} />
          <div className={styles.tooltipFloating} style={{ top: (spotlightRect?.bottom ?? 60) + 12 }}>
            <Card className={styles.tooltipCard}>
              <h3 className={styles.tooltipTitle}>
                <LuActivity className={styles.tooltipIcon} aria-hidden /> Visits
              </h3>
              <p className={styles.tooltipCopy}>
                Log wellness visits, sick visits, injuries, vision, and dental. Add visit dates and outcomes here.
              </p>
              <p className={`${styles.tooltipCopy} ${styles.tooltipCta}`}>
                Click the <strong>Illness</strong> tab above to continue.
              </p>
              <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
            </Card>
          </div>
        </>
      );
    }

    if (step === 'feature_illness') {
      if (!isChildDetail) {
        return (
          <div className={`${styles.promptFloating} ${styles.promptFloatingBottom}`}>
            <Card className={styles.promptCard}>
              <h2 className={styles.promptTitle}>Tour your child's profile</h2>
              <p className={styles.promptCopy}>
                Open a child's card from <strong>Home</strong> to continue the tour.
              </p>
              <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
            </Card>
          </div>
        );
      }
      return (
        <>
          <SpotlightOverlay targetRect={spotlightRect} padding={6} />
          <div className={styles.tooltipFloating} style={{ top: (spotlightRect?.bottom ?? 60) + 12 }}>
            <Card className={styles.tooltipCard}>
              <h3 className={styles.tooltipTitle}>
                <LuPill className={styles.tooltipIcon} aria-hidden /> Illness
              </h3>
              <p className={styles.tooltipCopy}>
                Track illnesses with start and end dates, symptoms, and severity. Great for colds, flu, and ongoing conditions.
              </p>
              <p className={`${styles.tooltipCopy} ${styles.tooltipCta}`}>
                Click the <strong>Metrics</strong> tab above to continue.
              </p>
              <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
            </Card>
          </div>
        </>
      );
    }

    if (step === 'feature_metrics') {
      if (!isChildDetail) {
        return (
          <div className={`${styles.promptFloating} ${styles.promptFloatingBottom}`}>
            <Card className={styles.promptCard}>
              <h2 className={styles.promptTitle}>Tour your child's profile</h2>
              <p className={styles.promptCopy}>
                Open a child's card from <strong>Home</strong> to continue the tour.
              </p>
              <PromptActions showBack={showBack} showSkip={showSkipInPopup} onBack={goBack} onSkip={handleSkip} />
            </Card>
          </div>
        );
      }
      return (
        <>
          <SpotlightOverlay targetRect={spotlightRect} padding={6} />
          <div className={styles.tooltipFloating} style={{ top: (spotlightRect?.bottom ?? 60) + 12 }}>
            <Card className={styles.tooltipCard}>
              <h3 className={styles.tooltipTitle}>
                <LuTrendingUp className={styles.tooltipIcon} aria-hidden /> Metrics
              </h3>
              <p className={styles.tooltipCopy}>
                View <strong>Illness Overview</strong> and <strong>Growth</strong> (height, weight) over time. Switch between tabs to explore.
              </p>
              <p className={`${styles.tooltipCopy} ${styles.tooltipCta}`}>
                You've seen the basics. Click <strong>Done</strong> below to finish the tour.
              </p>
              <div className={`${styles.promptActions} ${styles.promptActionsRow}`}>
                {showBack && (
                  <Button variant="secondary" size="sm" onClick={goBack}>
                    Back
                  </Button>
                )}
                <Button variant="primary" size="sm" onClick={() => complete()} style={showBack ? undefined : { marginLeft: 'auto' }}>
                  Done
                </Button>
              </div>
            </Card>
          </div>
        </>
      );
    }

    if (step === 'wrap_up') {
      if (!isChildDetail) {
        return (
          <div className={`${styles.promptFloating} ${styles.promptFloatingBottom}`}>
            <Card className={styles.promptCard}>
              <h2 className={styles.promptTitle}>Finish the tour</h2>
              <p className={styles.promptCopy}>
                Open a child's card from <strong>Home</strong> to see the completion message, or click <strong>Skip</strong> to finish now.
              </p>
              <div className={styles.promptActions}>
                <Button variant="primary" onClick={() => complete()}>
                  I'm done
                </Button>
              </div>
              <PromptActions showBack={showBack} showSkip={false} onBack={goBack} onSkip={handleSkip} />
            </Card>
          </div>
        );
      }
      return (
        <div className={`${styles.fullscreen} ${styles.wrapupCard}`}>
          <div className={styles.fullscreenInner}>
            <Card className={`${styles.welcomeCard} ${styles.wrapupCard}`}>
              <h1 className={styles.welcomeTitle}>You're all set!</h1>
              <p className={styles.welcomeSubtitle}>
                You've seen the basics: family, children, visits, illness, and metrics. You can explore anytime from this child's profile or from Home.
              </p>
              <p className={styles.welcomeHint}>We're here if you need help.</p>
              <div className={styles.welcomeActions}>
                <Button variant="primary" size="lg" onClick={() => complete()}>
                  <LuHouse className={styles.btnIcon} aria-hidden />
                  Done
                </Button>
              </div>
              {showBack && (
                <div className={`${styles.promptActions} ${styles.promptActionsRow}`} style={{ marginTop: 'var(--spacing-md)' }}>
                  <Button variant="secondary" size="sm" onClick={goBack}>
                    Back
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      );
    }

    return null;
  })();

  /* On Add Child page we show only a bottom prompt; don't block the form so the user can fill it in */
  const skipBlockingOnAddChildPage = step === 'add_child' && isAddChild;
  const portal = (
    <div className={styles.layer} aria-live="polite" role="region" aria-label="Guided setup">
      {content && !skipBlockingOnAddChildPage && <BlockingMask targetRect={spotlightRect} padding={8} />}
      {content}
      {content && step !== 'welcome_home' && step !== 'wrap_up' && (
        <div className={styles.progressBar} aria-label={`Step ${stepIndex + 1} of ${totalSteps}`}>
          <div
            className={styles.progressFill}
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
      )}
    </div>
  );

  return createPortal(portal, document.body);
}

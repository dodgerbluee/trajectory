/**
 * Welcome / Onboarding flow for new users.
 * Four steps: Welcome → Name your family → Add first child (optional) → You're all set.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LuUsers, LuBaby, LuBookOpen, LuHouse, LuSparkles } from 'react-icons/lu';
import Button from '../components/Button';
import Card from '../components/Card';
import { familiesApi, completeOnboarding, ApiClientError } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';
import type { Family } from '../types/api';

const STORAGE_KEY = 'trajectory_welcome_shown';

function Streamers() {
  const streamers = Array.from({ length: 20 }, (_, i) => i);
  const colors = [
    'var(--color-primary)',
    '#1e88e5',
    '#005a9c',
    '#22c55e',
    '#8b5cf6',
  ];

  return (
    <div className="welcome-streamers" aria-hidden="true">
      {streamers.map((index) => {
        const color = colors[index % colors.length];
        const left = `${(index * 5) % 100}%`;
        const delay = (index * 0.1) % 2;
        const duration = 2 + (index % 3);
        return (
          <div
            key={index}
            className="welcome-streamer"
            style={{
              left,
              backgroundColor: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();
  const stateStep = (location.state as { step?: number } | null)?.step;
  const [step, setStep] = useState(stateStep ?? 1);
  const [families, setFamilies] = useState<Family[]>([]);
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stateStep != null && stateStep >= 1 && stateStep <= 4) {
      setStep(stateStep);
    }
  }, [stateStep]);

  useEffect(() => {
    if (step === 2 && families.length === 0) {
      setLoading(true);
      familiesApi
        .getAll()
        .then((res) => {
          setFamilies(res.data);
          const first = res.data[0];
          if (first) setFamilyName(first.name ?? 'My Family');
        })
        .catch(() => setError('Could not load your family.'))
        .finally(() => setLoading(false));
    }
  }, [step, families.length]);

  const handleSkip = async () => {
    try {
      await completeOnboarding();
      localStorage.setItem(STORAGE_KEY, 'true');
      await checkAuth();
      navigate('/', { replace: true });
    } catch {
      localStorage.setItem(STORAGE_KEY, 'true');
      navigate('/', { replace: true });
    }
  };

  const handleNextFromStep1 = () => setStep(2);
  const handleBackFromStep2 = () => setStep(1);
  const handleNextFromStep2 = async () => {
    const trimmed = familyName.trim();
    if (!trimmed) {
      setError('Please enter a family name.');
      return;
    }
    const first = families[0];
    if (!first) {
      setError('No family found.');
      return;
    }
    setError(null);
    setSavingName(true);
    try {
      await familiesApi.updateFamily(first.id, trimmed);
      setStep(3);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save family name.');
    } finally {
      setSavingName(false);
    }
  };
  const handleAddChild = () => {
    const first = families[0];
    if (first) {
      navigate('/children/new', {
        state: { familyId: first.id, fromOnboarding: true },
        replace: false,
      });
    }
  };
  const handleBackFromStep3 = () => setStep(2);
  const handleGoHome = async () => {
    try {
      await completeOnboarding();
      localStorage.setItem(STORAGE_KEY, 'true');
      await checkAuth();
      navigate('/', { replace: true });
    } catch {
      localStorage.setItem(STORAGE_KEY, 'true');
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="welcome-page">
      <Streamers />
      <div className="welcome-page-inner">
        <Card className="welcome-card">
          <div className="welcome-content">
            {step === 1 && (
              <div className="welcome-step" data-step="1">
                <div className="welcome-logo-section">
                  <img src="/logo/trajectory.png" alt="" className="welcome-logo" />
                </div>
                <h1 className="welcome-title">Welcome to Trajectory</h1>
                <p className="welcome-subtitle">
                  Let's set up your family in a few quick steps. You can skip anytime.
                </p>
                <div className="welcome-actions">
                  <Button variant="primary" size="lg" onClick={handleNextFromStep1}>
                    <LuSparkles className="welcome-btn-icon" aria-hidden />
                    Get started
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="welcome-step" data-step="2">
                <h2 className="welcome-step-title">Name your family</h2>
                <p className="welcome-step-copy">
                  This helps you tell families apart if you're in more than one (e.g. after joining an
                  invite).
                </p>
                {loading ? (
                  <p className="welcome-loading">Loading…</p>
                ) : (
                  <>
                    <div className="form-field">
                      <label htmlFor="welcome-family-name" className="form-label">
                        Family name
                      </label>
                      <input
                        id="welcome-family-name"
                        type="text"
                        className="form-input"
                        value={familyName}
                        onChange={(e) => setFamilyName(e.target.value)}
                        placeholder="e.g. Smith Family"
                        disabled={savingName}
                        autoFocus
                      />
                    </div>
                    {error && <p className="welcome-error">{error}</p>}
                    <div className="welcome-actions">
                      <Button variant="secondary" size="lg" onClick={handleBackFromStep2} disabled={savingName}>
                        Back
                      </Button>
                      <Button variant="primary" size="lg" onClick={handleNextFromStep2} disabled={savingName}>
                        Next
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="welcome-step" data-step="3">
                <h2 className="welcome-step-title">Add your first child</h2>
                <p className="welcome-step-copy">
                  You can add a child now or do it later from the Family tab or Settings.
                </p>
                <div className="welcome-feature-list">
                  <div className="welcome-feature-item">
                    <span className="welcome-feature-icon" aria-hidden>
                      <LuBaby size={24} />
                    </span>
                    <div>
                      <strong>Track growth & visits</strong> — Add wellness visits, sick visits, and
                      measurements in one place.
                    </div>
                  </div>
                </div>
                <div className="welcome-actions">
                  <Button variant="secondary" size="lg" onClick={handleBackFromStep3}>
                    Back
                  </Button>
                  <Button variant="primary" size="lg" onClick={handleAddChild}>
                    <LuBaby className="welcome-btn-icon" aria-hidden />
                    Add a child
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="welcome-step" data-step="4">
                <h2 className="welcome-step-title">You're all set</h2>
                <p className="welcome-step-copy">
                  Your family is ready! Manage your family in <strong>Settings → Family</strong>. You
                  can invite other caregivers from <strong>Settings → Family → Management</strong>.
                </p>
                <h3 className="welcome-whats-next">What's next?</h3>
                <div className="welcome-feature-list">
                  <div className="welcome-feature-item">
                    <span className="welcome-feature-icon" aria-hidden>
                      <LuUsers size={24} />
                    </span>
                    <div>Invite parents or caregivers and manage roles.</div>
                  </div>
                  <div className="welcome-feature-item">
                    <span className="welcome-feature-icon" aria-hidden>
                      <LuBookOpen size={24} />
                    </span>
                    <div>Record visits, illnesses, and growth over time.</div>
                  </div>
                </div>
                <div className="welcome-actions">
                  <Button variant="secondary" size="lg" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button variant="primary" size="lg" onClick={handleGoHome}>
                    <LuHouse className="welcome-btn-icon" aria-hidden />
                    Go to Home
                  </Button>
                </div>
              </div>
            )}

            <div className="welcome-progress" aria-label={`Step ${step} of 4`}>
              <div className="welcome-progress-top">
                <span className="welcome-progress-text">Step {step} of 4</span>
                {step >= 1 && step <= 3 && (
                  <Button variant="secondary" size="lg" onClick={handleSkip} className="welcome-skip-in-progress">
                    Skip
                  </Button>
                )}
              </div>
              <div className="welcome-progress-dots">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={`welcome-progress-dot ${i <= step ? 'active' : ''}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

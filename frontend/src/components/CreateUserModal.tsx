import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi, ApiClientError } from '../lib/api-client';
import FormField from './FormField';
import Button from './Button';
import ErrorMessage from './ErrorMessage';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** When set, parent should call accept-invite after registration and then redirect (e.g. invite flow). */
  inviteToken?: string;
}

type Step = 'loading' | 'code' | 'form' | 'code-required';

function CreateUserModal({ isOpen, onClose, onSuccess, inviteToken: _inviteToken }: CreateUserModalProps) {
  const { register } = useAuth();
  const [step, setStep] = useState<Step>('loading');

  const [registrationCode, setRegistrationCode] = useState('');
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('loading');
    setError(null);
    setRegistrationCode('');
    setVerifiedCode(null);
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrors({});

    authApi
      .getRegistrationCodeRequired()
      .then((res) => {
        const { requiresCode: req, codeActive: active } = res.data;
        if (req && !active) {
          setStep('code-required');
        } else if (req && active) {
          setStep('code');
        } else {
          setStep('form');
        }
      })
      .catch(() => {
        setError('Could not check registration requirements.');
        setStep('form');
      });
  }, [isOpen]);

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = registrationCode.replace(/-/g, '').trim();
    if (!code) {
      setError('Enter the registration code.');
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyRegistrationCode(registrationCode.trim());
      setVerifiedCode(registrationCode.trim());
      setStep('form');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'Invalid registration code.');
      } else {
        setError('Verification failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else {
      const hasLower = /[a-z]/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[^a-zA-Z0-9]/.test(password);
      if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
        newErrors.password =
          'Password must contain uppercase, lowercase, number, and special character';
      }
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitForm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setErrors({});
    if (!validateForm()) return;
    setLoading(true);
    try {
      await register(
        email,
        password,
        name,
        verifiedCode ?? undefined
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 409) {
          setError('An account with this email already exists');
        } else if (err.statusCode === 400 || err.statusCode === 401) {
          setError(err.message || 'Invalid data. Please check your input.');
        } else {
          setError(err.message || 'Registration failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCodeInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    const parts: string[] = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    return parts.join('-');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-user-modal-title">
      <div className="modal-content card" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2 id="create-user-modal-title">
            {step === 'code' || step === 'code-required'
              ? 'Create first account'
              : 'Create account'}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          {step === 'loading' && (
            <p className="modal-subtitle">Checking registration…</p>
          )}

          {step === 'code-required' && (
            <p className="modal-subtitle">
              No users exist yet. An administrator must generate a registration code first (e.g. from server logs or an admin tool), then you can create the first account.
            </p>
          )}

          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="login-form" noValidate>
              <p className="modal-subtitle" style={{ marginBottom: '1rem' }}>
                Enter the registration code to create the first account.
              </p>
              {error && (
                <ErrorMessage message={error} onRetry={() => setError(null)} />
              )}
              <FormField
                label="Registration code"
                type="text"
                value={registrationCode}
                onChange={(e) =>
                  setRegistrationCode(formatCodeInput(e.target.value))
                }
                placeholder="XXXX-XXXX-XXXX"
                autoComplete="one-time-code"
                disabled={loading}
              />
              <div className="modal-footer" style={{ border: 'none', paddingBottom: 0 }}>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Verifying…' : 'Continue'}
                </Button>
              </div>
            </form>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmitForm} className="login-form" noValidate>
              {error && (
                <ErrorMessage message={error} onRetry={() => setError(null)} />
              )}
              <FormField
                label="Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                required
                autoComplete="name"
                autoFocus
                disabled={loading}
              />
              <FormField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                required
                autoComplete="email"
                disabled={loading}
              />
              <div className="form-field">
                <label htmlFor="create-user-password" className="form-label">
                  Password <span className="required-indicator">*</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="create-user-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {errors.password && (
                  <span className="form-error">{errors.password}</span>
                )}
                <div className="form-hint">
                  At least 8 characters with uppercase, lowercase, number, and special character
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="create-user-confirm" className="form-label">
                  Confirm password <span className="required-indicator">*</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="create-user-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="form-error">{errors.confirmPassword}</span>
                )}
              </div>
              <div className="modal-footer" style={{ border: 'none', paddingBottom: 0 }}>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </Button>
              </div>
            </form>
          )}

          {step === 'code-required' && (
            <div className="modal-footer" style={{ border: 'none', paddingBottom: 0 }}>
              <Button type="button" variant="primary" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateUserModal;

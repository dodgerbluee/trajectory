import { useState, FormEvent, useEffect } from 'react';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { useAuth } from '@/contexts/AuthContext';
import { authApi, ApiClientError } from '@lib/api-client';
import FormField from '@shared/components/FormField';
import Button from '@shared/components/Button';
import ErrorMessage from '@shared/components/ErrorMessage';
import modalStyles from '@shared/components/Modal.module.css';
import styles from './CreateUserModal.module.css';

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

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPassword = password.length > 0;
  const hasConfirmPassword = confirmPassword.length > 0;
  const passwordsMatch = hasPassword && hasConfirmPassword && password === confirmPassword;
  const showPasswordMismatch = hasConfirmPassword && password !== confirmPassword;

  useEffect(() => {
    if (!isOpen) return;
    setStep('loading');
    setError(null);
    setRegistrationCode('');
    setVerifiedCode(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrors({});

    authApi
      .getRegistrationCodeRequired()
      .then(async (res) => {
        const { requiresCode: req, codeActive: active } = res.data;
        if (req && !active) {
          // Auto-generate the code
          try {
            await authApi.generateRegistrationCode();
            // Re-check to confirm code is now active
            const recheck = await authApi.getRegistrationCodeRequired();
            if (recheck.data.codeActive) {
              setStep('code');
            } else {
              setStep('code-required');
              setError('Registration code was generated but could not be verified. Please check server logs.');
            }
          } catch (err) {
            console.error('Failed to generate registration code:', err);
            setStep('code-required');
            if (err instanceof ApiClientError) {
              setError(`Failed to generate registration code: ${err.message}. Please check server logs.`);
            } else {
              setError('Failed to generate registration code. Please check server logs.');
            }
          }
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
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.trim().length < 2) {
      newErrors.username = 'Username must be at least 2 characters';
    }
    if (email.trim()) {
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
        username,
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
    // Allow alphanumeric characters (matching backend alphabet: 23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz)
    // Backend alphabet excludes: 0, O, I, 1, l (ambiguous characters)
    // Remove dashes first, then filter to valid characters, then limit to 12
    const validChars = '23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
    const cleaned = value
      .replace(/-/g, '')
      .split('')
      .filter(char => validChars.includes(char))
      .join('')
      .slice(0, 12);
    const parts: string[] = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.slice(i, i + 4));
    }
    return parts.join('-');
  };

  if (!isOpen) return null;

  return (
    <div className={modalStyles.overlay} role="dialog" aria-modal="true" aria-labelledby="create-user-modal-title">
      <div className={`${modalStyles.content} ${styles.root}`}>
        <div className={modalStyles.header}>
          <h2 id="create-user-modal-title">
            {step === 'code' || step === 'code-required'
              ? 'Create first account'
              : 'Create account'}
          </h2>
          <button
            type="button"
            className={modalStyles.close}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className={modalStyles.body}>
          {step === 'loading' && (
            <p className={styles.subtitle}>Checking registration…</p>
          )}

          {step === 'code-required' && (
            <p className={styles.subtitle}>
              No users exist yet. An administrator must generate a registration code first (e.g. from server logs or an admin tool), then you can create the first account.
            </p>
          )}

          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className={styles.form} noValidate>
              <p className={styles.subtitle}>
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
              <div className={styles.footer}>
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
            <form onSubmit={handleSubmitForm} className={styles.form} noValidate>
              {error && (
                <ErrorMessage message={error} onRetry={() => setError(null)} />
              )}
              <FormField
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={errors.username}
                required
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
              <FormField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                autoComplete="email"
                disabled={loading}
              />
              <div className={styles.formField}>
                <label htmlFor="create-user-password" className={styles.label}>
                  Password <span className={styles.requiredIndicator}>*</span>
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="create-user-password"
                    type={showPassword ? 'text' : 'password'}
                    className={errors.password ? `${styles.input} form-input error` : `${styles.input} form-input`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <LuEyeOff size={20} aria-hidden />
                    ) : (
                      <LuEye size={20} aria-hidden />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <span className={styles.error}>{errors.password}</span>
                )}
                <div className={styles.hint}>
                  At least 8 characters with uppercase, lowercase, number, and special character
                </div>
              </div>
              <div className={styles.formField}>
                <label htmlFor="create-user-confirm" className={styles.label}>
                  Confirm password <span className={styles.requiredIndicator}>*</span>
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="create-user-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={errors.confirmPassword || showPasswordMismatch ? `${styles.input} form-input error` : `${styles.input} form-input`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <LuEyeOff size={20} aria-hidden />
                    ) : (
                      <LuEye size={20} aria-hidden />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className={styles.error}>{errors.confirmPassword}</span>
                )}
                {!errors.confirmPassword && showPasswordMismatch && (
                  <span className={styles.passwordStatusMismatch}>Passwords do not match</span>
                )}
                {!errors.confirmPassword && passwordsMatch && (
                  <span className={styles.passwordStatusMatch}>Passwords match</span>
                )}
              </div>
              <div className={styles.footer}>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={loading || showPasswordMismatch}>
                  {loading ? 'Creating account…' : 'Create account'}
                </Button>
              </div>
            </form>
          )}

          {step === 'code-required' && (
            <div className={styles.footer}>
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

import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth as useAuthContext } from '../../../contexts/AuthContext';
import FormField, { FormFieldHint } from '@shared/components/FormField';
import Button from '@shared/components/Button';
import ErrorMessage from '@shared/components/ErrorMessage';
import Card from '@shared/components/Card';
import { ApiClientError } from '@lib/api-client';
import styles from './SignupPage.module.css';

function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();

  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const hasPassword = password.length > 0;
  const hasConfirmPassword = confirmPassword.length > 0;
  const passwordsMatch = hasPassword && hasConfirmPassword && password === confirmPassword;
  const showPasswordMismatch = hasConfirmPassword && password !== confirmPassword;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const hasMinLength = password.length >= 8;
  const passwordMeetsRequirements =
    hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSpecial;
  const passwordRequirements = [
    { label: 'At least 8 characters', met: hasMinLength },
    { label: 'One lowercase letter', met: hasLowercase },
    { label: 'One uppercase letter', met: hasUppercase },
    { label: 'One number', met: hasNumber },
    { label: 'One special character', met: hasSpecial },
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.trim().length < 2) {
      newErrors.username = 'Username must be at least 2 characters';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
        newErrors.password = 'Password must contain uppercase, lowercase, number, and special character';
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await register(email, password, username);
      navigate('/', { replace: true, state: { justRegistered: true } });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 409) {
          setError('An account with this email already exists');
        } else if (err.statusCode === 400) {
          setError(err.message || 'Invalid registration data. Please check your input.');
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

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <Card className={styles.card}>
          <div className={styles.header}>
            <img 
              src="/logo/trajectory.png" 
              alt="Trajectory Logo" 
              className={styles.logo}
            />
            <h1 className={styles.title}>Create Account</h1>
            <p className={styles.subtitle}>Sign up for Trajectory</p>
          </div>

          {error && (
            <ErrorMessage 
              message={error} 
              onRetry={() => setError(null)}
            />
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <FormField
              label="Username"
              type="text"
              value={username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
              error={errors.username}
              required
              autoComplete="username"
              autoFocus
              disabled={loading}
              aria-describedby={errors.username ? 'username-error' : undefined}
            />

            <FormField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
              disabled={loading}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />

            <div className={styles.passwordField}>
              <label htmlFor="password" className={styles.passwordLabel}>
                Password
                <span className={styles.requiredIndicator}>*</span>
              </label>
              <div className={styles.passwordInputWrapper}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${styles.passwordInput} ${errors.password ? 'error' : ''}`}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && (
                <span className={styles.passwordError} id="password-error">
                  {errors.password}
                </span>
              )}
              <FormFieldHint>
                Password must include all of the following:
              </FormFieldHint>
              <ul className={styles.passwordRequirements} aria-live="polite">
                {passwordRequirements.map((requirement) => (
                  <li
                    key={requirement.label}
                    className={requirement.met ? styles.requirementMet : styles.requirementPending}
                  >
                    <span className={styles.requirementIcon} aria-hidden>
                      {requirement.met ? '✓' : '•'}
                    </span>
                    {requirement.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.passwordField}>
              <label htmlFor="confirmPassword" className={styles.passwordLabel}>
                Confirm Password
                <span className={styles.requiredIndicator}>*</span>
              </label>
              <div className={styles.passwordInputWrapper}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`${styles.passwordInput} ${errors.confirmPassword || showPasswordMismatch ? 'error' : ''}`}
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className={styles.passwordError} id="confirm-password-error">
                  {errors.confirmPassword}
                </span>
              )}
              {!errors.confirmPassword && showPasswordMismatch && (
                <span className={styles.passwordStatusMismatch}>Passwords do not match</span>
              )}
              {!errors.confirmPassword && passwordsMatch && (
                <span className={styles.passwordStatusMatch}>Passwords match</span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading || showPasswordMismatch || !passwordMeetsRequirements}
              className={styles.button}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <div className={styles.footer}>
            <p>
              Already have an account?{' '}
              <Link to="/login" className={styles.registerLink}>
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SignupPage;

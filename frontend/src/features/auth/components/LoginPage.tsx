import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import FormField from '@shared/components/FormField';
import Button from '@shared/components/Button';
import Card from '@shared/components/Card';
import CreateUserModal from '@shared/components/CreateUserModal';
import { ApiClientError } from '@lib/api-client';
import { useAuth as useAuthContext } from '../../../contexts/AuthContext';
import styles from './LoginPage.module.css';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  const { login, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!password) {
      newErrors.password = 'Password is required';
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
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setError('Invalid username or password');
        } else if (err.statusCode === 429) {
          setError('Too many login attempts. Please try again later.');
        } else {
          setError(err.message || 'Login failed. Please try again.');
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
            <h1 className={styles.title}>Welcome to Trajectory</h1>
            <p className={styles.subtitle}>Sign in to your account</p>
          </div>

          {error && (
            <div role="alert" className={styles.alert}>
              {error}
            </div>
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

            <div className={styles.formField}>
              <label htmlFor="password" className={styles.formLabel}>
                Password
                <span className={styles.requiredIndicator}>*</span>
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={errors.password ? `${styles.formInput} ${styles.error}` : styles.formInput}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
                  {showPassword ? (
                    <LuEyeOff className={styles.passwordToggleIcon} size={20} aria-hidden />
                  ) : (
                    <LuEye className={styles.passwordToggleIcon} size={20} aria-hidden />
                  )}
                </button>
              </div>
              {errors.password && (
                <span className={styles.formError} id="password-error">
                  {errors.password}
                </span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              className={styles.button}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className={styles.footer}>
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                className={`${styles.registerLink} ${styles.buttonAsLink}`}
                onClick={() => setCreateUserOpen(true)}
              >
                Create account
              </button>
            </p>
          </div>
        </Card>
      </div>

      <CreateUserModal
        isOpen={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onSuccess={() => setCreateUserOpen(false)}
      />
    </div>
  );
}

export default LoginPage;

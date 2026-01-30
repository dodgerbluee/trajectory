import { useState, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { useAuth } from '../contexts/AuthContext';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Card from '../components/Card';
import CreateUserModal from '../components/CreateUserModal';
import { ApiClientError } from '../lib/api-client';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  // Redirect if already authenticated
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
    <div className="login-page">
      <div className="login-container">
        <Card className="login-card">
          <div className="login-header">
            <img 
              src="/logo/trajectory.png" 
              alt="Trajectory Logo" 
              className="login-logo"
            />
            <h1 className="login-title">Welcome to Trajectory</h1>
            <p className="login-subtitle">Sign in to your account</p>
          </div>

          {error && (
            <div role="alert" className="login-alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
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

            <div className="form-field">
              <label htmlFor="password" className="form-label">
                Password
                <span className="required-indicator">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <LuEyeOff className="password-toggle-icon" size={20} aria-hidden />
                  ) : (
                    <LuEye className="password-toggle-icon" size={20} aria-hidden />
                  )}
                </button>
              </div>
              {errors.password && (
                <span className="form-error" id="password-error">
                  {errors.password}
                </span>
              )}
            </div>

            <div className="login-actions">
              <Link to="/forgot-password" className="forgot-password-link">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              className="login-button"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="login-footer">
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                className="register-link button-as-link"
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

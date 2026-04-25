import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import FormField from '@shared/components/FormField';
import { useAuth } from '../../../contexts/AuthContext';
import { ApiClientError } from '@lib/api-client';
import { API_BASE_URL } from '@lib/env.js';
import styles from './LoginPage.module.css';

const ACCESS_COOKIE = 'trajectory_access_token';
const REFRESH_COOKIE = 'trajectory_refresh_token';
const USER_COOKIE = 'trajectory_user';

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const parts = document.cookie.split('; ');
  const found = parts.find((c) => c.startsWith(prefix));
  return found ? decodeURIComponent(found.substring(prefix.length)) : null;
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

interface SessionUser {
  id: number;
  email: string;
  username: string;
  isInstanceAdmin?: boolean;
  onboardingCompleted?: boolean;
}

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setSession } = useAuth();

  const linkRequired = params.get('linkRequired') === 'true';
  const linkToken = params.get('linkToken') || '';
  const targetUsername = params.get('username') || '';
  const errorParam = params.get('error');

  const [status, setStatus] = useState<'processing' | 'link' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Account-link form state
  const [linkPassword, setLinkPassword] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam) {
      setErrorMsg(errorParam);
      setStatus('error');
      return;
    }

    if (linkRequired) {
      setStatus('link');
      return;
    }

    const accessToken = readCookie(ACCESS_COOKIE);
    const refreshTokenValue = readCookie(REFRESH_COOKIE);
    const userJson = readCookie(USER_COOKIE);

    clearCookie(ACCESS_COOKIE);
    clearCookie(REFRESH_COOKIE);
    clearCookie(USER_COOKIE);

    if (!accessToken || !refreshTokenValue || !userJson) {
      setErrorMsg(
        'Sign-in did not complete. Your session may have expired — please try again.'
      );
      setStatus('error');
      return;
    }

    try {
      const user = JSON.parse(userJson) as SessionUser;
      setSession(
        {
          id: user.id,
          email: user.email,
          username: user.username,
          isInstanceAdmin: user.isInstanceAdmin,
          onboardingCompleted: user.onboardingCompleted,
        },
        accessToken,
        refreshTokenValue
      );
      navigate('/', { replace: true });
    } catch {
      setErrorMsg('Failed to parse sign-in response. Please try again.');
      setStatus('error');
    }
  }, [errorParam, linkRequired, navigate, setSession]);

  const handleLinkSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!linkPassword) {
      setLinkError('Password is required');
      return;
    }
    setLinkSubmitting(true);
    setLinkError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/oauth/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkToken, password: linkPassword }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new ApiClientError(
          body?.error?.message ?? 'Linking failed',
          response.status,
          body?.error?.type ?? 'Error'
        );
      }
      const data = body.data as {
        user: SessionUser;
        accessToken: string;
        refreshToken: string;
      };
      setSession(
        {
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
          isInstanceAdmin: data.user.isInstanceAdmin,
          onboardingCompleted: data.user.onboardingCompleted,
        },
        data.accessToken,
        data.refreshToken
      );
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setLinkError(err.message);
      } else {
        setLinkError('Linking failed. Please try again.');
      }
    } finally {
      setLinkSubmitting(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <Card className={styles.card}>
          {status === 'processing' && (
            <div className={styles.header}>
              <h1 className={styles.title}>Signing you in…</h1>
              <p className={styles.subtitle}>One moment while we finish setting up your session.</p>
            </div>
          )}

          {status === 'error' && (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>Sign-in failed</h1>
                <p className={styles.subtitle}>{errorMsg}</p>
              </div>
              <Button variant="primary" fullWidth onClick={() => navigate('/login', { replace: true })}>
                Back to sign in
              </Button>
            </>
          )}

          {status === 'link' && (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>Link your account</h1>
                <p className={styles.subtitle}>
                  An account already exists for <strong>{targetUsername}</strong>. Enter your
                  password to link it to your SSO identity.
                </p>
              </div>
              {linkError && (
                <div role="alert" className={styles.alert}>
                  {linkError}
                </div>
              )}
              <form onSubmit={handleLinkSubmit} className={styles.form} noValidate>
                <FormField
                  label="Password"
                  type="password"
                  value={linkPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="current-password"
                  disabled={linkSubmitting}
                />
                <Button type="submit" variant="primary" fullWidth disabled={linkSubmitting}>
                  {linkSubmitting ? 'Linking…' : 'Link account'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  disabled={linkSubmitting}
                  onClick={() => navigate('/login', { replace: true })}
                >
                  Cancel
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default OAuthCallbackPage;

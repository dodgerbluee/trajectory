import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth as useAuthContext } from '../../../contexts/AuthContext';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import ErrorMessage from '@shared/components/ErrorMessage';
import CreateUserModal from '@shared/components/CreateUserModal';
import { invitesApi, ApiClientError } from '@lib/api-client';
import styles from './InvitePage.module.css';

function InvitePage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';
  const [token, setToken] = useState(tokenFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const parseTokenFromInput = (value: string): string => {
    const trimmed = value.trim();
    try {
      const url = new URL(trimmed);
      const t = url.searchParams.get('token');
      return t ?? trimmed;
    } catch {
      return trimmed;
    }
  };

  const handleJoinFamily = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const raw = token.trim();
    if (!raw) {
      setError('Enter the invite link or token');
      return;
    }
    const parsedToken = parseTokenFromInput(raw);
    setToken(parsedToken);

    if (!isAuthenticated) {
      return;
    }
    setLoading(true);
    try {
      const res = await invitesApi.accept(parsedToken);
      const familyName = res.data.family_name ?? 'Family';
      navigate('/', { replace: true, state: { fromInvite: true, message: `You've joined the ${familyName} family!` } });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'Failed to accept invite');
      } else {
        setError('Failed to accept invite');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccountSuccess = async () => {
    setCreateUserOpen(false);
    const trimmed = token.trim();
    if (!trimmed) return;
    try {
      const res = await invitesApi.accept(trimmed);
      const familyName = res.data.family_name ?? 'Family';
      navigate('/', { replace: true, state: { fromInvite: true, message: `You've joined the ${familyName} family!` } });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to join family');
    }
  };

  if (authLoading) {
    return (
      <div className={styles.root}>
        <div className={styles.container}>
          <Card className={styles.card}>
            <p className={styles.subtitle}>Loading…</p>
          </Card>
        </div>
      </div>
    );
  }

  const hasToken = token.trim().length > 0;

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
            <h1 className={styles.title}>Accept family invite</h1>
            {hasToken ? (
              isAuthenticated ? (
                <p className={styles.subtitle}>
                  You're signed in. Click below to join the family.
                </p>
              ) : (
                <p className={styles.subtitle}>
                  Create an account to join this family and get access.
                </p>
              )
            ) : (
              <p className={styles.subtitle}>
                Paste the invite link or token you received to join the family.
              </p>
            )}
          </div>

          {error && (
            <ErrorMessage message={error} onRetry={() => setError(null)} />
          )}

          {hasToken && isAuthenticated && (
            <form onSubmit={handleJoinFamily} className={styles.form} noValidate>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading}
                className={styles.button}
              >
                {loading ? 'Joining…' : 'Join family'}
              </Button>
            </form>
          )}

          {hasToken && !isAuthenticated && (
            <>
              <div className={styles.form}>
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  className={styles.button}
                  onClick={() => setCreateUserOpen(true)}
                >
                  Create account to join
                </Button>
                <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    state={{ from: `/invite?token=${encodeURIComponent(token.trim())}` }}
                    className={styles.buttonAsLink}
                  >
                    Sign in
                  </Link>
                </p>
              </div>
              <CreateUserModal
                isOpen={createUserOpen}
                onClose={() => setCreateUserOpen(false)}
                onSuccess={handleCreateAccountSuccess}
                inviteToken={token.trim() || undefined}
              />
            </>
          )}

          {!hasToken && (
            <form onSubmit={handleJoinFamily} className={styles.form} noValidate>
              <div className={styles.formField}>
                <label htmlFor="invite-token" className={styles.formLabel}>
                  Invite link or token
                  <span className={styles.requiredIndicator}>*</span>
                </label>
                <input
                  id="invite-token"
                  type="text"
                  className={styles.formInput}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste the invite link or token"
                  autoComplete="one-time-code"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading || !token.trim()}
                className={styles.button}
              >
                Continue
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

export default InvitePage;

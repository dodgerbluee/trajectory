import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import CreateUserModal from '../components/CreateUserModal';
import { invitesApi, ApiClientError } from '../lib/api-client';

function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';
  const [token, setToken] = useState(tokenFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  /** Extract invite token from pasted value (full URL or raw token). */
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
      // Show create account / sign in flow; token is now in state
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
      <div className="login-page">
        <div className="login-container">
          <Card className="login-card">
            <p className="login-subtitle">Loading…</p>
          </Card>
        </div>
      </div>
    );
  }

  const hasToken = token.trim().length > 0;

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
            <h1 className="login-title">Accept family invite</h1>
            {hasToken ? (
              isAuthenticated ? (
                <p className="login-subtitle">
                  You're signed in. Click below to join the family.
                </p>
              ) : (
                <p className="login-subtitle">
                  Create an account to join this family and get access.
                </p>
              )
            ) : (
              <p className="login-subtitle">
                Paste the invite link or token you received to join the family.
              </p>
            )}
          </div>

          {error && (
            <ErrorMessage message={error} onRetry={() => setError(null)} />
          )}

          {hasToken && isAuthenticated && (
            <form onSubmit={handleJoinFamily} className="login-form" noValidate>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading}
                className="login-button"
              >
                {loading ? 'Joining…' : 'Join family'}
              </Button>
            </form>
          )}

          {hasToken && !isAuthenticated && (
            <>
              <div className="login-form">
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  className="login-button"
                  onClick={() => setCreateUserOpen(true)}
                >
                  Create account to join
                </Button>
                <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    state={{ from: `/invite?token=${encodeURIComponent(token.trim())}` }}
                    className="button-as-link"
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
            <form onSubmit={handleJoinFamily} className="login-form" noValidate>
              <div className="form-field">
                <label htmlFor="invite-token" className="form-label">
                  Invite link or token
                  <span className="required-indicator">*</span>
                </label>
                <input
                  id="invite-token"
                  type="text"
                  className="form-input"
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
                className="login-button"
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

export default InviteAcceptPage;

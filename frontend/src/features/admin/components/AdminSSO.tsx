import { useEffect, useState } from 'react';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import Notification from '@shared/components/Notification';
import { LuPlus } from 'react-icons/lu';
import { oauthProvidersApi, type OAuthProviderConfig } from '@lib/api-client';
import SSOProviderModal from './SSOProviderModal';
import styles from './AdminSSO.module.css';

export default function AdminSSO() {
  const [providers, setProviders] = useState<OAuthProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<OAuthProviderConfig | null>(null);
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const reload = () => {
    setLoading(true);
    oauthProvidersApi
      .list()
      .then((res) => setProviders(res.data))
      .catch(() => setNotification({ message: 'Failed to load SSO providers', type: 'error' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const handleDelete = async (provider: OAuthProviderConfig) => {
    if (!window.confirm(`Delete SSO provider "${provider.name}"?`)) return;
    try {
      await oauthProvidersApi.remove(provider.id);
      setNotification({ message: `Deleted ${provider.name}`, type: 'success' });
      reload();
    } catch (err) {
      setNotification({
        message: err instanceof Error ? err.message : 'Failed to delete provider',
        type: 'error',
      });
    }
  };

  if (loading) return <LoadingSpinner message="Loading SSO providers..." />;

  return (
    <div className={styles.layout}>
      <Card title="SSO providers">
        <div className={styles.headerRow}>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Configure OpenID Connect providers (Authentik, Keycloak, Okta, etc.).
          </p>
          <Button variant="primary" onClick={() => setCreating(true)}>
            <LuPlus aria-hidden /> Add provider
          </Button>
        </div>

        {providers.length === 0 ? (
          <div className={styles.empty}>
            No SSO providers configured. Add one to allow users to sign in via OpenID Connect.
          </div>
        ) : (
          <div className={styles.list}>
            {providers.map((p) => (
              <div key={p.id} className={styles.providerCard}>
                <div className={styles.providerHead}>
                  <div className={styles.providerNameRow}>
                    <h3 className={styles.providerName}>{p.displayName}</h3>
                    <span className={styles.providerSlug}>{p.name}</span>
                    <span className={`${styles.badge} ${p.enabled ? styles.badgeEnabled : styles.badgeDisabled}`}>
                      {p.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className={styles.providerActions}>
                    <Button variant="secondary" onClick={() => setEditing(p)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(p)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <dl className={styles.metaList}>
                  <dt>Type</dt>
                  <dd>{p.providerType}</dd>
                  <dt>Issuer</dt>
                  <dd>{p.issuerUrl}</dd>
                  <dt>Client ID</dt>
                  <dd>{p.clientId}</dd>
                  <dt>Scopes</dt>
                  <dd>{p.scopes}</dd>
                  <dt>Auto-register</dt>
                  <dd>{p.autoRegister ? 'Yes' : 'No'}</dd>
                </dl>
              </div>
            ))}
          </div>
        )}
      </Card>

      {(creating || editing) && (
        <SSOProviderModal
          provider={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            setNotification({ message: 'Provider saved', type: 'success' });
            reload();
          }}
        />
      )}

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

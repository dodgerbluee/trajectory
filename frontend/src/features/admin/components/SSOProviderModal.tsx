import { useState, FormEvent } from 'react';
import { HiX } from 'react-icons/hi';
import Button from '@shared/components/Button';
import FormField from '@shared/components/FormField';
import Notification from '@shared/components/Notification';
import {
  oauthProvidersApi,
  type OAuthProviderConfig,
  type OAuthProviderCreateInput,
} from '@lib/api-client';
import modalStyles from '@shared/components/Modal.module.css';
import styles from './AdminSSO.module.css';

interface Props {
  provider: OAuthProviderConfig | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function SSOProviderModal({ provider, onClose, onSaved }: Props) {
  const isEdit = !!provider;
  const [name, setName] = useState(provider?.name ?? '');
  const [displayName, setDisplayName] = useState(provider?.displayName ?? '');
  const [providerType, setProviderType] = useState<'authentik' | 'generic_oidc'>(
    provider?.providerType ?? 'authentik'
  );
  const [clientId, setClientId] = useState(provider?.clientId ?? '');
  const [clientSecret, setClientSecret] = useState('');
  const [issuerUrl, setIssuerUrl] = useState(provider?.issuerUrl ?? '');
  const [scopes, setScopes] = useState(provider?.scopes ?? 'openid,profile,email');
  const [autoRegister, setAutoRegister] = useState(provider?.autoRegister ?? true);
  const [enabled, setEnabled] = useState(provider?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isEdit && provider) {
        await oauthProvidersApi.update(provider.id, {
          displayName,
          providerType,
          clientId,
          clientSecret: clientSecret || undefined,
          issuerUrl,
          scopes,
          autoRegister,
          enabled,
        });
      } else {
        const payload: OAuthProviderCreateInput = {
          name: name.trim(),
          displayName,
          providerType,
          clientId,
          clientSecret,
          issuerUrl,
          scopes,
          autoRegister,
          enabled,
        };
        await oauthProvidersApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={modalStyles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sso-provider-modal-title"
      onClick={onClose}
    >
      <div className={modalStyles.content} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <h2 id="sso-provider-modal-title" style={{ margin: 0 }}>
            {isEdit ? `Edit provider: ${provider?.name}` : 'Add SSO provider'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <HiX size={20} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm} noValidate>
          <div className={styles.modalRow}>
            <FormField
              label="Identifier"
              type="text"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
              disabled={isEdit || saving}
              placeholder="e.g. authentik"
              autoComplete="off"
            />
            <FormField
              label="Display name"
              type="text"
              value={displayName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
              required
              disabled={saving}
              placeholder="e.g. Company SSO"
              autoComplete="off"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: '4px' }}>
              Provider type
            </label>
            <select
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as 'authentik' | 'generic_oidc')}
              disabled={saving}
              style={{ padding: 'var(--spacing-sm) var(--spacing-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit', width: '100%' }}
            >
              <option value="authentik">Authentik</option>
              <option value="generic_oidc">Generic OIDC</option>
            </select>
          </div>

          <FormField
            label="Issuer URL"
            type="text"
            value={issuerUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIssuerUrl(e.target.value)}
            required
            disabled={saving}
            placeholder="https://auth.example.com/application/o/trajectory/"
            autoComplete="off"
          />

          <FormField
            label="Client ID"
            type="text"
            value={clientId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientId(e.target.value)}
            required
            disabled={saving}
            autoComplete="off"
          />

          <FormField
            label={isEdit ? 'Client secret (leave blank to keep current)' : 'Client secret'}
            type="password"
            value={clientSecret}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientSecret(e.target.value)}
            required={!isEdit}
            disabled={saving}
            autoComplete="new-password"
          />

          <FormField
            label="Scopes (comma-separated)"
            type="text"
            value={scopes}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScopes(e.target.value)}
            disabled={saving}
            autoComplete="off"
          />

          <div className={styles.checkboxRow}>
            <input
              id="sso-auto-register"
              type="checkbox"
              checked={autoRegister}
              onChange={(e) => setAutoRegister(e.target.checked)}
              disabled={saving}
            />
            <label htmlFor="sso-auto-register">Auto-create users on first sign-in</label>
          </div>

          <div className={styles.checkboxRow}>
            <input
              id="sso-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={saving}
            />
            <label htmlFor="sso-enabled">Enabled</label>
          </div>

          <div className={styles.modalFooter}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create provider'}
            </Button>
          </div>
        </form>

        {error && <Notification message={error} type="error" onClose={() => setError(null)} />}
      </div>
    </div>
  );
}

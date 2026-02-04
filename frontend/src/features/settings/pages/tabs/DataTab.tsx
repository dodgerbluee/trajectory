import { useState } from 'react';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import { LuDownload } from 'react-icons/lu';
import { ApiClientError, exportApi } from '@lib/api-client';
import { useFamilyPermissions } from '@/contexts/FamilyPermissionsContext';
import s from '../SettingsPage.module.css';
import type { NotifyFn } from './types';

export default function DataTab({ notify }: { notify: NotifyFn }) {
  const { canEdit } = useFamilyPermissions();
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      await exportApi.download();
      notify(
        {
          message: 'Export downloaded (ZIP with JSON, HTML report, and attachments)',
          type: 'success',
        },
        4000
      );
    } catch (err) {
      notify(
        {
          message: err instanceof ApiClientError ? err.message || 'Export failed' : 'Export failed',
          type: 'error',
        },
        4000
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={s.layout}>
      <Card title="Data Management">
        <div className={s.section}>
          <label className={s.label}>Export Data</label>
          <p className={s.description}>
            {canEdit
              ? 'Download all your data as a ZIP (JSON, HTML report, and attachments). Only parents and owners can export.'
              : 'Only parents and owners can export data. Read-only members do not have export access.'}
          </p>
          <p
            className={s.description}
            style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}
          >
            This feature is in dev/beta and is not functional yet.
          </p>
          {canEdit && (
            <Button variant="secondary" onClick={handleExportData} disabled={exporting}>
              <LuDownload style={{ marginRight: 8 }} /> {exporting ? 'Preparing…' : 'Export my data'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

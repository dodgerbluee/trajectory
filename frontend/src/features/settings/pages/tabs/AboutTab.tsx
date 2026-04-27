import Card from '@shared/components/Card';
import packageJson from '../../../../../package.json';
import s from '../SettingsPage.module.css';

// Match the version-resolution used by VersionFooter / MoreMenuSheet:
// build-time VITE_APP_VERSION wins, fall back to package.json so dev runs
// always reflect the real package version (no hardcoded drift).
const version = (import.meta.env?.VITE_APP_VERSION as string) || packageJson.version;

export default function AboutTab() {
  return (
    <div className={s.layout}>
      <Card title="About">
        <div className={s.section}>
          <div className={s.aboutItem}>
            <span className={s.aboutLabel}>Version:</span>
            <span className={s.aboutValue}>{version}</span>
          </div>
          <div className={s.aboutItem}>
            <span className={s.aboutLabel}>License:</span>
            <span className={s.aboutValue}>Private</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

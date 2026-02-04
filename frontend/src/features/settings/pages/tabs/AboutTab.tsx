import Card from '@shared/components/Card';
import s from '../SettingsPage.module.css';

export default function AboutTab() {
  return (
    <div className={s.layout}>
      <Card title="About">
        <div className={s.section}>
          <div className={s.aboutItem}>
            <span className={s.aboutLabel}>Version:</span>
            <span className={s.aboutValue}>1.0.0</span>
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

import Card from '@shared/components/Card';
import FormField from '@shared/components/FormField';
import Button from '@shared/components/Button';
import layout from '@shared/styles/SettingsLayout.module.css';
import s from '../SettingsPage.module.css';
import { LuSun, LuMoon, LuLaptop, LuSave } from 'react-icons/lu';
import { useTheme } from '@/contexts/ThemeContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { type DateFormat } from '@lib/date-utils';
import type { NotifyFn } from './types';

export default function GeneralTab({ notify }: { notify: NotifyFn }) {
  const { theme, setTheme } = useTheme();
  const { dateFormat, setDateFormat } = usePreferences();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    notify({ message: 'Theme preference saved', type: 'success' });
  };

  const handleDateFormatChange = (newFormat: DateFormat) => {
    setDateFormat(newFormat);
    notify({ message: 'Date format preference saved', type: 'success' });
  };

  return (
    <div className={s.layout}>
      <Card title="Preferences">
        <div className={s.section}>
          <label className={s.label}>Theme</label>
          <p className={s.description}>Choose your preferred color theme</p>
          <div className={s.themeSelector}>
            <button
              className={`${s.themeOption} ${theme === 'light' ? s.active : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <LuSun className={s.themeOptionIcon} />
              <span className={s.themeOptionLabel}>Light</span>
            </button>
            <button
              className={`${s.themeOption} ${theme === 'dark' ? s.active : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <LuMoon className={s.themeOptionIcon} />
              <span className={s.themeOptionLabel}>Dark</span>
            </button>
            <button
              className={`${s.themeOption} ${theme === 'system' ? s.active : ''}`}
              onClick={() => handleThemeChange('system')}
            >
              <LuLaptop className={s.themeOptionIcon} />
              <span className={s.themeOptionLabel}>System</span>
            </button>
          </div>
        </div>

        <div className={s.section}>
          <FormField
            label="Date Format"
            type="select"
            value={dateFormat}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              handleDateFormatChange(e.target.value as DateFormat)
            }
            options={[
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
            ]}
          />
        </div>

        <div className={layout.saveRow}>
          <Button
            variant="primary"
            type="button"
            onClick={() => notify({ message: 'Settings saved', type: 'success' })}
          >
            <LuSave style={{ marginRight: 8 }} /> Save
          </Button>
        </div>

        <div className={s.supportSection}>
          <h4 className={s.supportSectionTitle}>Support</h4>
          <div className={s.supportContent}>
            <a
              href="https://www.buymeacoffee.com/dodgerbluel"
              target="_blank"
              rel="noopener noreferrer"
              className={s.supportCoffeeLink}
            >
              <img
                src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png"
                alt="Buy Me A Coffee"
                className={s.supportCoffeeButton}
              />
            </a>
            <p className={s.supportText}>
              Enjoying Trajectory? Consider supporting the project to help keep it running and improving.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

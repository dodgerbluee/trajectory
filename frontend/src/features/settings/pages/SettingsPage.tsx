import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { usePreferences } from '../../../contexts/PreferencesContext';
import { useAuth } from '../../../contexts/AuthContext';
import Card from '@shared/components/Card';
import FormField, { FormFieldHint } from '@shared/components/FormField';
import Button from '@shared/components/Button';
import Notification from '@shared/components/Notification';
import Tabs from '@shared/components/Tabs';
import { ChildAvatar } from '@features/children';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { FaLock } from 'react-icons/fa';
import { LuSun, LuMoon, LuLaptop, LuSave, LuDownload, LuSettings, LuUser, LuUsers, LuUserPlus, LuInfo } from 'react-icons/lu';
import { ApiClientError, exportApi, familiesApi, childrenApi } from '@lib/api-client';
import type { Family, FamilyInvite, FamilyMember, Child } from '@shared/types/api';
import { FamilyOverviewCard, MemberRow, InviteRow } from '../components';
import RoleBadge from '@shared/components/RoleBadge';
import layout from '@shared/styles/SettingsLayout.module.css';
import pageLayout from '@shared/styles/page-layout.module.css';
import s from './SettingsPage.module.css';
import modalStyles from '@shared/components/Modal.module.css';
import mui from '@shared/styles/MeasurementsUI.module.css';
import { useFamilyPermissions } from '../../../contexts/FamilyPermissionsContext';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { formatDate, calculateAge, formatAge, type DateFormat } from '@lib/date-utils';

const NOTIFICATION_DISMISS_MS = 3000;
const NOTIFICATION_DISMISS_MS_LONG = 4000;
const NOTIFICATION_DISMISS_MS_SHORT = 2000;

function SettingsPage() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { dateFormat, setDateFormat } = usePreferences();
  const { user, updateUsername, updatePassword, checkAuth } = useAuth();
  const { canEdit, refreshPermissions } = useFamilyPermissions();
  const onboarding = useOnboarding();
  const [activeTab, setActiveTab] = useState<'general' | 'user' | 'data' | 'family' | 'about'>('general');
  const [familySubTab, setFamilySubTab] = useState<'management' | 'members'>('members');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // User management state
  const [usernameExpanded, setUsernameExpanded] = useState(false);
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    usernamePassword: false,
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [loading, setLoading] = useState({
    username: false,
    password: false,
    export: false,
    family: false,
    familyCreate: false,
    invite: false,
    familyRename: false,
    familyDelete: false,
    familyLeave: false,
  });
  const [familyActionId, setFamilyActionId] = useState<number | null>(null);
  const [deleteConfirmFamily, setDeleteConfirmFamily] = useState<Family | null>(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [deleteConfirmChild, setDeleteConfirmChild] = useState<Child | null>(null);
  const [confirmDeleteChildInput, setConfirmDeleteChildInput] = useState('');
  const [leaveConfirmFamily, setLeaveConfirmFamily] = useState<Family | null>(null);
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyNameError, setNewFamilyNameError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Family state
  const INVITE_TOKENS_KEY = 'trajectory_invite_tokens';
  const [families, setFamilies] = useState<Family[]>([]);
  const [membersByFamily, setMembersByFamily] = useState<Record<number, FamilyMember[]>>({});
  const [invitesByFamily, setInvitesByFamily] = useState<Record<number, FamilyInvite[]>>({});
  const [newInviteToken, setNewInviteToken] = useState<{ familyId: number; token: string; role: string } | null>(null);
  const [createInviteRole, setCreateInviteRole] = useState<'parent' | 'read_only'>('parent');
  const [inviteTokens, setInviteTokens] = useState<Record<number, string>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(INVITE_TOKENS_KEY) || '{}');
    } catch {
      return {};
    }
  });

  // Kids (Members tab): list of children + Add Child
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [loadingKids, setLoadingKids] = useState(false);
  const [errorKids, setErrorKids] = useState<string | null>(null);
  const [deletingChildId, setDeletingChildId] = useState<number | null>(null);

  // Saving member role (familyId + userId) for inline role edit
  const [savingMemberRole, setSavingMemberRole] = useState<{ familyId: number; userId: number } | null>(null);

  // Open Family tab + sub-tab when navigating from dropdown (e.g. Family link)
  useEffect(() => {
    const state = location.state as { tab?: string; familySubTab?: string } | null;
    if (state?.tab === 'family') {
      setActiveTab('family');
      if (state.familySubTab === 'management') setFamilySubTab('management');
      else if (state.familySubTab === 'members') setFamilySubTab('members');
    }
  }, [location.state]);

  // Onboarding: when user is on Settings > Family, advance step so overlay shows "Create family" / "Add child"
  useEffect(() => {
    if (activeTab === 'family' && onboarding?.isActive && onboarding.step === 'go_settings_family') {
      onboarding.reportOnSettingsFamilyTab();
    }
  }, [activeTab, onboarding?.isActive, onboarding?.step, onboarding]);

  useEffect(() => {
    // Refresh user data when component mounts
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (activeTab !== 'family') return;
    let cancelled = false;
    setLoading((l) => ({ ...l, family: true }));
    familiesApi
      .getAll()
      .then((res) => {
        if (cancelled) return;
        setFamilies(res.data);
        return Promise.all([
          ...res.data.map((f) =>
            familiesApi.getMembers(f.id).then((memRes) => {
              if (!cancelled) setMembersByFamily((prev) => ({ ...prev, [f.id]: memRes.data }));
            })
          ),
          ...res.data
            .filter((f) => f.role === 'owner' || f.role === 'parent')
            .map((f) =>
              familiesApi.getInvites(f.id).then((invRes) => {
                if (!cancelled) setInvitesByFamily((prev) => ({ ...prev, [f.id]: invRes.data }));
              })
            ),
        ]);
      })
      .catch(() => {
        if (!cancelled) setNotification({ message: 'Failed to load families', type: 'error' });
      })
      .finally(() => {
        if (!cancelled) setLoading((l) => ({ ...l, family: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const loadFamilies = async () => {
    setLoading((l) => ({ ...l, family: true }));
    try {
      const res = await familiesApi.getAll();
      setFamilies(res.data);
      await Promise.all([
        ...res.data.map((f) =>
          familiesApi.getMembers(f.id).then((memRes) =>
            setMembersByFamily((prev) => ({ ...prev, [f.id]: memRes.data }))
          )
        ),
        ...res.data
          .filter((f) => f.role === 'owner' || f.role === 'parent')
          .map((f) =>
            familiesApi.getInvites(f.id).then((invRes) =>
              setInvitesByFamily((prev) => ({ ...prev, [f.id]: invRes.data }))
            )
          ),
      ]);
    } catch {
      setNotification({ message: 'Failed to load families', type: 'error' });
    } finally {
      setLoading((l) => ({ ...l, family: false }));
    }
  };

  const handleAddFamily = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNewFamilyNameError('Family name is required');
      return;
    }
    setNewFamilyNameError(null);
    setLoading((l) => ({ ...l, familyCreate: true }));
    try {
      await familiesApi.create(trimmed);
      setNotification({ message: 'Family created.', type: 'success' });
      setShowAddFamilyModal(false);
      setNewFamilyName('');
      await loadFamilies();
      await loadChildren();
      onboarding?.reportFamilyCreated();
    } catch (err) {
      setNotification({
        message: err instanceof ApiClientError ? err.message : 'Failed to create family',
        type: 'error',
      });
    } finally {
      setLoading((l) => ({ ...l, familyCreate: false }));
    }
  };

  const loadChildren = async () => {
    setLoadingKids(true);
    setErrorKids(null);
    try {
      const res = await childrenApi.getAll();
      setChildrenList(res.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorKids(err.message);
      } else {
        setErrorKids('Failed to load children');
      }
    } finally {
      setLoadingKids(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'family' && familySubTab === 'members') {
      loadChildren();
    }
  }, [activeTab, familySubTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteChild = async (child: Child) => {
    setDeletingChildId(child.id);
    setNotification(null);
    try {
      await childrenApi.delete(child.id);
      setChildrenList((prev) => prev.filter((c) => c.id !== child.id));
      setNotification({ message: `${child.name} has been deleted`, type: 'success' });
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
      setDeleteConfirmChild(null);
      setConfirmDeleteChildInput('');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setNotification({ message: err.message || 'Failed to delete child', type: 'error' });
      } else {
        setNotification({ message: 'Failed to delete child', type: 'error' });
      }
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS_LONG);
    } finally {
      setDeletingChildId(null);
    }
  };

  /** Children grouped by family_id for Members tab. Fallback: missing family_id → first family. */
  const childrenByFamilyId = useMemo(() => {
    const map: Record<number, Child[]> = {};
    for (const f of families) map[f.id] = [];
    for (const c of childrenList) {
      const fid = c.family_id ?? families[0]?.id;
      if (fid != null && map[fid]) map[fid].push(c);
    }
    for (const id of Object.keys(map)) {
      map[Number(id)].sort(
        (a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime()
      );
    }
    return map;
  }, [families, childrenList]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setNotification({ message: 'Theme preference saved', type: 'success' });
    setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
  };

  const handleDateFormatChange = (newFormat: DateFormat) => {
    setDateFormat(newFormat);
    setNotification({ message: 'Date format preference saved', type: 'success' });
    setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
  };

  const handleExportData = async () => {
    setLoading((l) => ({ ...l, export: true }));
    setNotification(null);
    try {
      await exportApi.download();
      setNotification({ message: 'Export downloaded (ZIP with JSON, HTML report, and attachments)', type: 'success' });
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS_LONG);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setNotification({ message: err.message || 'Export failed', type: 'error' });
      } else {
        setNotification({ message: 'Export failed', type: 'error' });
      }
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS_LONG);
    } finally {
      setLoading((l) => ({ ...l, export: false }));
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!newUsername.trim()) {
      setErrors({ username: 'New username is required' });
      return;
    }

    if (newUsername.trim().length < 2) {
      setErrors({ username: 'Username must be at least 2 characters' });
      return;
    }

    if (!usernamePassword) {
      setErrors({ usernamePassword: 'Current password is required' });
      return;
    }

    setLoading({ ...loading, username: true });

    try {
      await updateUsername(newUsername.trim(), usernamePassword);
      setNotification({ message: 'Username updated successfully', type: 'success' });
      setNewUsername('');
      setUsernamePassword('');
      setUsernameExpanded(false);
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setErrors({ usernamePassword: 'Current password is incorrect' });
        } else if (err.statusCode === 409) {
          setErrors({ username: 'Username is already taken' });
        } else {
          setNotification({ message: err.message || 'Failed to update username', type: 'error' });
          setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
        }
      } else {
        setNotification({ message: 'An unexpected error occurred', type: 'error' });
        setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
      }
    } finally {
      setLoading({ ...loading, username: false });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!currentPassword) {
      setErrors({ currentPassword: 'Current password is required' });
      return;
    }

    if (!newPassword) {
      setErrors({ newPassword: 'New password is required' });
      return;
    }

    if (newPassword.length < 8) {
      setErrors({ newPassword: 'Password must be at least 8 characters' });
      return;
    }

    // Check password strength
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);

    if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
      setErrors({ newPassword: 'Password must contain uppercase, lowercase, number, and special character' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setLoading({ ...loading, password: true });

    try {
      await updatePassword(currentPassword, newPassword);
      // updatePassword will redirect to login, so we don't need to handle success here
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setErrors({ currentPassword: 'Current password is incorrect' });
        } else if (err.statusCode === 400) {
          setErrors({ newPassword: err.message || 'Invalid password' });
        } else {
          setNotification({ message: err.message || 'Failed to update password', type: 'error' });
          setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
        }
      } else {
        setNotification({ message: 'An unexpected error occurred', type: 'error' });
        setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
      }
      setLoading({ ...loading, password: false });
    }
  };

  const handleCreateInvite = async (familyId: number) => {
    setLoading((l) => ({ ...l, invite: true }));
    setNewInviteToken(null);
    setNotification(null);
    try {
      const res = await familiesApi.createInvite(familyId, createInviteRole);
      setNewInviteToken({
        familyId,
        token: res.data.token,
        role: res.data.role,
      });
      setInviteTokens((prev) => {
        const next = { ...prev, [res.data.id]: res.data.token };
        sessionStorage.setItem(INVITE_TOKENS_KEY, JSON.stringify(next));
        return next;
      });
      setInvitesByFamily((prev) => ({
        ...prev,
        [familyId]: [
          {
            id: res.data.id,
            role: res.data.role,
            expires_at: res.data.expires_at,
            created_at: res.data.created_at,
          },
          ...(prev[familyId] || []),
        ],
      }));
    } catch (err) {
      if (err instanceof ApiClientError) {
        setNotification({ message: err.message || 'Failed to create invite', type: 'error' });
      } else {
        setNotification({ message: 'Failed to create invite', type: 'error' });
      }
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS_LONG);
    } finally {
      setLoading((l) => ({ ...l, invite: false }));
    }
  };

  const handleRoleChange = async (
    familyId: number,
    userId: number,
    newRole: 'parent' | 'read_only'
  ) => {
    setSavingMemberRole({ familyId, userId });
    setNotification(null);
    try {
      await familiesApi.updateMemberRole(familyId, userId, newRole);
      setMembersByFamily((prev) => ({
        ...prev,
        [familyId]: (prev[familyId] || []).map((m) =>
          m.user_id === userId ? { ...m, role: newRole } : m
        ),
      }));
      if (userId === user?.id) {
        await refreshPermissions();
      }
      setNotification({ message: 'Role updated', type: 'success' });
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setNotification({ message: err.message || 'Failed to update role', type: 'error' });
      } else {
        setNotification({ message: 'Failed to update role', type: 'error' });
      }
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS_LONG);
    } finally {
      setSavingMemberRole(null);
    }
  };

  const handleRemoveMember = async (familyId: number, userId: number) => {
    setNotification(null);
    try {
      await familiesApi.removeMember(familyId, userId);
      setMembersByFamily((prev) => ({
        ...prev,
        [familyId]: (prev[familyId] || []).filter((m) => m.user_id !== userId),
      }));
      setNotification({ message: 'Member removed from family', type: 'success' });
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setNotification({ message: err.message || 'Failed to remove member', type: 'error' });
      } else {
        setNotification({ message: 'Failed to remove member', type: 'error' });
      }
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS_LONG);
    }
  };

  const handleRevokeInvite = async (familyId: number, inviteId: number) => {
    setNotification(null);
    try {
      await familiesApi.revokeInvite(familyId, inviteId);
      setInviteTokens((prev) => {
        const next = { ...prev };
        delete next[inviteId];
        sessionStorage.setItem(INVITE_TOKENS_KEY, JSON.stringify(next));
        return next;
      });
      setInvitesByFamily((prev) => ({
        ...prev,
        [familyId]: (prev[familyId] || []).filter((inv) => inv.id !== inviteId),
      }));
      setNotification({ message: 'Invite revoked', type: 'success' });
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setNotification({ message: err.message || 'Failed to revoke invite', type: 'error' });
      } else {
        setNotification({ message: 'Failed to revoke invite', type: 'error' });
      }
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS_LONG);
    }
  };

  const handleRenameFamily = async (familyId: number, name: string) => {
    setFamilyActionId(familyId);
    setLoading((l) => ({ ...l, familyRename: true }));
    setNotification(null);
    try {
      await familiesApi.updateFamily(familyId, name);
      setFamilies((prev) =>
        prev.map((f) => (f.id === familyId ? { ...f, name } : f))
      );
      setNotification({ message: 'Family renamed', type: 'success' });
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setNotification({ message: err.message || 'Failed to rename family', type: 'error' });
      } else {
        setNotification({ message: 'Failed to rename family', type: 'error' });
      }
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS_LONG);
    } finally {
      setLoading((l) => ({ ...l, familyRename: false }));
      setFamilyActionId(null);
    }
  };

  const handleDeleteFamily = async (familyId: number) => {
    setFamilyActionId(familyId);
    setLoading((l) => ({ ...l, familyDelete: true }));
    setNotification(null);
    try {
      await familiesApi.deleteFamily(familyId);
      setFamilies((prev) => prev.filter((f) => f.id !== familyId));
      setMembersByFamily((prev) => {
        const next = { ...prev };
        delete next[familyId];
        return next;
      });
      setInvitesByFamily((prev) => {
        const next = { ...prev };
        delete next[familyId];
        return next;
      });
      setNotification({ message: 'Family deleted', type: 'success' });
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setNotification({ message: err.message || 'Failed to delete family', type: 'error' });
      } else {
        setNotification({ message: 'Failed to delete family', type: 'error' });
      }
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS_LONG);
    } finally {
      setLoading((l) => ({ ...l, familyDelete: false }));
      setFamilyActionId(null);
    }
  };

  const handleLeaveFamily = async (familyId: number) => {
    if (!user?.id) return;
    setFamilyActionId(familyId);
    setLoading((l) => ({ ...l, familyLeave: true }));
    setNotification(null);
    try {
      await familiesApi.removeMember(familyId, user.id);
      setFamilies((prev) => prev.filter((f) => f.id !== familyId));
      setMembersByFamily((prev) => {
        const next = { ...prev };
        delete next[familyId];
        return next;
      });
      setInvitesByFamily((prev) => {
        const next = { ...prev };
        delete next[familyId];
        return next;
      });
      setNotification({ message: 'Left family', type: 'success' });
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setNotification({ message: err.message || 'Failed to leave family', type: 'error' });
      } else {
        setNotification({ message: 'Failed to leave family', type: 'error' });
      }
      setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS_LONG);
    } finally {
      setLoading((l) => ({ ...l, familyLeave: false }));
      setFamilyActionId(null);
    }
  };

  const generalContent = (
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
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDateFormatChange(e.target.value as DateFormat)}
            options={[
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
            ]}
          />
        </div>

        <div className={layout.saveRow}>
          <Button variant="primary" type="button" onClick={() => { setNotification({ message: 'Settings saved', type: 'success' }); setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS); }}>
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

  const dataContent = (
    <div className={s.layout}>
      <Card title="Data Management">
        <div className={s.section}>
          <label className={s.label}>Export Data</label>
          <p className={s.description}>
            {canEdit
              ? 'Download all your data as a ZIP (JSON, HTML report, and attachments). Only parents and owners can export.'
              : 'Only parents and owners can export data. Read-only members do not have export access.'}
          </p>
          <p className={s.description} style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
            This feature is in dev/beta and is not functional yet.
          </p>
          {canEdit && (
            <Button variant="secondary" onClick={handleExportData} disabled={loading.export}>
              <LuDownload style={{ marginRight: 8 }} /> {loading.export ? 'Preparing…' : 'Export my data'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );

  const aboutContent = (
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

  const familyManagementContent = loading.family ? (
    <div className={s.familySettingsLoading}>Loading…</div>
  ) : families.length === 0 ? (
    <div className={s.familySettingsEmpty}>No families found.</div>
  ) : (
    <div className={s.familyManagementList}>
      {families.map((family) => (
        <Card key={family.id} className={s.familyManagementFamilyCard}>
          <header className={s.familyManagementFamilyHeader} aria-label={`Family: ${family.name}`}>
            <h2 id={`family-management-heading-${family.id}`} className={s.familyManagementFamilyName}>
              {family.name}
            </h2>
            {family.role && <RoleBadge role={family.role} />}
          </header>
          <div className={s.familyManagementFamilyBody}>
            <FamilyOverviewCard
              familyName={family.name}
              members={membersByFamily[family.id] ?? []}
              isOwner={family.role === 'owner'}
              onRename={
                family.role === 'owner'
                  ? (name) => handleRenameFamily(family.id, name)
                  : undefined
              }
              onRequestDelete={
                family.role === 'owner'
                  ? () => {
                      setDeleteConfirmFamily(family);
                      setConfirmDeleteInput('');
                    }
                  : undefined
              }
              onLeave={
                family.role !== 'owner'
                  ? () => setLeaveConfirmFamily(family)
                  : undefined
              }
              isRenaming={loading.familyRename && familyActionId === family.id}
              isDeleting={loading.familyDelete && familyActionId === family.id}
              isLeaving={loading.familyLeave && familyActionId === family.id}
              noCard
            />

            <section className={s.familyManagementSection} aria-labelledby={`family-members-heading-${family.id}`}>
              <h3 id={`family-members-heading-${family.id}`} className={s.familyManagementSectionTitle}>
                Members
              </h3>
              <div className={s.familyManagementSectionContent}>
                {!(membersByFamily[family.id]?.length) ? (
                  <div className={s.familySettingsLoading}>Loading members…</div>
                ) : (
                  <div className={s.familySettingsMembersList} role="list">
                    {(membersByFamily[family.id] || []).map((member) => (
                      <MemberRow
                        key={member.user_id}
                        member={member}
                        currentUserId={user?.id}
                        canEdit={family.role === 'owner' || family.role === 'parent'}
                        canRemove={family.role === 'owner' || family.role === 'parent'}
                        onRemove={() => handleRemoveMember(family.id, member.user_id)}
                        onRoleChange={(userId, newRole) => handleRoleChange(family.id, userId, newRole)}
                        savingUserId={
                          savingMemberRole?.familyId === family.id ? savingMemberRole.userId : null
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {(family.role === 'owner' || family.role === 'parent') && (
              <>
                <section className={s.familyManagementSection} aria-labelledby={`family-invite-heading-${family.id}`}>
                  <h3 id={`family-invite-heading-${family.id}`} className={s.familyManagementSectionTitle}>
                    Invite member
                  </h3>
                  <div className={s.familyManagementSectionContent}>
                    <div className={s.familySettingsInviteForm}>
                    <FormField
                      label="Role"
                      type="select"
                      id={`invite-role-${family.id}`}
                      value={createInviteRole}
                      onChange={(e) => setCreateInviteRole(e.target.value as 'parent' | 'read_only')}
                      options={[
                        { value: 'parent', label: 'Parent (can edit)' },
                        { value: 'read_only', label: 'View only' },
                      ]}
                      aria-label="Invite role"
                    />
                    <button
                      type="button"
                      className={mui.cardAdd}
                      disabled={loading.invite}
                      onClick={() => handleCreateInvite(family.id)}
                      title="Create invite"
                    >
                      <LuUserPlus className={mui.cardIcon} size={18} aria-hidden />
                      <span className={mui.cardAddLabel}>
                        {loading.invite ? 'Creating…' : 'Create invite'}
                      </span>
                    </button>
                  </div>
                  <p className={s.familySettingsInviteHelper}>
                    Share the invite link with the person you want to add. They'll need to sign in or create an account to join.
                  </p>
                  {newInviteToken?.familyId === family.id && (
                    <div className={s.familySettingsInviteLinkBox}>
                      <span className={s.familySettingsInviteLinkLabel}>Invite link — copy and share</span>
                      <div className={s.familySettingsInviteLinkCode}>
                        {typeof window !== 'undefined'
                          ? `${window.location.origin}/invite?token=${newInviteToken.token}`
                          : `/invite?token=${newInviteToken.token}`}
                      </div>
                      <div className={s.familySettingsInviteLinkActions}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const inviteUrl =
                              typeof window !== 'undefined'
                                ? `${window.location.origin}/invite?token=${newInviteToken.token}`
                                : `/invite?token=${newInviteToken.token}`;
                            navigator.clipboard.writeText(inviteUrl);
                            setNotification({ message: 'Invite link copied to clipboard', type: 'success' });
                            setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS_SHORT);
                          }}
                        >
                          Copy link
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setNewInviteToken(null)}>
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  )}
                  </div>
                </section>

                <section className={s.familyManagementSection} aria-labelledby={`family-pending-heading-${family.id}`}>
                  <h3 id={`family-pending-heading-${family.id}`} className={s.familyManagementSectionTitle}>
                    Pending invites
                  </h3>
                  <div className={s.familyManagementSectionContent}>
                  {(invitesByFamily[family.id]?.length ?? 0) === 0 ? (
                    <div className={s.familySettingsEmpty}>No pending invites.</div>
                  ) : (
                    <div className={s.familySettingsInvitesList} role="list">
                      {(invitesByFamily[family.id] || []).map((inv) => (
                        <InviteRow
                          key={inv.id}
                          invite={inv}
                          hasToken={!!inviteTokens[inv.id]}
                          onCopyLink={() => {
                            const url =
                              typeof window !== 'undefined'
                                ? `${window.location.origin}/invite?token=${encodeURIComponent(inviteTokens[inv.id])}`
                                : `/invite?token=${encodeURIComponent(inviteTokens[inv.id])}`;
                            navigator.clipboard.writeText(url);
                            setNotification({ message: 'Invite link copied', type: 'success' });
                            setTimeout(() => setNotification(null), NOTIFICATION_DISMISS_MS_SHORT);
                          }}
                          onRevoke={() => handleRevokeInvite(family.id, inv.id)}
                        />
                      ))}
                    </div>
                  )}
                  </div>
                </section>
              </>
            )}
          </div>
        </Card>
      ))}
    </div>
  );

  const familyContent = (
    <Card title="Family Settings">
      <p className={s.familySettingsPageSubtitle}>
        See who's in your family, invite others, and manage access.
      </p>
      <Tabs
        activeTab={familySubTab}
        onTabChange={(id) => setFamilySubTab(id as 'management' | 'members')}
        tabs={[
          {
            id: 'members',
            label: 'Members',
            content: (
              <div className={s.familyMembersTab}>
                {loadingKids && <LoadingSpinner message="Loading children…" />}
                {errorKids && <ErrorMessage message={errorKids} onRetry={loadChildren} />}
                {!loadingKids && !errorKids && (
                  <div className={s.familyMembersByFamily}>
                    {[...families]
                      .sort((a, b) => a.id - b.id)
                      .map((family) => {
                        const kids = childrenByFamilyId[family.id] ?? [];
                        const canEditFamily = family.role === 'owner' || family.role === 'parent';
                        return (
                          <Card key={family.id} title={family.name} className={s.familyMembersFamilyCard}>
                            <div className={s.familyMembersKidsGrid}>
                              {kids.map((child) => {
                                const age = calculateAge(child.date_of_birth);
                                const ageText = formatAge(age.years, age.months);
                                return (
                                  <Card key={child.id} className={s.familyCard}>
                                    <div className={s.familyContent}>
                                      <div className={s.familyAvatar}>
                                        <ChildAvatar
                                          avatar={child.avatar}
                                          gender={child.gender}
                                          alt={`${child.name}'s avatar`}
                                          className={s.familyAvatarImg}
                                        />
                                      </div>
                                      <div className={s.familyInfo}>
                                        <h2 className={s.familyName}>{child.name}</h2>
                                        <div className={s.familyDetails}>
                                          <span>{ageText}</span>
                                          <span>•</span>
                                          <span>{formatDate(child.date_of_birth)}</span>
                                        </div>
                                      </div>
                                      {canEditFamily && (
                                        <div className={s.familyActions}>
                                          <Link to={`/children/${child.id}/edit`}>
                                            <Button variant="secondary" size="sm">Edit</Button>
                                          </Link>
                                          <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => {
                                              setDeleteConfirmChild(child);
                                              setConfirmDeleteChildInput('');
                                            }}
                                            disabled={deletingChildId === child.id}
                                          >
                                            {deletingChildId === child.id ? 'Deleting…' : 'Delete'}
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </Card>
                                );
                              })}
                              {canEditFamily && (
                                <Link
                                  to="/children/new"
                                  state={{ familyId: family.id, fromOnboarding: onboarding?.isActive }}
                                  className={s.familyAddLink}
                                  data-onboarding={families.length > 0 && family.id === families[0].id ? 'add-child' : undefined}
                                >
                                  <Card className={`${s.familyCard} ${s.familyAddCard}`}>
                                    <div className={s.familyContent}>
                                      <div className={s.familyAvatar}>
                                        <div className={s.familyAddAvatar}>+</div>
                                      </div>
                                      <div className={s.familyInfo}>
                                        <h2 className={s.familyName}>Add Child</h2>
                                        <div className={s.familyDetails}>
                                          <span>Add a child to {family.name}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </Card>
                                </Link>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    <button
                      type="button"
                      onClick={() => setShowAddFamilyModal(true)}
                      className={s.familyAddFamilyButton}
                      data-onboarding="add-family"
                    >
                      <Card className={`${s.familyCard} ${s.familyAddCard}`}>
                        <div className={s.familyContent}>
                          <div className={s.familyAvatar}>
                            <div className={s.familyAddAvatar}>+</div>
                          </div>
                          <div className={s.familyInfo}>
                            <h2 className={s.familyName}>Add Family</h2>
                            <div className={s.familyDetails}>
                              <span>Create a new family</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </button>
                  </div>
                )}
              </div>
            ),
          },
          {
            id: 'management',
            label: 'Management',
            content: familyManagementContent,
          },
        ]}
      />
    </Card>
  );

  const userContent = (
    <div className={s.layout}>
      <Card title="User Settings">
        {/* User Information Display */}
        <div className={s.userInfoCard}>
          <div className={s.userInfoRow}>
            <span className={s.userInfoLabel}>Username:</span>
            <span className={s.userInfoValue}>{user?.username || 'N/A'}</span>
          </div>
          <div className={s.userInfoRow}>
            <span className={s.userInfoLabel}>Email:</span>
            <span className={s.userInfoValue}>{user?.email || 'N/A'}</span>
          </div>
          <div className={s.userInfoRow}>
            <span className={s.userInfoLabel}>Account Created:</span>
            <span className={s.userInfoValue}>{user?.createdAt ? formatDate(user.createdAt) : 'N/A'}</span>
          </div>
          <div className={s.userInfoRow}>
            <span className={s.userInfoLabel}>Role:</span>
            <span className={s.userInfoValue}>{user?.isInstanceAdmin ? 'Instance admin' : 'User'}</span>
          </div>
        </div>

        {/* Change Username Section */}
        <div className={s.expandable}>
          <button
            className={s.expandableHeader}
            onClick={() => {
              setUsernameExpanded(!usernameExpanded);
              setPasswordExpanded(false);
            }}
            aria-expanded={usernameExpanded}
          >
            <div className={s.expandableTitle}>
              <LuUser className={s.expandableIcon} />
              <span>Change Username</span>
            </div>
            {usernameExpanded ? (
              <HiChevronUp className={s.expandableChevron} />
            ) : (
              <HiChevronDown className={s.expandableChevron} />
            )}
          </button>
          {usernameExpanded && (
            <div className={s.expandableContent}>
              <form onSubmit={handleUpdateUsername}>
                <FormField
                  label="New Username"
                  type="text"
                  value={newUsername}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUsername(e.target.value)}
                  error={errors.username}
                  required
                  disabled={loading.username}
                  hint={!errors.username ? 'Must be at least 2 characters long' : undefined}
                />

                <div className={s.passwordField}>
                  <label htmlFor="username-password" className={s.passwordLabel}>
                    Current Password
                    <span className={s.requiredIndicator}>*</span>
                  </label>
                  <div className={s.passwordInputWrapper}>
                    <input
                      id="username-password"
                      type={showPasswords.usernamePassword ? 'text' : 'password'}
                      className={`${s.passwordInput} ${errors.usernamePassword ? 'error' : ''}`}
                      value={usernamePassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsernamePassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={loading.username}
                    />
                    <button
                      type="button"
                      className={s.passwordToggle}
                      onClick={() => setShowPasswords({ ...showPasswords, usernamePassword: !showPasswords.usernamePassword })}
                      aria-label={showPasswords.usernamePassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPasswords.usernamePassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.usernamePassword && (
                    <span className={s.passwordError}>{errors.usernamePassword}</span>
                  )}
                  {!errors.usernamePassword && (
                    <FormFieldHint>Enter your current password to confirm</FormFieldHint>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading.username}
                  className={s.updateButton}
                >
                  {loading.username ? 'Updating...' : 'Update Username'}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Change Password Section */}
        <div className={s.expandable}>
          <button
            className={s.expandableHeader}
            onClick={() => {
              setPasswordExpanded(!passwordExpanded);
              setUsernameExpanded(false);
            }}
            aria-expanded={passwordExpanded}
          >
            <div className={s.expandableTitle}>
              <FaLock className={s.expandableIcon} />
              <span>Change Password</span>
            </div>
            {passwordExpanded ? (
              <HiChevronUp className={s.expandableChevron} />
            ) : (
              <HiChevronDown className={s.expandableChevron} />
            )}
          </button>
          {passwordExpanded && (
            <div className={s.expandableContent}>
              <form onSubmit={handleUpdatePassword}>
                <div className={s.passwordField}>
                  <label htmlFor="current-password" className={s.passwordLabel}>
                    Current Password
                    <span className={s.requiredIndicator}>*</span>
                  </label>
                  <div className={s.passwordInputWrapper}>
                    <input
                      id="current-password"
                      type={showPasswords.currentPassword ? 'text' : 'password'}
                      className={`${s.passwordInput} ${errors.currentPassword ? 'error' : ''}`}
                      value={currentPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={loading.password}
                    />
                    <button
                      type="button"
                      className={s.passwordToggle}
                      onClick={() => setShowPasswords({ ...showPasswords, currentPassword: !showPasswords.currentPassword })}
                      aria-label={showPasswords.currentPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPasswords.currentPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <span className={s.passwordError}>{errors.currentPassword}</span>
                  )}
                </div>

                <div className={s.passwordField}>
                  <label htmlFor="new-password" className={s.passwordLabel}>
                    New Password
                    <span className={s.requiredIndicator}>*</span>
                  </label>
                  <div className={s.passwordInputWrapper}>
                    <input
                      id="new-password"
                      type={showPasswords.newPassword ? 'text' : 'password'}
                      className={`${s.passwordInput} ${errors.newPassword ? 'error' : ''}`}
                      value={newPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      disabled={loading.password}
                    />
                    <button
                      type="button"
                      className={s.passwordToggle}
                      onClick={() => setShowPasswords({ ...showPasswords, newPassword: !showPasswords.newPassword })}
                      aria-label={showPasswords.newPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPasswords.newPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <span className={s.passwordError}>{errors.newPassword}</span>
                  )}
                  {!errors.newPassword && (
                    <FormFieldHint>Must be at least 8 characters with uppercase, lowercase, number, and special character</FormFieldHint>
                  )}
                </div>

                <div className={s.passwordField}>
                  <label htmlFor="confirm-password" className={s.passwordLabel}>
                    Confirm New Password
                    <span className={s.requiredIndicator}>*</span>
                  </label>
                  <div className={s.passwordInputWrapper}>
                    <input
                      id="confirm-password"
                      type={showPasswords.confirmPassword ? 'text' : 'password'}
                      className={`${s.passwordInput} ${errors.confirmPassword ? 'error' : ''}`}
                      value={confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      disabled={loading.password}
                    />
                    <button
                      type="button"
                      className={s.passwordToggle}
                      onClick={() => setShowPasswords({ ...showPasswords, confirmPassword: !showPasswords.confirmPassword })}
                      aria-label={showPasswords.confirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPasswords.confirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <span className={s.passwordError}>{errors.confirmPassword}</span>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading.password}
                  className={s.updateButton}
                >
                  {loading.password ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  return (
    <div className={pageLayout.pageContainer}>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className={layout.pageGrid}>
        <Card className={layout.card}>
          <div className={layout.cardGrid}>
            <div className={layout.cardHeader}>
              <h1 className={layout.title}>Settings</h1>
            </div>
            <aside className={layout.sidebar}>
              <button className={`${layout.sidebarItem} ${activeTab === 'general' ? layout.active : ''}`} onClick={() => setActiveTab('general')}>
                <LuSettings className={layout.sidebarIcon} />
                <span>General</span>
              </button>
              <button
                className={`${layout.sidebarItem} ${activeTab === 'family' ? layout.active : ''}`}
                onClick={() => setActiveTab('family')}
                data-onboarding="settings-family-tab"
              >
                <LuUsers className={layout.sidebarIcon} />
                <span>Family</span>
              </button>
              <button className={`${layout.sidebarItem} ${activeTab === 'user' ? layout.active : ''}`} onClick={() => setActiveTab('user')}>
                <LuUser className={layout.sidebarIcon} />
                <span>User</span>
              </button>
              <button className={`${layout.sidebarItem} ${activeTab === 'data' ? layout.active : ''}`} onClick={() => setActiveTab('data')}>
                <LuDownload className={layout.sidebarIcon} />
                <span>Data</span>
              </button>
              <button className={`${layout.sidebarItem} ${activeTab === 'about' ? layout.active : ''}`} onClick={() => setActiveTab('about')}>
                <LuInfo className={layout.sidebarIcon} />
                <span>About</span>
              </button>
            </aside>

                <main className={layout.main}>
                  {activeTab === 'general' && generalContent}
                  {activeTab === 'user' && userContent}
                  {activeTab === 'data' && dataContent}
                  {activeTab === 'family' && familyContent}
                  {activeTab === 'about' && aboutContent}
                </main>
          </div>

          {/* footer removed - Save moved into General preferences */}
        </Card>

      {leaveConfirmFamily && (
        <div
          className={modalStyles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-family-modal-title"
          onClick={() => setLeaveConfirmFamily(null)}
        >
          <div
            className={`${modalStyles.content} ${s.deleteFamilyContent}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={modalStyles.header}>
              <h2 id="leave-family-modal-title">
                ⚠️ Leave family
              </h2>
              <button
                type="button"
                className={modalStyles.close}
                aria-label="Close"
                onClick={() => setLeaveConfirmFamily(null)}
              >
                ×
              </button>
            </div>
            <div className={modalStyles.body}>
              <p className={s.deleteFamilyAlert}>
                🚨 You will lose access to <strong>{leaveConfirmFamily.name}</strong> and all of its data. You can only rejoin if someone invites you again.
              </p>
              <p className={s.deleteFamilyInstruction}>
                Are you sure you want to leave this family?
              </p>
            </div>
            <div className={modalStyles.footer}>
              <Button
                variant="secondary"
                onClick={() => setLeaveConfirmFamily(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={loading.familyLeave}
                onClick={() => {
                  handleLeaveFamily(leaveConfirmFamily.id);
                  setLeaveConfirmFamily(null);
                }}
              >
                {loading.familyLeave ? 'Leaving…' : 'Leave family'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmFamily && (
        <div
          className={modalStyles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-family-modal-title"
          onClick={() => {
            setDeleteConfirmFamily(null);
            setConfirmDeleteInput('');
          }}
        >
          <div
            className={`${modalStyles.content} ${s.deleteFamilyContent}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={modalStyles.header}>
              <h2 id="delete-family-modal-title">
                ⚠️ Delete family
              </h2>
              <button
                type="button"
                className={modalStyles.close}
                aria-label="Close"
                onClick={() => {
                  setDeleteConfirmFamily(null);
                  setConfirmDeleteInput('');
                }}
              >
                ×
              </button>
            </div>
            <div className={modalStyles.body}>
              <p className={s.deleteFamilyAlert}>
                🚨 <strong>This action cannot be undone.</strong> All members will lose access to this family and its data.
              </p>
              <p className={s.deleteFamilyInstruction}>
                Type <strong>delete {deleteConfirmFamily.name}</strong> below to confirm.
              </p>
              <input
                type="text"
                className={`form-input ${s.deleteFamilyInput}`}
                value={confirmDeleteInput}
                onChange={(e) => setConfirmDeleteInput(e.target.value)}
                placeholder={`delete ${deleteConfirmFamily.name}`}
                aria-label="Type confirmation phrase"
                autoComplete="off"
              />
            </div>
            <div className={modalStyles.footer}>
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteConfirmFamily(null);
                  setConfirmDeleteInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={
                  confirmDeleteInput.trim() !== `delete ${deleteConfirmFamily.name}` ||
                  loading.familyDelete
                }
                onClick={() => {
                  handleDeleteFamily(deleteConfirmFamily.id);
                  setDeleteConfirmFamily(null);
                  setConfirmDeleteInput('');
                }}
              >
                {loading.familyDelete ? 'Deleting…' : 'Delete family'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmChild && (
        <div
          className={modalStyles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-child-modal-title"
          onClick={() => {
            setDeleteConfirmChild(null);
            setConfirmDeleteChildInput('');
          }}
        >
          <div
            className={`${modalStyles.content} ${s.deleteFamilyContent}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={modalStyles.header}>
              <h2 id="delete-child-modal-title">
                ⚠️ Delete {deleteConfirmChild.name}
              </h2>
              <button
                type="button"
                className={modalStyles.close}
                aria-label="Close"
                onClick={() => {
                  setDeleteConfirmChild(null);
                  setConfirmDeleteChildInput('');
                }}
              >
                ×
              </button>
            </div>
            <div className={modalStyles.body}>
              <p className={s.deleteFamilyAlert}>
                🚨 <strong>This action cannot be undone.</strong> All associated visits and data will be permanently deleted.
              </p>
              <p className={s.deleteFamilyInstruction}>
                Type <strong>delete {deleteConfirmChild.name}</strong> below to confirm.
              </p>
              <input
                type="text"
                className={`form-input ${s.deleteFamilyInput}`}
                value={confirmDeleteChildInput}
                onChange={(e) => setConfirmDeleteChildInput(e.target.value)}
                placeholder={`delete ${deleteConfirmChild.name}`}
                aria-label="Type confirmation phrase"
                autoComplete="off"
              />
            </div>
            <div className={modalStyles.footer}>
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteConfirmChild(null);
                  setConfirmDeleteChildInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={
                  confirmDeleteChildInput.trim() !== `delete ${deleteConfirmChild.name}` ||
                  deletingChildId === deleteConfirmChild.id
                }
                onClick={() => handleDeleteChild(deleteConfirmChild)}
              >
                {deletingChildId === deleteConfirmChild.id ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAddFamilyModal && (
        <div
          className={modalStyles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-family-modal-title"
          onClick={() => {
            if (!loading.familyCreate) {
              setShowAddFamilyModal(false);
              setNewFamilyName('');
              setNewFamilyNameError(null);
            }
          }}
        >
          <div
            className={`${modalStyles.content} ${s.deleteFamilyContent}`}
            data-onboarding="create-family-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={modalStyles.header}>
              <h2 id="add-family-modal-title">Create family</h2>
              <button
                type="button"
                className={modalStyles.close}
                aria-label="Close"
                disabled={loading.familyCreate}
                onClick={() => {
                  setShowAddFamilyModal(false);
                  setNewFamilyName('');
                  setNewFamilyNameError(null);
                }}
              >
                ×
              </button>
            </div>
            <div className={modalStyles.body}>
              <FormField
                label="Family name"
                type="text"
                id="new-family-name"
                value={newFamilyName}
                onChange={(e) => {
                  setNewFamilyName(e.target.value);
                  setNewFamilyNameError(null);
                }}
                placeholder="e.g. Smith Family"
                disabled={loading.familyCreate}
                error={newFamilyNameError || undefined}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFamily(newFamilyName);
                  }
                }}
              />
            </div>
            <div className={modalStyles.footer}>
              <Button
                variant="secondary"
                disabled={loading.familyCreate}
                onClick={() => {
                  setShowAddFamilyModal(false);
                  setNewFamilyName('');
                  setNewFamilyNameError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                data-onboarding="create-family-submit"
                disabled={loading.familyCreate || !newFamilyName.trim()}
                onClick={() => handleAddFamily(newFamilyName)}
              >
                {loading.familyCreate ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default SettingsPage;

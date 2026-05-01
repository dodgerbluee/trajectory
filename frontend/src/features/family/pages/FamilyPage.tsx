/**
 * FamilyPage – dedicated /family route hosting Members + Management sub-views.
 *
 * Replaces the old FamilyTab inside SettingsPage. Layout: left-rail sub-tab
 * nav (vertical on both mobile + desktop) + main panel. Sub-tab is encoded
 * in the `?sub=` query param so onboarding/deeplinks survive a refresh.
 *
 * Body content (members listing, management cards, all modals) is a direct
 * port of the prior FamilyTab implementation; CSS classes still come from
 * SettingsPage.module.css to avoid forking 800+ lines of CSS.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LuUserPlus, LuPencil, LuTrash2, LuUsers, LuSettings } from 'react-icons/lu';

import Card from '@shared/components/Card';
import FormField from '@shared/components/FormField';
import Button from '@shared/components/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import Notification from '@shared/components/Notification';
import RoleBadge from '@shared/components/RoleBadge';
import modalStyles from '@shared/components/Modal.module.css';
import mui from '@shared/styles/MeasurementsUI.module.css';
import detailLayout from '@shared/styles/visit-detail-layout.module.css';
import pageLayout from '@shared/styles/page-layout.module.css';
import layout from '@shared/styles/SettingsLayout.module.css';
import s from '@features/settings/pages/SettingsPage.module.css';
import familyLayout from './FamilyPage.module.css';

import { FamilyOverviewCard, MemberRow, InviteRow } from '@features/settings/components';
import { ApiClientError, peopleApi, familiesApi } from '@lib/api-client';
import type { Person, Family, FamilyInvite, FamilyMember } from '@shared/types/api';
import { calculateAge, formatAge, formatDate } from '@lib/date-utils';
import { PersonAvatar } from '@features/people';
import { SelfRecordPromptModal } from '@features/people/components';
import { useFamilyPermissions } from '@/contexts/FamilyPermissionsContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';

const INVITE_TOKENS_KEY = 'trajectory_invite_tokens';
const NOTIFICATION_DISMISS_MS = 3000;

type FamilySubTab = 'members' | 'management';

type Notify = (n: { message: string; type: 'success' | 'error' }, timeoutMs?: number) => void;

function readSubTabFromUrl(search: string): FamilySubTab {
  const params = new URLSearchParams(search);
  const v = params.get('sub');
  return v === 'management' ? 'management' : 'members';
}

export default function FamilyPage() {
  const { user, checkAuth } = useAuth();
  const { refreshPermissions } = useFamilyPermissions();
  const onboarding = useOnboarding();
  const location = useLocation();
  const navigate = useNavigate();

  // ---- Notification (own, since we're not nested in SettingsPage anymore) ----
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const notificationTimerRef = useRef<number | null>(null);
  const notify: Notify = useMemo(() => {
    return (n, timeoutMs = NOTIFICATION_DISMISS_MS) => {
      setNotification(n);
      if (notificationTimerRef.current != null) window.clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = window.setTimeout(() => setNotification(null), timeoutMs);
    };
  }, []);

  // ---- Sub-tab (URL-driven) ----
  const [familySubTab, setFamilySubTab] = useState<FamilySubTab>(() =>
    readSubTabFromUrl(location.search)
  );
  useEffect(() => {
    setFamilySubTab(readSubTabFromUrl(location.search));
  }, [location.search]);

  const setSubTab = (next: FamilySubTab) => {
    setFamilySubTab(next);
    const params = new URLSearchParams(location.search);
    if (next === 'members') params.delete('sub');
    else params.set('sub', next);
    const qs = params.toString();
    navigate({ pathname: '/family', search: qs ? `?${qs}` : '' }, { replace: true });
  };

  // ---- All-state ported from FamilyTab.tsx ----
  const [loading, setLoading] = useState({
    family: false,
    familyCreate: false,
    invite: false,
    familyRename: false,
    familyDelete: false,
    familyLeave: false,
  });
  const [familyActionId, setFamilyActionId] = useState<number | null>(null);

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

  const [deleteConfirmFamily, setDeleteConfirmFamily] = useState<Family | null>(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [leaveConfirmFamily, setLeaveConfirmFamily] = useState<Family | null>(null);

  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyNameError, setNewFamilyNameError] = useState<string | null>(null);

  const [peopleList, setChildrenList] = useState<Person[]>([]);
  const [loadingKids, setLoadingKids] = useState(false);
  const [errorKids, setErrorKids] = useState<string | null>(null);
  const [deletingChildId, setDeletingChildId] = useState<number | null>(null);
  const [deleteConfirmChild, setDeleteConfirmChild] = useState<Person | null>(null);
  const [confirmDeleteChildInput, setConfirmDeleteChildInput] = useState('');

  const [savingMemberRole, setSavingMemberRole] = useState<{ familyId: number; userId: number } | null>(null);

  // "Add yourself" prompt state — separate from the auto-fired HomePage prompt.
  // This one is opened on demand from the Members tab when the user already
  // dismissed the first-login prompt but later wants to self-record.
  const [showSelfRecordModal, setShowSelfRecordModal] = useState(false);
  const showAddYourselfButton = user?.hasSelfRecord === false;

  // Onboarding: arriving on /family advances go_settings_family → create_family.
  useEffect(() => {
    if (onboarding?.isActive && onboarding.step === 'go_settings_family') {
      onboarding.reportOnSettingsFamilyTab();
    }
  }, [onboarding?.isActive, onboarding?.step, onboarding]);

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
      notify({ message: 'Failed to load families', type: 'error' });
    } finally {
      setLoading((l) => ({ ...l, family: false }));
    }
  };

  const loadChildren = async () => {
    setLoadingKids(true);
    setErrorKids(null);
    try {
      const res = await peopleApi.getAll();
      setChildrenList(res.data);
    } catch (err) {
      setErrorKids(err instanceof ApiClientError ? err.message : 'Failed to load people');
    } finally {
      setLoadingKids(false);
    }
  };

  useEffect(() => {
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
        if (!cancelled) notify({ message: 'Failed to load families', type: 'error' });
      })
      .finally(() => {
        if (!cancelled) setLoading((l) => ({ ...l, family: false }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (familySubTab === 'members') {
      loadChildren();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familySubTab]);

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
      notify({ message: 'Family created.', type: 'success' });
      setShowAddFamilyModal(false);
      setNewFamilyName('');
      await loadFamilies();
      await loadChildren();
      onboarding?.reportFamilyCreated();
    } catch (err) {
      notify({
        message: err instanceof ApiClientError ? err.message : 'Failed to create family',
        type: 'error',
      });
    } finally {
      setLoading((l) => ({ ...l, familyCreate: false }));
    }
  };

  const handleDeleteChild = async (person: Person) => {
    setDeletingChildId(person.id);
    try {
      await peopleApi.delete(person.id);
      setChildrenList((prev) => prev.filter((c) => c.id !== person.id));
      notify({ message: `${person.name} has been deleted`, type: 'success' });
      setDeleteConfirmChild(null);
      setConfirmDeleteChildInput('');
    } catch (err) {
      notify({
        message: err instanceof ApiClientError ? err.message || 'Failed to delete person' : 'Failed to delete person',
        type: 'error',
      });
    } finally {
      setDeletingChildId(null);
    }
  };

  const peopleByFamilyId = useMemo(() => {
    const map: Record<number, Person[]> = {};
    for (const f of families) map[f.id] = [];
    for (const c of peopleList) {
      const fid = c.family_id ?? families[0]?.id;
      if (fid != null && map[fid]) map[fid].push(c);
    }
    for (const id of Object.keys(map)) {
      map[Number(id)].sort(
        (a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime()
      );
    }
    return map;
  }, [families, peopleList]);

  const handleCreateInvite = async (familyId: number) => {
    setLoading((l) => ({ ...l, invite: true }));
    setNewInviteToken(null);
    try {
      const res = await familiesApi.createInvite(familyId, createInviteRole);
      setNewInviteToken({ familyId, token: res.data.token, role: res.data.role });
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
      notify(
        { message: err instanceof ApiClientError ? err.message || 'Failed to create invite' : 'Failed to create invite', type: 'error' },
        4000
      );
    } finally {
      setLoading((l) => ({ ...l, invite: false }));
    }
  };

  const handleRoleChange = async (familyId: number, userId: number, newRole: 'parent' | 'read_only') => {
    setSavingMemberRole({ familyId, userId });
    try {
      await familiesApi.updateMemberRole(familyId, userId, newRole);
      setMembersByFamily((prev) => ({
        ...prev,
        [familyId]: (prev[familyId] || []).map((m) => (m.user_id === userId ? { ...m, role: newRole } : m)),
      }));
      if (userId === user?.id) {
        await refreshPermissions();
      }
      notify({ message: 'Role updated', type: 'success' });
    } catch (err) {
      notify(
        { message: err instanceof ApiClientError ? err.message || 'Failed to update role' : 'Failed to update role', type: 'error' },
        4000
      );
    } finally {
      setSavingMemberRole(null);
    }
  };

  const handleRemoveMember = async (familyId: number, userId: number) => {
    try {
      await familiesApi.removeMember(familyId, userId);
      setMembersByFamily((prev) => ({
        ...prev,
        [familyId]: (prev[familyId] || []).filter((m) => m.user_id !== userId),
      }));
      notify({ message: 'Member removed from family', type: 'success' });
    } catch (err) {
      notify(
        { message: err instanceof ApiClientError ? err.message || 'Failed to remove member' : 'Failed to remove member', type: 'error' },
        4000
      );
    }
  };

  const handleRevokeInvite = async (familyId: number, inviteId: number) => {
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
      notify({ message: 'Invite revoked', type: 'success' });
    } catch (err) {
      notify(
        { message: err instanceof ApiClientError ? err.message || 'Failed to revoke invite' : 'Failed to revoke invite', type: 'error' },
        4000
      );
    }
  };

  const handleRenameFamily = async (familyId: number, name: string) => {
    setFamilyActionId(familyId);
    setLoading((l) => ({ ...l, familyRename: true }));
    try {
      await familiesApi.updateFamily(familyId, name);
      setFamilies((prev) => prev.map((f) => (f.id === familyId ? { ...f, name } : f)));
      notify({ message: 'Family renamed', type: 'success' });
    } catch (err) {
      notify(
        { message: err instanceof ApiClientError ? err.message || 'Failed to rename family' : 'Failed to rename family', type: 'error' },
        4000
      );
    } finally {
      setLoading((l) => ({ ...l, familyRename: false }));
      setFamilyActionId(null);
    }
  };

  const handleDeleteFamily = async (familyId: number) => {
    setFamilyActionId(familyId);
    setLoading((l) => ({ ...l, familyDelete: true }));
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
      notify({ message: 'Family deleted', type: 'success' });
    } catch (err) {
      notify(
        { message: err instanceof ApiClientError ? err.message || 'Failed to delete family' : 'Failed to delete family', type: 'error' },
        4000
      );
    } finally {
      setLoading((l) => ({ ...l, familyDelete: false }));
      setFamilyActionId(null);
    }
  };

  const handleLeaveFamily = async (familyId: number) => {
    if (!user?.id) return;
    setFamilyActionId(familyId);
    setLoading((l) => ({ ...l, familyLeave: true }));
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
      notify({ message: 'Left family', type: 'success' });
    } catch (err) {
      notify(
        { message: err instanceof ApiClientError ? err.message || 'Failed to leave family' : 'Failed to leave family', type: 'error' },
        4000
      );
    } finally {
      setLoading((l) => ({ ...l, familyLeave: false }));
      setFamilyActionId(null);
    }
  };

  // ---- Members sub-tab content ----
  const membersContent = (
    <div className={s.familyMembersTab}>
      {loadingKids && <LoadingSpinner message="Loading people…" />}
      {errorKids && <ErrorMessage message={errorKids} onRetry={loadChildren} />}
      {!loadingKids && !errorKids && (
        <div className={s.familyMembersByFamily}>
          {showAddYourselfButton && (
            <button
              type="button"
              onClick={() => setShowSelfRecordModal(true)}
              className={s.familyAddFamilyButton}
              aria-label="Add yourself as a family member"
            >
              <Card className={`${s.familyCard} ${s.familyAddCard}`}>
                <div className={s.familyContent}>
                  <div className={s.familyAvatar}>
                    <div className={s.familyAddAvatar}>+</div>
                  </div>
                  <div className={s.familyInfo}>
                    <h2 className={s.familyName}>Add yourself</h2>
                    <div className={s.familyDetails}>
                      <span>Track your own health alongside your family</span>
                    </div>
                  </div>
                </div>
              </Card>
            </button>
          )}

          {[...families]
            .sort((a, b) => a.id - b.id)
            .map((family) => {
              const kids = peopleByFamilyId[family.id] ?? [];
              const canEditFamily = family.role === 'owner' || family.role === 'parent';
              return (
                <Card key={family.id} title={family.name} className={s.familyMembersFamilyCard}>
                  <div className={s.familyMembersKidsGrid}>
                    {kids.map((person) => {
                      const age = calculateAge(person.date_of_birth);
                      const ageText = formatAge(age.years, age.months);
                      return (
                        <Card key={person.id} className={s.familyCard}>
                          <div className={s.familyContent}>
                            <div className={s.familyAvatar}>
                              <PersonAvatar
                                avatar={person.avatar}
                                gender={person.gender}
                                alt={`${person.name}'s avatar`}
                                className={s.familyAvatarImg}
                              />
                            </div>
                            <div className={s.familyInfo}>
                              <h2 className={s.familyName}>{person.name}</h2>
                              <div className={s.familyDetails}>
                                <span>{ageText}</span>
                                <span>•</span>
                                <span>{formatDate(person.date_of_birth)}</span>
                              </div>
                            </div>
                            {canEditFamily && (
                              <div className={`${s.familyActions} ${detailLayout.iconActions}`}>
                                <Link
                                  to={`/people/${person.id}/edit`}
                                  className={detailLayout.iconAction}
                                  title={`Edit ${person.name}`}
                                  aria-label={`Edit ${person.name}`}
                                >
                                  <LuPencil aria-hidden />
                                </Link>
                                <button
                                  type="button"
                                  className={`${detailLayout.iconAction} ${detailLayout.iconActionDanger}`}
                                  onClick={() => {
                                    setDeleteConfirmChild(person);
                                    setConfirmDeleteChildInput('');
                                  }}
                                  disabled={deletingChildId === person.id}
                                  title={deletingChildId === person.id ? 'Deleting…' : `Delete ${person.name}`}
                                  aria-label={
                                    deletingChildId === person.id
                                      ? `Deleting ${person.name}`
                                      : `Delete ${person.name}`
                                  }
                                >
                                  <LuTrash2 aria-hidden />
                                </button>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}

                    {canEditFamily && (
                      <Link
                        to="/people/new"
                        state={{ familyId: family.id, fromOnboarding: onboarding?.isActive }}
                        className={s.familyAddLink}
                        data-onboarding={
                          families.length > 0 && family.id === families[0].id ? 'add-child' : undefined
                        }
                      >
                        <Card className={`${s.familyCard} ${s.familyAddCard}`}>
                          <div className={s.familyContent}>
                            <div className={s.familyAvatar}>
                              <div className={s.familyAddAvatar}>+</div>
                            </div>
                            <div className={s.familyInfo}>
                              <h2 className={s.familyName}>Add Person</h2>
                              <div className={s.familyDetails}>
                                <span>Add a person to {family.name}</span>
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
  );

  // ---- Management sub-tab content ----
  const managementContent = loading.family ? (
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
                family.role === 'owner' ? (name) => handleRenameFamily(family.id, name) : undefined
              }
              onRequestDelete={
                family.role === 'owner'
                  ? () => {
                      setDeleteConfirmFamily(family);
                      setConfirmDeleteInput('');
                    }
                  : undefined
              }
              onLeave={family.role !== 'owner' ? () => setLeaveConfirmFamily(family) : undefined}
              isRenaming={loading.familyRename && familyActionId === family.id}
              isDeleting={loading.familyDelete && familyActionId === family.id}
              isLeaving={loading.familyLeave && familyActionId === family.id}
              noCard
            />

            <section
              className={s.familyManagementSection}
              aria-labelledby={`family-members-heading-${family.id}`}
            >
              <h3
                id={`family-members-heading-${family.id}`}
                className={s.familyManagementSectionTitle}
              >
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
                <section
                  className={s.familyManagementSection}
                  aria-labelledby={`family-invite-heading-${family.id}`}
                >
                  <h3
                    id={`family-invite-heading-${family.id}`}
                    className={s.familyManagementSectionTitle}
                  >
                    Invite member
                  </h3>
                  <div className={s.familyManagementSectionContent}>
                    <div className={s.familySettingsInviteForm}>
                      <FormField
                        label="Role"
                        type="select"
                        id={`invite-role-${family.id}`}
                        value={createInviteRole}
                        onChange={(e) =>
                          setCreateInviteRole(e.target.value as 'parent' | 'read_only')
                        }
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
                      Share the invite link with the person you want to add. They'll need to sign
                      in or create an account to join.
                    </p>
                    {newInviteToken?.familyId === family.id && (
                      <div className={s.familySettingsInviteLinkBox}>
                        <span className={s.familySettingsInviteLinkLabel}>
                          Invite link — copy and share
                        </span>
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
                              notify(
                                { message: 'Invite link copied to clipboard', type: 'success' },
                                2000
                              );
                            }}
                          >
                            Copy link
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setNewInviteToken(null)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section
                  className={s.familyManagementSection}
                  aria-labelledby={`family-pending-heading-${family.id}`}
                >
                  <h3
                    id={`family-pending-heading-${family.id}`}
                    className={s.familyManagementSectionTitle}
                  >
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
                              notify({ message: 'Invite link copied', type: 'success' }, 2000);
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
              <h1 className={layout.title}>Family</h1>
              <p className={familyLayout.subtitle}>
                See who's in your family, invite others, and manage access.
              </p>
            </div>

            <aside className={layout.sidebar} aria-label="Family sub-sections">
              <button
                type="button"
                className={`${layout.sidebarItem} ${familySubTab === 'members' ? layout.active : ''}`}
                onClick={() => setSubTab('members')}
                aria-current={familySubTab === 'members' ? 'page' : undefined}
                data-onboarding="family-members-tab"
              >
                <LuUsers className={layout.sidebarIcon} aria-hidden />
                <span>Members</span>
              </button>
              <button
                type="button"
                className={`${layout.sidebarItem} ${familySubTab === 'management' ? layout.active : ''}`}
                onClick={() => setSubTab('management')}
                aria-current={familySubTab === 'management' ? 'page' : undefined}
                data-onboarding="family-management-tab"
              >
                <LuSettings className={layout.sidebarIcon} aria-hidden />
                <span>Management</span>
              </button>
            </aside>

            <main className={layout.main}>
              {familySubTab === 'members' ? membersContent : managementContent}
            </main>
          </div>
        </Card>
      </div>

      {/* ---- Modals (ported verbatim from FamilyTab.tsx) ---- */}
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
              <h2 id="leave-family-modal-title">⚠️ Leave family</h2>
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
                🚨 You will lose access to <strong>{leaveConfirmFamily.name}</strong> and all of its
                data. You can only rejoin if someone invites you again.
              </p>
              <p className={s.deleteFamilyInstruction}>
                Are you sure you want to leave this family?
              </p>
            </div>
            <div className={modalStyles.footer}>
              <Button variant="secondary" onClick={() => setLeaveConfirmFamily(null)}>
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
              <h2 id="delete-family-modal-title">⚠️ Delete family</h2>
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
                🚨 <strong>This action cannot be undone.</strong> All members will lose access to
                this family and its data.
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
          aria-labelledby="delete-person-modal-title"
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
              <h2 id="delete-person-modal-title">⚠️ Delete {deleteConfirmChild.name}</h2>
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
                🚨 <strong>This action cannot be undone.</strong> All associated visits and data
                will be permanently deleted.
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
      {showSelfRecordModal && (
        <SelfRecordPromptModal
          onResolved={(result) => {
            setShowSelfRecordModal(false);
            if (result.kind === 'created-avatar-failed') {
              notify({
                message: `Profile created, but photo upload failed: ${result.avatarError}. You can add a photo later.`,
                type: 'error',
              });
            } else if (result.kind === 'created') {
              notify({ message: 'Added to family', type: 'success' });
            }
            void checkAuth();
            void loadChildren();
          }}
        />
      )}
    </div>
  );
}

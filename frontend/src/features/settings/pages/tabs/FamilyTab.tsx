import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@shared/components/Card';
import FormField from '@shared/components/FormField';
import Button from '@shared/components/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import Tabs from '@shared/components/Tabs';
import modalStyles from '@shared/components/Modal.module.css';
import mui from '@shared/styles/MeasurementsUI.module.css';
import s from '../SettingsPage.module.css';
import RoleBadge from '@shared/components/RoleBadge';
import { FamilyOverviewCard, MemberRow, InviteRow } from '../../components';
import { ApiClientError, childrenApi, familiesApi } from '@lib/api-client';
import type { Child, Family, FamilyInvite, FamilyMember } from '@shared/types/api';
import { calculateAge, formatAge, formatDate } from '@lib/date-utils';
import { ChildAvatar } from '@features/children';
import { LuUserPlus } from 'react-icons/lu';
import { useFamilyPermissions } from '@/contexts/FamilyPermissionsContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import type { NotifyFn } from './types';

const INVITE_TOKENS_KEY = 'trajectory_invite_tokens';

type FamilySubTab = 'management' | 'members';

export default function FamilyTab({
  notify,
  initialSubTab,
}: {
  notify: NotifyFn;
  initialSubTab?: FamilySubTab;
}) {
  const { user } = useAuth();
  const { refreshPermissions } = useFamilyPermissions();
  const onboarding = useOnboarding();

  const [familySubTab, setFamilySubTab] = useState<FamilySubTab>(initialSubTab ?? 'members');

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

  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [loadingKids, setLoadingKids] = useState(false);
  const [errorKids, setErrorKids] = useState<string | null>(null);
  const [deletingChildId, setDeletingChildId] = useState<number | null>(null);
  const [deleteConfirmChild, setDeleteConfirmChild] = useState<Child | null>(null);
  const [confirmDeleteChildInput, setConfirmDeleteChildInput] = useState('');

  const [savingMemberRole, setSavingMemberRole] = useState<{ familyId: number; userId: number } | null>(null);

  useEffect(() => {
    if (initialSubTab) setFamilySubTab(initialSubTab);
  }, [initialSubTab]);

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
      const res = await childrenApi.getAll();
      setChildrenList(res.data);
    } catch (err) {
      setErrorKids(err instanceof ApiClientError ? err.message : 'Failed to load children');
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

  const handleDeleteChild = async (child: Child) => {
    setDeletingChildId(child.id);
    try {
      await childrenApi.delete(child.id);
      setChildrenList((prev) => prev.filter((c) => c.id !== child.id));
      notify({ message: `${child.name} has been deleted`, type: 'success' });
      setDeleteConfirmChild(null);
      setConfirmDeleteChildInput('');
    } catch (err) {
      notify({
        message: err instanceof ApiClientError ? err.message || 'Failed to delete child' : 'Failed to delete child',
        type: 'error',
      });
    } finally {
      setDeletingChildId(null);
    }
  };

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
      notify({ message: err instanceof ApiClientError ? err.message || 'Failed to create invite' : 'Failed to create invite', type: 'error' }, 4000);
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
      notify({ message: err instanceof ApiClientError ? err.message || 'Failed to update role' : 'Failed to update role', type: 'error' }, 4000);
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
      notify({ message: err instanceof ApiClientError ? err.message || 'Failed to remove member' : 'Failed to remove member', type: 'error' }, 4000);
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
      notify({ message: err instanceof ApiClientError ? err.message || 'Failed to revoke invite' : 'Failed to revoke invite', type: 'error' }, 4000);
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
      notify({ message: err instanceof ApiClientError ? err.message || 'Failed to rename family' : 'Failed to rename family', type: 'error' }, 4000);
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
      notify({ message: err instanceof ApiClientError ? err.message || 'Failed to delete family' : 'Failed to delete family', type: 'error' }, 4000);
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
      notify({ message: err instanceof ApiClientError ? err.message || 'Failed to leave family' : 'Failed to leave family', type: 'error' }, 4000);
    } finally {
      setLoading((l) => ({ ...l, familyLeave: false }));
      setFamilyActionId(null);
    }
  };

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
                        savingUserId={savingMemberRole?.familyId === family.id ? savingMemberRole.userId : null}
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
                        <span className={mui.cardAddLabel}>{loading.invite ? 'Creating…' : 'Create invite'}</span>
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
                              notify({ message: 'Invite link copied to clipboard', type: 'success' }, 2000);
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
    <>
      <Card title="Family Settings">
        <p className={s.familySettingsPageSubtitle}>
          See who's in your family, invite others, and manage access.
        </p>
        <Tabs
          activeTab={familySubTab}
          onTabChange={(id) => setFamilySubTab(id as FamilySubTab)}
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
                🚨 You will lose access to <strong>{leaveConfirmFamily.name}</strong> and all of its data. You can only rejoin if someone invites you again.
              </p>
              <p className={s.deleteFamilyInstruction}>Are you sure you want to leave this family?</p>
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
                disabled={confirmDeleteInput.trim() !== `delete ${deleteConfirmFamily.name}` || loading.familyDelete}
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
              <h2 id="delete-child-modal-title">⚠️ Delete {deleteConfirmChild.name}</h2>
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
                disabled={confirmDeleteChildInput.trim() !== `delete ${deleteConfirmChild.name}` || deletingChildId === deleteConfirmChild.id}
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
    </>
  );
}

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { LuActivity, LuHeart, LuThermometer } from 'react-icons/lu';
import { childrenApi, visitsApi, illnessesApi, ApiClientError } from '../lib/api-client';
import ChildAvatar from '../components/ChildAvatar';
import type { Child, Visit, VisitType, Illness, VisitAttachment, ChildAttachment } from '../types/api';
import { calculateAge, formatAge, formatDate, isFutureVisit } from '../lib/date-utils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import Button from '../components/Button';
import Notification from '../components/Notification';
import VisitTypeModal from '../components/VisitTypeModal';
import TimelineItem from '../components/TimelineItem';
import Tabs from '../components/Tabs';
import DocumentsList from '../components/DocumentsList';
import DocumentsSidebar, { type DocumentTypeFilter } from '../components/DocumentsSidebar';
import ImageCropUpload from '../components/ImageCropUpload';
import VaccineHistory from '../components/VaccineHistory';
import VisitsSidebar from '../components/VisitsSidebar';
import IllnessesSidebar from '../components/IllnessesSidebar';
import TrendsSidebar from '../components/TrendsSidebar';
import MetricsView from '../components/MetricsView';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import { LuPill } from 'react-icons/lu';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import { LuEye } from 'react-icons/lu';
import { useFamilyPermissions } from '../contexts/FamilyPermissionsContext';
// replaced local mask icon with Lucide thermometer for illness

function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [child, setChild] = useState<Child | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [illnesses, setIllnesses] = useState<Illness[]>([]);
  const [lastWellnessVisit, setLastWellnessVisit] = useState<Visit | null>(null);
  const [lastSickVisit, setLastSickVisit] = useState<Visit | null>(null);
  const [lastVisionVisit, setLastVisionVisit] = useState<Visit | null>(null);
  const [lastDentalVisit, setLastDentalVisit] = useState<Visit | null>(null);
  const [lastInjuryVisit, setLastInjuryVisit] = useState<Visit | null>(null);
  const [lastIllness, setLastIllness] = useState<Illness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVisitTypeModal, setShowVisitTypeModal] = useState(false);
  const [visitTypeFilter, setVisitTypeFilter] = useState<'all' | 'wellness' | 'sick' | 'injury' | 'vision' | 'dental'>('all');
  const [filterIllnessStatus, setFilterIllnessStatus] = useState<'ongoing' | 'ended' | undefined>(undefined);
  const [metricsActiveTab, setMetricsActiveTab] = useState<'illness' | 'growth'>('illness');
  const [metricsYear, setMetricsYear] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'visits' | 'illnesses' | 'metrics' | 'documents' | 'vaccines'>('visits');
  const [documents, setDocuments] = useState<Array<(VisitAttachment & { visit: Visit; type: 'visit' }) | (ChildAttachment & { type: 'child' })>>([]);
  const [documentTypeFilter, setDocumentTypeFilter] = useState<DocumentTypeFilter>('all');
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { canEdit } = useFamilyPermissions();
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  // Track which visits have attachments (visit ID set)
  const [visitsWithAttachments, setVisitsWithAttachments] = useState<Set<number>>(new Set());

  const loadChild = useCallback(async () => {
    if (!id) {
      setError('Invalid child ID');
      setLoading(false);
      return;
    }

    const childId = parseInt(id);
    if (isNaN(childId)) {
      setError('Invalid child ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [childResponse, allVisitsResponse, wellnessVisitsResponse, sickVisitsResponse, visionVisitsResponse, dentalVisitsResponse, illnessesResponse] = await Promise.all([
        childrenApi.getById(childId),
        visitsApi.getAll({ child_id: childId }),
        visitsApi.getAll({ child_id: childId, visit_type: 'wellness' }),
        visitsApi.getAll({ child_id: childId, visit_type: 'sick' }),
        visitsApi.getAll({ child_id: childId, visit_type: 'vision' }),
        visitsApi.getAll({ child_id: childId, visit_type: 'dental' }),
        illnessesApi.getAll({ child_id: childId }),
      ]);

      setChild(childResponse.data);
      setVisits(allVisitsResponse.data);
      setIllnesses(illnessesResponse.data);
      // Derive last injury visit from all visits (only on or before today)
      const sortedAll = [...allVisitsResponse.data].sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
      const pastOrTodayVisits = sortedAll.filter(v => !isFutureVisit(v));
      const lastInjury = pastOrTodayVisits.find(v => v.visit_type === 'injury') || null;
      setLastInjuryVisit(lastInjury);
      // Derive last illness (use the latest illness that has an end_date)
      const endedIllnesses = illnessesResponse.data.filter(i => i.end_date).sort((a, b) => new Date(b.end_date!).getTime() - new Date(a.end_date!).getTime());
      const lastEndedIllness = endedIllnesses.length > 0 ? endedIllnesses[0] : null;
      setLastIllness(lastEndedIllness);
      // Determine which visits have attachments so the timeline can show an indicator
      try {
        const visitAttachmentChecks = await Promise.all(
          allVisitsResponse.data.map(async (visit) => {
            try {
              const attachmentsResp = await visitsApi.getAttachments(visit.id);
              return (attachmentsResp.data && attachmentsResp.data.length > 0) ? visit.id : null;
            } catch (err) {
              // On error, treat as no attachments for that visit
              return null;
            }
          })
        );

        const visitIdsWithAttachments = new Set<number>();
        visitAttachmentChecks.forEach(id => {
          if (id !== null) visitIdsWithAttachments.add(id as number);
        });
        setVisitsWithAttachments(visitIdsWithAttachments);
      } catch (err) {
        // ignore attachment population errors
      }

      // Get most recent wellness/sick/vision/dental visit (only on or before today; visits sorted by date DESC)
      const lastPastWellness = wellnessVisitsResponse.data.find(v => !isFutureVisit(v)) ?? null;
      const lastPastSick = sickVisitsResponse.data.find(v => !isFutureVisit(v)) ?? null;
      const lastPastVision = visionVisitsResponse.data.find(v => !isFutureVisit(v)) ?? null;
      const lastPastDental = dentalVisitsResponse.data.find(v => !isFutureVisit(v)) ?? null;
      setLastWellnessVisit(lastPastWellness);
      setLastSickVisit(lastPastSick);
      setLastVisionVisit(lastPastVision);
      setLastDentalVisit(lastPastDental);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load child');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadChild();
  }, [loadChild]);

  // When navigating back from Add Illness (or similar), open the requested tab
  const stateTab = (location.state as { tab?: 'visits' | 'illnesses' | 'metrics' | 'documents' | 'vaccines' } | null)?.tab;
  useEffect(() => {
    if (stateTab != null) {
      setActiveTab(stateTab);
    }
  }, [stateTab]);

  const loadDocuments = useCallback(async () => {
    if (!id) return;

    const childId = parseInt(id);
    if (isNaN(childId)) return;

    try {
      setLoadingDocuments(true);
      // Get all visits for the child
      const visitsResponse = await visitsApi.getAll({ child_id: childId });
      const allVisits = visitsResponse.data;

      // Get attachments for each visit
      const visitDocumentsPromises = allVisits.map(async (visit) => {
        try {
          const attachmentsResponse = await visitsApi.getAttachments(visit.id);
          return attachmentsResponse.data.map(attachment => ({
            ...attachment,
            visit,
            type: 'visit' as const,
          }));
        } catch (error) {
          console.error(`Failed to load attachments for visit ${visit.id}:`, error);
          return [];
        }
      });

      // Get child attachments (vaccine reports, etc.)
      const childAttachmentsResponse = await childrenApi.getAttachments(childId);
      const childDocuments = childAttachmentsResponse.data.map(attachment => ({
        ...attachment,
        type: 'child' as const,
      }));

      const visitDocumentsArrays = await Promise.all(visitDocumentsPromises);
      const allVisitDocuments = visitDocumentsArrays.flat();

      // Combine and sort by date (newest first) for documents tab
      const allDocuments = [...allVisitDocuments, ...childDocuments];
      allDocuments.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDocuments(allDocuments);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'documents') {
      loadDocuments();
    }
  }, [activeTab, loadDocuments]);

  // Filter visits that have vaccines for the vaccine history tab
  const visitsWithVaccines = useMemo(() => {
    return visits.filter(visit =>
      visit.vaccines_administered && visit.vaccines_administered.length > 0
    );
  }, [visits]);

  const handleImageCropped = (croppedFile: File) => {
    setAvatarFile(croppedFile);
  };

  const handleAvatarSave = async () => {
    if (!child || !avatarFile) return;

    try {
      setUploadingAvatar(true);
      await childrenApi.uploadAvatar(child.id, avatarFile);
      setShowAvatarEditor(false);
      setAvatarFile(null);
      setNotification({ message: 'Avatar updated successfully!', type: 'success' });
      // Reload child data to show new avatar
      await loadChild();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to update avatar', type: 'error' });
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  // When loading child data, also fetch attachments for each visit to determine
  // which visits have attachments so the visits timeline can show an indicator.
  // This runs as part of `loadChild` (below) and is kept here as a safety fallback
  // in case documents are loaded separately.

  // Soonest future visit for this child (for merged Last/Next strip)
  const nextUpVisit = useMemo(() => {
    const future = visits.filter(isFutureVisit).sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());
    return future.length > 0 ? future[0] : null;
  }, [visits]);

  // One badge section: each card can show Last and/or Next for that type (same badge, not separate)
  const overviewVisitCards = useMemo(() => {
    const lastByType: Record<string, { date: string; href: string }> = {};
    if (lastWellnessVisit) lastByType['wellness'] = { date: lastWellnessVisit.visit_date, href: `/visits/${lastWellnessVisit.id}` };
    if (lastSickVisit) lastByType['sick'] = { date: lastSickVisit.visit_date, href: `/visits/${lastSickVisit.id}` };
    if (lastVisionVisit) lastByType['vision'] = { date: lastVisionVisit.visit_date, href: `/visits/${lastVisionVisit.id}` };
    if (lastDentalVisit) lastByType['dental'] = { date: lastDentalVisit.visit_date, href: `/visits/${lastDentalVisit.id}` };
    if (lastInjuryVisit) lastByType['injury'] = { date: lastInjuryVisit.visit_date, href: `/visits/${lastInjuryVisit.id}` };
    if (lastIllness) lastByType['illness'] = { date: lastIllness.end_date || lastIllness.start_date, href: `/illnesses/${lastIllness.id}` };
    const next = nextUpVisit ? { type: nextUpVisit.visit_type as Visit['visit_type'], date: nextUpVisit.visit_date, href: `/visits/${nextUpVisit.id}` } : null;
    type Card = { key: string; visitType: Visit['visit_type'] | 'illness'; last?: { date: string; href: string }; next?: { date: string; href: string } };
    const types: (Visit['visit_type'] | 'illness')[] = ['wellness', 'sick', 'vision', 'dental', 'injury', 'illness'];
    const cards: Card[] = [];
    for (const t of types) {
      const last = lastByType[t];
      const nextForType = next && next.type === t ? { date: next.date, href: next.href } : undefined;
      if (last || nextForType) cards.push({ key: t, visitType: t, last, next: nextForType });
    }
    return cards;
  }, [lastWellnessVisit, lastSickVisit, lastVisionVisit, lastDentalVisit, lastInjuryVisit, lastIllness, nextUpVisit]);

  // Filter visits - MUST be called before early returns (Rules of Hooks)
  const visitItems = useMemo(() => {
    type VisitItem = {
      id: string;
      date: string;
      data: Visit;
    };

    const items: VisitItem[] = [];

    // Add visits with visit type filter
    visits.forEach(visit => {
      if (visitTypeFilter === 'all' || visit.visit_type === visitTypeFilter) {
        items.push({
          id: `visit-${visit.id}`,
          date: visit.visit_date,
          data: visit,
        });
      }
    });

    // Sort by date (most recent first)
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return items;
  }, [visits, visitTypeFilter]);

  // Filter illnesses by status - MUST be called before early returns (Rules of Hooks)
  const illnessItems = useMemo(() => {
    type IllnessItem = {
      id: string;
      date: string;
      data: Illness;
    };

    let list = illnesses;
    if (filterIllnessStatus === 'ongoing') {
      list = illnesses.filter((i) => !i.end_date);
    } else if (filterIllnessStatus === 'ended') {
      list = illnesses.filter((i) => !!i.end_date);
    }

    const items: IllnessItem[] = list.map((illness) => ({
      id: `illness-${illness.id}`,
      date: illness.start_date,
      data: illness,
    }));

    // Sort by date (most recent first)
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return items;
  }, [illnesses, filterIllnessStatus]);

  const filteredDocuments = useMemo(() => {
    if (documentTypeFilter === 'visit') return documents.filter((d) => d.type === 'visit');
    if (documentTypeFilter === 'vaccine') return documents.filter((d) => d.type === 'child');
    return documents;
  }, [documents, documentTypeFilter]);
  const visitDocsCount = documents.filter((d) => d.type === 'visit').length;
  const vaccineDocsCount = documents.filter((d) => d.type === 'child').length;

  // Early returns AFTER all hooks
  if (loading) {
    return <LoadingSpinner message="Loading child details..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadChild} />;
  }

  if (!child) {
    return <ErrorMessage message="Child not found" onRetry={loadChild} />;
  }

  const age = calculateAge(child.date_of_birth);

  return (
    <div className="page-container">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Unified Overview and Tabs Section */}
      <Card>
        <div className="child-detail-body">
          {/* Overview Section - without header title */}
          <div className="child-detail-section">
            <Link to="/" className="breadcrumb">← Back to Children</Link>
            <div className="overview-header">
              <div className="overview-main">
                <div className="overview-avatar">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => setShowAvatarEditor(true)}
                      className="overview-avatar-button"
                      title="Click to edit avatar"
                    >
                      <ChildAvatar
                        avatar={child.avatar}
                        gender={child.gender}
                        alt={`${child.name}'s avatar`}
                        className="overview-avatar-img"
                      />
                      <div className="overview-avatar-overlay">
                        <span className="overview-avatar-edit-icon">✏️</span>
                      </div>
                    </button>
                  ) : (
                    <div className="overview-avatar-static">
                      <ChildAvatar
                        avatar={child.avatar}
                        gender={child.gender}
                        alt={`${child.name}'s avatar`}
                        className="overview-avatar-img"
                      />
                    </div>
                  )}
                </div>
                <div className="overview-info">
                  <h1 className="overview-name">{child.name}</h1>
                  <div className="overview-details">
                    <div className="overview-detail-item">
                      <span className="overview-detail-label">Age:</span>
                      <span className="overview-detail-value">
                        {formatAge(age.years, age.months)}
                      </span>
                    </div>
                    <div className="overview-detail-item">
                      <span className="overview-detail-label">Date of Birth:</span>
                      <span className="overview-detail-value">{formatDate(child.date_of_birth)}</span>
                    </div>
                    {child.due_date && (
                      <div className="overview-detail-item">
                        <span className="overview-detail-label">Due Date:</span>
                        <span className="overview-detail-value">{formatDate(child.due_date)}</span>
                      </div>
                    )}
                    {(child.birth_weight || child.birth_weight_ounces) && (
                      <div className="overview-detail-item">
                        <span className="overview-detail-label">Birth Weight:</span>
                        <span className="overview-detail-value">
                          {child.birth_weight ? `${child.birth_weight} lbs` : ''}
                          {child.birth_weight && child.birth_weight_ounces ? ' ' : ''}
                          {child.birth_weight_ounces ? `${child.birth_weight_ounces} oz` : ''}
                        </span>
                      </div>
                    )}
                    {child.birth_height && (
                      <div className="overview-detail-item">
                        <span className="overview-detail-label">Birth Height:</span>
                        <span className="overview-detail-value">{child.birth_height}"</span>
                      </div>
                    )}
                    {child.notes && (
                      <div className="overview-detail-item">
                        <span className="overview-detail-label">Notes:</span>
                        <span className="overview-detail-value">{child.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Last & Next in ONE badge section: each card shows Last and/or Next for that type */}
            <div className="overview-visits-strip">
              {overviewVisitCards.length === 0 ? (
                <span className="overview-visits-empty">No visits recorded yet</span>
              ) : (
                overviewVisitCards.map((card) => {
                  const typeLabel = card.visitType === 'illness' ? 'Illness' : card.visitType === 'wellness' ? 'Wellness' : card.visitType === 'sick' ? 'Sick' : card.visitType === 'injury' ? 'Injury' : card.visitType === 'vision' ? 'Vision' : card.visitType === 'dental' ? 'Dental' : 'Visit';
                  return (
                    <div key={card.key} className="overview-last-visit">
                      <div className={`visit-icon-outline visit-icon--${card.visitType}`} aria-hidden>
                        {card.visitType === 'wellness' && <LuHeart className="visit-type-svg" />}
                        {card.visitType === 'sick' && <LuPill className="visit-type-svg" />}
                        {card.visitType === 'injury' && <MdOutlinePersonalInjury className="visit-type-svg visit-type-svg--filled" />}
                        {card.visitType === 'vision' && <LuEye className="visit-type-svg" />}
                        {card.visitType === 'dental' && <HugeiconsIcon icon={DentalToothIcon} className="visit-type-svg" size={24} color="currentColor" />}
                        {card.visitType === 'illness' && <LuThermometer className="visit-type-svg" />}
                      </div>
                      <div className="overview-visit-info">
                        {card.last && (
                          <Link
                            to={card.last.href}
                            className={`overview-visit-row${card.next ? '' : ' overview-visit-row--stacked'}`}
                          >
                            <span className="overview-visit-label">{card.next ? 'Last:' : `Last ${typeLabel} Visit:`}</span>
                            <span className="overview-visit-date">{formatDate(card.last.date)}</span>
                          </Link>
                        )}
                        {card.next && (
                          <Link
                            to={card.next.href}
                            className={`overview-visit-row ${card.last ? '' : ' overview-visit-row--stacked'}`}
                          >
                            <span className="overview-visit-label">{card.last ? 'Next:' : `Next ${typeLabel} Visit:`}</span>
                            <span className="overview-visit-date">{formatDate(card.next.date)}</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Tabs Section */}
          <div className="child-detail-section">
            {(() => {
              const tabsArray: any[] = [];

              tabsArray.push({
                id: 'visits',
                label: 'Visits',
                content: (
                  <div className="visits-page-layout">
                    <VisitsSidebar
                      stats={[
                        {
                          label: 'Total Visits',
                          value: visits.length,
                          icon: LuActivity,
                          color: 'gray',
                          onClick: () => setVisitTypeFilter('all'),
                          active: visitTypeFilter === 'all',
                        },
                        {
                          label: 'Wellness',
                          value: visits.filter((v) => v.visit_type === 'wellness').length,
                          icon: LuHeart,
                          color: 'emerald',
                          onClick: () => setVisitTypeFilter('wellness'),
                          active: visitTypeFilter === 'wellness',
                        },
                        {
                          label: 'Sick',
                          value: visits.filter((v) => v.visit_type === 'sick').length,
                          icon: LuPill,
                          color: 'red',
                          onClick: () => setVisitTypeFilter('sick'),
                          active: visitTypeFilter === 'sick',
                        },
                        {
                          label: 'Injury',
                          value: visits.filter((v) => v.visit_type === 'injury').length,
                          icon: MdOutlinePersonalInjury,
                          color: 'blue',
                          onClick: () => setVisitTypeFilter('injury'),
                          active: visitTypeFilter === 'injury',
                        },
                        {
                          label: 'Dental',
                          value: visits.filter((v) => v.visit_type === 'dental').length,
                          icon: (props: { className?: string }) => <HugeiconsIcon icon={DentalToothIcon} {...props} size={24} color="currentColor" />,
                          color: 'teal',
                          onClick: () => setVisitTypeFilter('dental'),
                          active: visitTypeFilter === 'dental',
                        },
                        {
                          label: 'Vision',
                          value: visits.filter((v) => v.visit_type === 'vision').length,
                          icon: LuEye,
                          color: 'purple',
                          onClick: () => setVisitTypeFilter('vision'),
                          active: visitTypeFilter === 'vision',
                        },
                      ]}
                      // Child detail page already implies the child; hide selector.
                      childrenList={[]}
                      selectedChildId={undefined}
                      onSelectChild={() => { }}
                      hideChildFilter
                      onAddVisitClick={() => setShowVisitTypeModal(true)}
                    />

                    <main className="visits-main">
                      {visitItems.length === 0 ? (
                        <Card>
                          <p className="empty-state">
                            No visits recorded yet. Click "Add Visit" to get started.
                          </p>
                        </Card>
                      ) : (
                        <Card>
                          <div className="timeline-list-modern">
                            {visitItems.map((item) => (
                              <TimelineItem
                                key={item.id}
                                type="visit"
                                data={item.data}
                                hasAttachments={visitsWithAttachments.has(item.data.id)}
                                childName={undefined} // Child detail page: don't show child badge here
                              />
                            ))}
                          </div>
                        </Card>
                      )}
                    </main>
                  </div>
                ),
              });

              tabsArray.push({
                id: 'illnesses',
                label: 'Illnesses',
                content: (
                  <div className="visits-page-layout">
                    <IllnessesSidebar
                      stats={[
                        {
                          label: 'Total Illnesses',
                          value: illnesses.length,
                          icon: LuActivity,
                          color: 'blue',
                          onClick: () => setFilterIllnessStatus(undefined),
                          active: !filterIllnessStatus,
                        },
                        {
                          label: 'Ongoing',
                          value: illnesses.filter((i) => !i.end_date).length,
                          icon: LuActivity,
                          color: 'red',
                          onClick: () => setFilterIllnessStatus('ongoing'),
                          active: filterIllnessStatus === 'ongoing',
                        },
                        {
                          label: 'Ended',
                          value: illnesses.filter((i) => !!i.end_date).length,
                          icon: LuActivity,
                          color: 'emerald',
                          onClick: () => setFilterIllnessStatus('ended'),
                          active: filterIllnessStatus === 'ended',
                        },
                      ]}
                      childrenList={[]}
                      selectedChildId={undefined}
                      onSelectChild={() => { }}
                      hideChildFilter
                      addIllnessChildId={child?.id}
                    />
                    <main className="visits-main">
                      {illnessItems.length === 0 ? (
                        <Card>
                          <p className="empty-state">
                            No illnesses recorded yet. Click "Add Illness" to get started.
                          </p>
                        </Card>
                      ) : (
                        <Card>
                          <div className="timeline-list-modern">
                            {illnessItems.map((item) => (
                              <TimelineItem
                                key={item.id}
                                type="illness"
                                data={item.data}
                              />
                            ))}
                          </div>
                        </Card>
                      )}
                    </main>
                  </div>
                ),
              });

              tabsArray.push({
                id: 'documents',
                label: 'Documents',
                content: loadingDocuments ? (
                  <LoadingSpinner message="Loading documents..." />
                ) : (
                  <div className="visits-page-layout">
                    <DocumentsSidebar
                      total={documents.length}
                      visitCount={visitDocsCount}
                      vaccineCount={vaccineDocsCount}
                      filter={documentTypeFilter}
                      onFilterChange={setDocumentTypeFilter}
                    />
                    <main className="visits-main">
                      <DocumentsList documents={filteredDocuments} onUpdate={loadDocuments} showHeader={false} />
                    </main>
                  </div>
                ),
              });

              // Only include the Vaccines tab when there are visits with vaccines
              if (visitsWithVaccines.length > 0) {
                tabsArray.push({
                  id: 'vaccines',
                  label: 'Vaccines',
                  content: <VaccineHistory visits={visitsWithVaccines} childId={parseInt(id!)} onUploadSuccess={loadDocuments} />,
                });
              }

              // Metrics tab at far right
              tabsArray.push({
                id: 'metrics',
                label: 'Metrics',
                content: (
                  <div className="visits-page-layout">
                    <TrendsSidebar
                      activeTab={metricsActiveTab}
                      onChangeTab={(t) => setMetricsActiveTab(t)}
                      childrenList={child ? [child] : []}
                      selectedChildId={child?.id}
                      onSelectChild={() => { }}
                      showChildFilter={false}
                    />
                    <main className="visits-main">
                      <MetricsView
                        activeTab={metricsActiveTab}
                        onActiveTabChange={(t) => setMetricsActiveTab(t)}
                        selectedYear={metricsYear}
                        onSelectedYearChange={(y) => setMetricsYear(y)}
                        filterChildId={child?.id}
                        onFilterChildChange={() => { }}
                      />
                    </main>
                  </div>
                ),
              });

              return (
                <Tabs
                  activeTab={activeTab}
                  onTabChange={(tabId) => setActiveTab(tabId as 'visits' | 'illnesses' | 'metrics' | 'documents' | 'vaccines')}
                  tabs={tabsArray}
                />
              );
            })()}
          </div>
        </div>
      </Card>

      <VisitTypeModal
        isOpen={showVisitTypeModal}
        onSelect={(visitType: VisitType) => {
          setShowVisitTypeModal(false);
          navigate(`/children/${child.id}/visits/new?type=${visitType}`, {
            state: { from: `${location.pathname}${location.search}`, childId: child.id }
          });
        }}
        onClose={() => setShowVisitTypeModal(false)}
      />

      {/* Avatar Editor Modal */}
      {showAvatarEditor && (
        <div className="modal-overlay" onClick={() => !uploadingAvatar && setShowAvatarEditor(false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Avatar</h2>
              <button
                type="button"
                onClick={() => setShowAvatarEditor(false)}
                className="modal-close"
                disabled={uploadingAvatar}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <ImageCropUpload
                onImageCropped={handleImageCropped}
                currentImageUrl={child.avatar ? childrenApi.getAvatarUrl(child.avatar) : childrenApi.getDefaultAvatarUrl(child.gender)}
                disabled={uploadingAvatar}
              />
              {avatarFile && (
                <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  ✓ New avatar ready to upload
                </div>
              )}
            </div>
            <div className="modal-footer">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAvatarEditor(false);
                  setAvatarFile(null);
                }}
                disabled={uploadingAvatar}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAvatarSave}
                disabled={!avatarFile || uploadingAvatar}
              >
                {uploadingAvatar ? 'Uploading...' : 'Save Avatar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChildDetailPage;

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { LuEye, LuHeart, LuThermometer } from 'react-icons/lu';
import { childrenApi, visitsApi, illnessesApi, ApiClientError } from '@lib/api-client';
import type { Child, Visit, VisitType, Illness, VisitAttachment, ChildAttachment } from '@shared/types/api';
import { calculateAge, formatAge, formatDate, isFutureVisit } from '@lib/date-utils';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Notification from '@shared/components/Notification';
import { VisitTypeModal } from '@features/visits';
import modalStyles from '@shared/components/Modal.module.css';
import cd from './ChildDetailPage.module.css';
import pageLayout from '@shared/styles/page-layout.module.css';
import vi from '@shared/styles/VisitIcons.module.css';
import { ChildAvatar } from '@features/children/components';
import Tabs from '@shared/components/Tabs';
import { type DocumentTypeFilter } from '@features/documents/components/DocumentsSidebar';
import ImageCropUpload, { type ImageCropUploadHandle } from '@shared/components/ImageCropUpload';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import { LuPill } from 'react-icons/lu';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import { useFamilyPermissions } from '@/contexts/FamilyPermissionsContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { DocumentsTab, IllnessesTab, TrendsTab, VaccinesTab, VisitsTab } from './tabs';
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
  const [visitsCurrentPage, setVisitsCurrentPage] = useState(0);
  const [visitsItemsPerPage, setVisitsItemsPerPage] = useState(20);
  const [illnessesCurrentPage, setIllnessesCurrentPage] = useState(0);
  const [illnessesItemsPerPage, setIllnessesItemsPerPage] = useState(20);
  const [metricsActiveTab, setMetricsActiveTab] = useState<'illness' | 'growth'>('illness');
  const [metricsYear, setMetricsYear] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'visits' | 'illnesses' | 'metrics' | 'documents' | 'vaccines'>('visits');
  const [documents, setDocuments] = useState<Array<(VisitAttachment & { visit: Visit; type: 'visit' }) | (ChildAttachment & { type: 'child' })>>([]);
  const [documentTypeFilter, setDocumentTypeFilter] = useState<DocumentTypeFilter>('all');
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const imageCropUploadRef = useRef<ImageCropUploadHandle>(null);
  const { canEdit } = useFamilyPermissions();
  const onboarding = useOnboarding();
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

  // Onboarding: when user lands on child detail from "click your child", advance to feature tour
  useEffect(() => {
    if (onboarding?.isActive && onboarding.step === 'return_home_click_child') {
      onboarding.advance();
    }
  }, [onboarding?.isActive, onboarding?.step, onboarding]);

  // When navigating back from Add Illness (or similar), open the requested tab
  const stateTab = (location.state as { tab?: 'visits' | 'illnesses' | 'metrics' | 'documents' | 'vaccines' } | null)?.tab;
  useEffect(() => {
    if (stateTab != null) {
      setActiveTab(stateTab);
    }
  }, [stateTab]);

  // Growth data: any visit with weight/height/head/bmi. Illness data: any illness record.
  const hasGrowthData = useMemo(
    () =>
      visits.some(
        (v) =>
          (v as Visit).weight_value != null ||
          (v as Visit).height_value != null ||
          (v as Visit).head_circumference_value != null ||
          (v as Visit).bmi_value != null
      ),
    [visits]
  );
  const hasIllnessData = useMemo(() => illnesses.length > 0, [illnesses]);

  // When only one metrics sub-tab is available, select it
  useEffect(() => {
    if (!hasGrowthData) setMetricsActiveTab('illness');
    else if (!hasIllnessData) setMetricsActiveTab('growth');
  }, [hasGrowthData, hasIllnessData]);

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

  // Soonest future visit per type (for Last/Next strip)
  const nextByType = useMemo(() => {
    const future = visits.filter(isFutureVisit).sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());
    const byType: Record<string, { date: string; href: string }> = {};
    for (const v of future) {
      if (!byType[v.visit_type]) {
        byType[v.visit_type] = { date: v.visit_date, href: `/visits/${v.id}` };
      }
    }
    return byType;
  }, [visits]);

  // One card per visit type when that type has last and/or next; each card shows Last and/or Next (only render when data exists)
  const overviewVisitCards = useMemo(() => {
    const lastByType: Record<string, { date: string; href: string }> = {};
    if (lastWellnessVisit) lastByType['wellness'] = { date: lastWellnessVisit.visit_date, href: `/visits/${lastWellnessVisit.id}` };
    if (lastSickVisit) lastByType['sick'] = { date: lastSickVisit.visit_date, href: `/visits/${lastSickVisit.id}` };
    if (lastVisionVisit) lastByType['vision'] = { date: lastVisionVisit.visit_date, href: `/visits/${lastVisionVisit.id}` };
    if (lastDentalVisit) lastByType['dental'] = { date: lastDentalVisit.visit_date, href: `/visits/${lastDentalVisit.id}` };
    if (lastInjuryVisit) lastByType['injury'] = { date: lastInjuryVisit.visit_date, href: `/visits/${lastInjuryVisit.id}` };
    if (lastIllness) lastByType['illness'] = { date: lastIllness.end_date || lastIllness.start_date, href: `/illnesses/${lastIllness.id}` };
    type Card = { key: string; visitType: Visit['visit_type'] | 'illness'; last?: { date: string; href: string }; next?: { date: string; href: string } };
    const visitTypes: Visit['visit_type'][] = ['wellness', 'sick', 'injury', 'vision', 'dental'];
    const cards: Card[] = [];
    for (const t of visitTypes) {
      const last = lastByType[t];
      const next = nextByType[t];
      if (last || next) cards.push({ key: t, visitType: t, last, next });
    }
    if (lastByType['illness']) {
      cards.push({ key: 'illness', visitType: 'illness', last: lastByType['illness'], next: undefined });
    }
    return cards;
  }, [lastWellnessVisit, lastSickVisit, lastVisionVisit, lastDentalVisit, lastInjuryVisit, lastIllness, nextByType]);

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

  useEffect(() => {
    setVisitsCurrentPage(0);
  }, [visitTypeFilter, visits]);

  useEffect(() => {
    setIllnessesCurrentPage(0);
  }, [filterIllnessStatus, illnesses]);

  const visibleVisitItems = useMemo(() => {
    const startIdx = visitsCurrentPage * visitsItemsPerPage;
    return visitItems.slice(startIdx, startIdx + visitsItemsPerPage);
  }, [visitItems, visitsCurrentPage, visitsItemsPerPage]);

  const visibleIllnessItems = useMemo(() => {
    const startIdx = illnessesCurrentPage * illnessesItemsPerPage;
    return illnessItems.slice(startIdx, startIdx + illnessesItemsPerPage);
  }, [illnessItems, illnessesCurrentPage, illnessesItemsPerPage]);

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
    <div className={pageLayout.pageContainer}>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Unified Overview and Tabs Section */}
      <Card>
        <div className={cd.childDetailBody}>
          {/* Overview Section - without header title */}
          <div className={cd.childDetailSection}>
            <Link to="/" className={`${pageLayout.breadcrumb} ${pageLayout.childDetailSectionBreadcrumb}`}>← Back to Children</Link>
            <div className={cd.overviewHeader}>
              <div className={cd.overviewMain}>
                <div className={cd.overviewAvatar}>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => setShowAvatarEditor(true)}
                      className={cd.overviewAvatarButton}
                      title="Click to edit avatar"
                    >
                      <ChildAvatar
                        avatar={child.avatar}
                        gender={child.gender}
                        alt={`${child.name}'s avatar`}
                        className={cd.overviewAvatarImg}
                      />
                      <div className={cd.overviewAvatarOverlay}>
                        <span className={cd.overviewAvatarEditIcon} aria-hidden>✏️</span>
                      </div>
                    </button>
                  ) : (
                    <div className={cd.overviewAvatarStatic}>
                      <ChildAvatar
                        avatar={child.avatar}
                        gender={child.gender}
                        alt={`${child.name}'s avatar`}
                        className={cd.overviewAvatarImg}
                      />
                    </div>
                  )}
                </div>
                <div className={cd.overviewInfo}>
                  <h1 className={cd.overviewName}>{child.name}</h1>
                  <div className={cd.overviewDetails}>
                    <div className={cd.overviewDetailItem}>
                      <span className={cd.overviewDetailLabel}>Age:</span>
                      <span className={cd.overviewDetailValue}>
                        {formatAge(age.years, age.months)}
                      </span>
                    </div>
                    <div className={cd.overviewDetailItem}>
                      <span className={cd.overviewDetailLabel}>Date of Birth:</span>
                      <span className={cd.overviewDetailValue}>{formatDate(child.date_of_birth)}</span>
                    </div>
                    {child.due_date && (
                      <div className={cd.overviewDetailItem}>
                        <span className={cd.overviewDetailLabel}>Due Date:</span>
                        <span className={cd.overviewDetailValue}>{formatDate(child.due_date)}</span>
                      </div>
                    )}
                    {(child.birth_weight || child.birth_weight_ounces) && (
                      <div className={cd.overviewDetailItem}>
                        <span className={cd.overviewDetailLabel}>Birth Weight:</span>
                        <span className={cd.overviewDetailValue}>
                          {child.birth_weight ? `${child.birth_weight} lbs` : ''}
                          {child.birth_weight && child.birth_weight_ounces ? ' ' : ''}
                          {child.birth_weight_ounces ? `${child.birth_weight_ounces} oz` : ''}
                        </span>
                      </div>
                    )}
                    {child.birth_height && (
                      <div className={cd.overviewDetailItem}>
                        <span className={cd.overviewDetailLabel}>Birth Height:</span>
                        <span className={cd.overviewDetailValue}>{child.birth_height}"</span>
                      </div>
                    )}
                    {child.notes && (
                      <div className={cd.overviewDetailItem}>
                        <span className={cd.overviewDetailLabel}>Notes:</span>
                        <span className={cd.overviewDetailValue}>{child.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Last & Next: only show section when at least one type has a last or next visit; use "Last:" / "Next:" when both exist */}
            {overviewVisitCards.length > 0 && (
              <div className={cd.overviewVisitsStrip}>
                {overviewVisitCards.map((card) => {
                  const typeLabel = card.visitType === 'illness' ? 'Illness' : card.visitType === 'wellness' ? 'Wellness' : card.visitType === 'sick' ? 'Sick' : card.visitType === 'injury' ? 'Injury' : card.visitType === 'vision' ? 'Vision' : card.visitType === 'dental' ? 'Dental' : 'Visit';
                  const iconTypeClass = card.visitType === 'wellness' ? vi.iconWellness : card.visitType === 'sick' ? vi.iconSick : card.visitType === 'injury' ? vi.iconInjury : card.visitType === 'vision' ? vi.iconVision : card.visitType === 'dental' ? vi.iconDental : card.visitType === 'illness' ? vi.iconIllness : vi.iconWellness;
                  return (
                    <div key={card.key} className={cd.overviewLastVisit}>
                      <div className={`${vi.iconOutline} ${iconTypeClass}`} aria-hidden>
                        {card.visitType === 'wellness' && <LuHeart className={vi.typeSvg} />}
                        {card.visitType === 'sick' && <LuPill className={vi.typeSvg} />}
                        {card.visitType === 'injury' && <MdOutlinePersonalInjury className={`${vi.typeSvg} ${vi.typeSvgFilled}`} />}
                        {card.visitType === 'vision' && <LuEye className={vi.typeSvg} />}
                        {card.visitType === 'dental' && <HugeiconsIcon icon={DentalToothIcon} className={vi.typeSvg} size={24} color="currentColor" />}
                        {card.visitType === 'illness' && <LuThermometer className={vi.typeSvg} />}
                      </div>
                      <div className={cd.overviewVisitInfo}>
                        {card.last && (
                          <Link
                            to={card.last.href}
                            className={card.next ? cd.overviewVisitRow : `${cd.overviewVisitRow} ${cd.overviewVisitRowStacked}`}
                          >
                            <span className={cd.overviewVisitLabel}>{card.next ? 'Last:' : card.visitType === 'illness' ? 'Last Illness:' : `Last ${typeLabel} Visit:`}</span>
                            <span className={cd.overviewVisitDate}>{formatDate(card.last.date)}</span>
                          </Link>
                        )}
                        {card.next && (
                          <Link
                            to={card.next.href}
                            className={card.last ? cd.overviewVisitRow : `${cd.overviewVisitRow} ${cd.overviewVisitRowStacked}`}
                          >
                            <span className={cd.overviewVisitLabel}>{card.last ? 'Next:' : `Next ${typeLabel} Visit:`}</span>
                            <span className={cd.overviewVisitDate}>{formatDate(card.next.date)}</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tabs Section */}
          <div className={cd.childDetailSection}>
            {(() => {
              const tabsArray: Array<{ id: string; label: string; content: React.ReactNode }> = [];

              tabsArray.push({
                id: 'visits',
                label: 'Visits',
                content: (
                  <VisitsTab
                    visits={visits}
                    visibleVisits={visibleVisitItems.map((item) => item.data)}
                    visitsWithAttachments={visitsWithAttachments}
                    visitTypeFilter={visitTypeFilter}
                    onChangeVisitTypeFilter={setVisitTypeFilter}
                    onAddVisitClick={() => setShowVisitTypeModal(true)}
                    currentPage={visitsCurrentPage}
                    itemsPerPage={visitsItemsPerPage}
                    totalItems={visitItems.length}
                    onPageChange={setVisitsCurrentPage}
                    onItemsPerPageChange={setVisitsItemsPerPage}
                  />
                ),
              });

              tabsArray.push({
                id: 'illnesses',
                label: 'Illness',
                content: (
                  <IllnessesTab
                    childId={child.id}
                    illnesses={illnesses}
                    visibleIllnesses={visibleIllnessItems.map((item) => item.data)}
                    filterIllnessStatus={filterIllnessStatus}
                    onChangeFilterIllnessStatus={setFilterIllnessStatus}
                    currentPage={illnessesCurrentPage}
                    itemsPerPage={illnessesItemsPerPage}
                    totalItems={illnessItems.length}
                    onPageChange={setIllnessesCurrentPage}
                    onItemsPerPageChange={setIllnessesItemsPerPage}
                  />
                ),
              });

              tabsArray.push({
                id: 'documents',
                label: 'Documents',
                content: (
                  <DocumentsTab
                    loading={loadingDocuments}
                    documents={documents}
                    visitDocsCount={visitDocsCount}
                    vaccineDocsCount={vaccineDocsCount}
                    documentTypeFilter={documentTypeFilter}
                    onChangeDocumentTypeFilter={setDocumentTypeFilter}
                    filteredDocuments={filteredDocuments}
                    onUpdate={loadDocuments}
                  />
                ),
              });

              // Only include the Vaccines tab when there are visits with vaccines
              if (visitsWithVaccines.length > 0) {
                tabsArray.push({
                  id: 'vaccines',
                  label: 'Vaccines',
                  content: (
                    <VaccinesTab
                      visitsWithVaccines={visitsWithVaccines}
                      childId={parseInt(id!)}
                      onUploadSuccess={loadDocuments}
                    />
                  ),
                });
              }

              // Always include the Metrics tab (even if no data yet)
              tabsArray.push({
                id: 'metrics',
                label: 'Trends',
                content: (
                  <TrendsTab
                    child={child}
                    metricsActiveTab={metricsActiveTab}
                    onChangeMetricsActiveTab={setMetricsActiveTab}
                    metricsYear={metricsYear}
                    onChangeMetricsYear={setMetricsYear}
                  />
                ),
              });

              const handleTabChange = (tabId: string) => {
                const typedTabId = tabId as 'visits' | 'illnesses' | 'metrics' | 'documents' | 'vaccines';
                if (onboarding?.isActive) {
                  if (onboarding.step === 'feature_visits' && typedTabId === 'illnesses') {
                    onboarding.advance();
                  } else if (onboarding.step === 'feature_illness' && typedTabId === 'metrics') {
                    onboarding.advance();
                  }
                }
                setActiveTab(typedTabId);
              };

              return (
                <Tabs
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  tabs={tabsArray}
                  getTabButtonProps={(tabId) => ({ 'data-onboarding-tab': tabId })}
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
        <div className={modalStyles.overlay} onClick={() => !uploadingAvatar && setShowAvatarEditor(false)}>
          <div className={`${modalStyles.content} ${modalStyles.contentLarge}`} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.header}>
              <h2>Edit Avatar</h2>
              <button
                type="button"
                onClick={() => setShowAvatarEditor(false)}
                className={modalStyles.close}
                disabled={uploadingAvatar}
              >
                ×
              </button>
            </div>
            <div className={modalStyles.body}>
              <ImageCropUpload
                ref={imageCropUploadRef}
                onImageCropped={handleImageCropped}
                currentImageUrl={child.avatar ? childrenApi.getAvatarUrl(child.avatar) : childrenApi.getDefaultAvatarUrl(child.gender)}
                disabled={uploadingAvatar}
                isInModal={true}
              />
              {avatarFile && (
                <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  ✓ New avatar ready to upload
                </div>
              )}
            </div>
            <div className={modalStyles.footer}>
              <Button
                variant="secondary"
                onClick={async () => {
                  // If cropper is showing, cancel it; otherwise close modal
                  imageCropUploadRef.current?.cancel();
                  if (!avatarFile) {
                    setShowAvatarEditor(false);
                  }
                }}
                disabled={uploadingAvatar}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  // If no file cropped yet, save the crop first
                  if (!avatarFile) {
                    await imageCropUploadRef.current?.saveCrop();
                  } else {
                    // Upload the already-cropped avatar
                    await handleAvatarSave();
                  }
                }}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? 'Uploading...' : avatarFile ? 'Save Avatar' : 'Crop & Continue'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChildDetailPage;

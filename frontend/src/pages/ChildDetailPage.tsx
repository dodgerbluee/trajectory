import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { HiPlus, HiChartBar, HiExclamationCircle } from 'react-icons/hi';
import { childrenApi, visitsApi, illnessesApi, ApiClientError } from '../lib/api-client';
import type { Child, Visit, VisitType, Illness, VisitAttachment, ChildAttachment } from '../types/api';
import { calculateAge, formatAge, formatDate } from '../lib/date-utils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import Button from '../components/Button';
import Notification from '../components/Notification';
import VisitTypeModal from '../components/VisitTypeModal';
import Select from '../components/Select';
import TimelineItem from '../components/TimelineItem';
import Tabs from '../components/Tabs';
import DocumentsList from '../components/DocumentsList';
import ImageCropUpload from '../components/ImageCropUpload';
import VaccineHistory from '../components/VaccineHistory';

function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [child, setChild] = useState<Child | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [illnesses, setIllnesses] = useState<Illness[]>([]);
  const [lastWellnessVisit, setLastWellnessVisit] = useState<Visit | null>(null);
  const [lastSickVisit, setLastSickVisit] = useState<Visit | null>(null);
  const [lastVisionVisit, setLastVisionVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVisitTypeModal, setShowVisitTypeModal] = useState(false);
  const [visitTypeFilter, setVisitTypeFilter] = useState<'all' | 'wellness' | 'sick' | 'injury' | 'vision'>('all');
  const [activeTab, setActiveTab] = useState<'visits' | 'illnesses' | 'documents' | 'vaccines'>('visits');
  const [documents, setDocuments] = useState<Array<(VisitAttachment & { visit: Visit; type: 'visit' }) | (ChildAttachment & { type: 'child' })>>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

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
      const [childResponse, allVisitsResponse, wellnessVisitsResponse, sickVisitsResponse, visionVisitsResponse, illnessesResponse] = await Promise.all([
        childrenApi.getById(childId),
        visitsApi.getAll({ child_id: childId }),
        visitsApi.getAll({ child_id: childId, visit_type: 'wellness' }),
        visitsApi.getAll({ child_id: childId, visit_type: 'sick' }),
        visitsApi.getAll({ child_id: childId, visit_type: 'vision' }),
        illnessesApi.getAll({ child_id: childId }),
      ]);
      
      setChild(childResponse.data);
      setVisits(allVisitsResponse.data);
      setIllnesses(illnessesResponse.data);
      
      // Get most recent wellness visit (visits are sorted by date DESC)
      if (wellnessVisitsResponse.data.length > 0) {
        setLastWellnessVisit(wellnessVisitsResponse.data[0]);
      }
      
      // Get most recent sick visit
      if (sickVisitsResponse.data.length > 0) {
        setLastSickVisit(sickVisitsResponse.data[0]);
      }
      
      // Get most recent vision visit
      if (visionVisitsResponse.data.length > 0) {
        setLastVisionVisit(visionVisitsResponse.data[0]);
      }
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

  // Track which visits have attachments
  const visitsWithAttachments = useMemo(() => {
    const visitIds = new Set<number>();
    documents.forEach(doc => {
      if (doc.type === 'visit') {
        visitIds.add(doc.visit.id);
      }
    });
    return visitIds;
  }, [documents]);

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

  // Filter illnesses - MUST be called before early returns (Rules of Hooks)
  const illnessItems = useMemo(() => {
    type IllnessItem = {
      id: string;
      date: string;
      data: Illness;
    };

    const items: IllnessItem[] = [];

    // Add all illnesses
    illnesses.forEach(illness => {
      items.push({
        id: `illness-${illness.id}`,
        date: illness.start_date,
        data: illness,
      });
    });

    // Sort by date (most recent first)
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return items;
  }, [illnesses]);

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

  // Safely calculate age with error handling
  let age;
  try {
    age = calculateAge(child.date_of_birth);
  } catch (err) {
    console.error('Error calculating age:', err);
    age = { years: 0, months: 0 };
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/" className="breadcrumb">← Back to Children</Link>
      </div>

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
          {/* Overview Section */}
          <div className="child-detail-section">
            <h3 className="child-detail-section-title">Overview</h3>
            <div className="overview-header">
              <div className="overview-main">
                <div className="overview-avatar">
                  <button
                    type="button"
                    onClick={() => setShowAvatarEditor(true)}
                    className="overview-avatar-button"
                    title="Click to edit avatar"
                  >
                    <img
                      src={child.avatar ? childrenApi.getAvatarUrl(child.avatar) : childrenApi.getDefaultAvatarUrl(child.gender)}
                      alt={`${child.name}'s avatar`}
                      className="overview-avatar-img"
                    />
                    <div className="overview-avatar-overlay">
                      <span className="overview-avatar-edit-icon">✏️</span>
                    </div>
                  </button>
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
              <div className="overview-actions">
                <Button onClick={() => setShowVisitTypeModal(true)} size="sm">
                  <HiPlus className="btn-icon" />
                  Add Visit
                </Button>
                <Link 
                  to={`/illnesses/new?child_id=${child.id}`}
                  state={{ fromChild: true, childId: child.id }}
                >
                  <Button variant="secondary" size="sm">
                    <HiExclamationCircle className="btn-icon" />
                    Add Illness
                  </Button>
                </Link>
                <Link to={`/children/${child.id}/growth`}>
                  <Button variant="secondary" size="sm">
                    <HiChartBar className="btn-icon" />
                    Growth Charts
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Last Visits in Overview */}
            <div className="overview-last-visits">
              {lastWellnessVisit && (
                <Link to={`/visits/${lastWellnessVisit.id}`} className="overview-last-visit-link">
                  <div className="overview-last-visit">
                    <span className="overview-visit-icon">✓</span>
                    <div className="overview-visit-info">
                      <span className="overview-visit-label">Last Wellness:</span>
                      <span className="overview-visit-date">{formatDate(lastWellnessVisit.visit_date)}</span>
                    </div>
                  </div>
                </Link>
              )}
              {lastSickVisit && (
                <Link to={`/visits/${lastSickVisit.id}`} className="overview-last-visit-link">
                  <div className="overview-last-visit">
                    <span className="overview-visit-icon">🤒</span>
                    <div className="overview-visit-info">
                      <span className="overview-visit-label">Last Sick:</span>
                      <span className="overview-visit-date">{formatDate(lastSickVisit.visit_date)}</span>
                    </div>
                  </div>
                </Link>
              )}
              {lastVisionVisit && (
                <Link to={`/visits/${lastVisionVisit.id}`} className="overview-last-visit-link">
                  <div className="overview-last-visit">
                    <span className="overview-visit-icon">👁️</span>
                    <div className="overview-visit-info">
                      <span className="overview-visit-label">Last Vision:</span>
                      <span className="overview-visit-date">{formatDate(lastVisionVisit.visit_date)}</span>
                    </div>
                  </div>
                </Link>
              )}
              {!lastWellnessVisit && !lastSickVisit && !lastVisionVisit && (
                <div className="overview-no-visits">No visits recorded yet</div>
              )}
            </div>
          </div>

          {/* Tabs Section */}
          <div className="child-detail-section">
            <Tabs
              activeTab={activeTab}
              onTabChange={(tabId) => setActiveTab(tabId as 'visits' | 'illnesses' | 'documents' | 'vaccines')}
              tabs={[
                {
                  id: 'visits',
                  label: 'Visits',
                  content: (
                    <div>
                      <div className="timeline-filters">
                        <div className="filter-group">
                          <label htmlFor="visit-type-filter">Visit Type:</label>
                          <Select
                            id="visit-type-filter"
                            value={visitTypeFilter}
                            onChange={(value) => setVisitTypeFilter(value as 'all' | 'wellness' | 'sick' | 'injury' | 'vision')}
                            options={[
                              { value: 'all', label: 'All Visits' },
                              { value: 'wellness', label: 'Wellness' },
                              { value: 'sick', label: 'Sick' },
                              { value: 'injury', label: 'Injury' },
                              { value: 'vision', label: 'Vision' },
                            ]}
                          />
                        </div>
                      </div>

                      {visitItems.length === 0 ? (
                        <div className="empty-state">
                          <p>No visits recorded yet. Click "Add Visit" to get started.</p>
                        </div>
                      ) : (
                        <div className="timeline-list-modern">
                          {visitItems.map((item) => (
                            <TimelineItem
                              key={item.id}
                              type="visit"
                              data={item.data}
                              hasAttachments={visitsWithAttachments.has(item.data.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'illnesses',
                  label: 'Illnesses',
                  content: (
                    <div>
                      {illnessItems.length === 0 ? (
                        <div className="empty-state">
                          <p>No illnesses recorded yet. Click "Add Illness" to get started.</p>
                        </div>
                      ) : (
                        <div className="timeline-list-modern">
                          {illnessItems.map((item) => (
                            <TimelineItem
                              key={item.id}
                              type="illness"
                              data={item.data}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'documents',
                  label: 'Documents',
                  content: loadingDocuments ? (
                    <LoadingSpinner message="Loading documents..." />
                  ) : (
                    <DocumentsList documents={documents} onUpdate={loadDocuments} showHeader={true} />
                  ),
                },
                {
                  id: 'vaccines',
                  label: 'Vaccine History',
                  content: <VaccineHistory visits={visitsWithVaccines} childId={parseInt(id!)} onUploadSuccess={loadDocuments} />,
                },
              ]}
            />
          </div>
        </div>
      </Card>

      <VisitTypeModal
        isOpen={showVisitTypeModal}
        onSelect={(visitType: VisitType) => {
          setShowVisitTypeModal(false);
          navigate(`/children/${child.id}/visits/new?type=${visitType}`, {
            state: { fromChild: true, childId: child.id }
          });
        }}
        onClose={() => setShowVisitTypeModal(false)}
      />

      {/* Avatar Editor Modal */}
      {showAvatarEditor && (
        <div className="modal-overlay" onClick={() => !uploadingAvatar && setShowAvatarEditor(false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <Card>
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
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChildDetailPage;

/**
 * Modern Timeline Item Component
 * Compact, uniform design for visits and illnesses
 */

import { Link } from 'react-router-dom';
import type { Visit, Illness } from '../types/api';
import { formatDate } from '../lib/date-utils';

interface TimelineItemProps {
  type: 'visit' | 'illness';
  data: Visit | Illness;
  childName?: string;
  childId?: number;
  hasAttachments?: boolean;
}

function TimelineItem({ type, data, childName, childId, hasAttachments }: TimelineItemProps) {
  const isVisit = type === 'visit';
  const visit = isVisit ? (data as Visit) : null;
  const illness = !isVisit ? (data as Illness) : null;

  // Get icon and label based on type
  const getIcon = () => {
    if (isVisit && visit) {
      if (visit.visit_type === 'wellness') return '📋';
      if (visit.visit_type === 'sick') return '🤒';
      if (visit.visit_type === 'injury') return '🩹';
      if (visit.visit_type === 'vision') return '👁️';
    }
    return '🤒';
  };

  const getLabel = () => {
    if (isVisit) {
      if (visit?.visit_type === 'wellness') return 'Wellness Visit';
      if (visit?.visit_type === 'sick') return 'Sick Visit';
      if (visit?.visit_type === 'injury') return 'Injury Visit';
      if (visit?.visit_type === 'vision') return 'Vision Visit';
    }
    return 'Illness';
  };

  const getDate = () => {
    if (isVisit && visit) return visit.visit_date;
    if (illness) return illness.start_date;
    return '';
  };

  // Get primary info (most important detail)
  const getPrimaryInfo = () => {
    if (isVisit && visit) {
      if (visit.illness_type) return visit.illness_type.replace('_', ' ');
      if (visit.injury_type) return visit.injury_type;
      if (visit.vision_prescription) return visit.vision_prescription;
      // For wellness visits, skip location (it's shown in badges with pin icon)
      // Only show location as primary if it's not a wellness visit
      if (visit.location && visit.visit_type !== 'wellness') return visit.location;
      if (visit.doctor_name) return visit.doctor_name;
    }
    // For illnesses, don't show illness_type as primary (it's shown in badges)
    return null;
  };

  // Get secondary info (compact badges/chips)
  const getSecondaryInfo = () => {
    const items: Array<{ text: string; isOngoing?: boolean }> = [];
    
    if (isVisit && visit) {
      if (visit.location && !visit.illness_type && !visit.injury_type) {
        items.push({ text: `📍 ${visit.location}` });
      }
      if (visit.doctor_name && !visit.illness_type && !visit.injury_type) {
        items.push({ text: `👨‍⚕️ ${visit.doctor_name}` });
      }
      if (visit.weight_value) items.push({ text: `⚖️ ${visit.weight_value} lbs` });
      if (visit.height_value) items.push({ text: `📏 ${visit.height_value}"` });
      if (visit.vaccines_administered?.length) {
        items.push({ text: `💉 ${visit.vaccines_administered.length}` });
      }
      if (visit.prescriptions?.length) {
        items.push({ text: `💊 ${visit.prescriptions.length}` });
      }
      if (visit.needs_glasses === true) {
        items.push({ text: '👓 Needs Glasses' });
      }
    }
    
    if (illness) {
      // Illness type is now shown in the header badge, not here
      if (illness.end_date) {
        items.push({ text: `Ended: ${formatDate(illness.end_date)}` });
      }
      if (illness.temperature) items.push({ text: '🌡️ Fever' });
      if (illness.severity) items.push({ text: `Severity: ${illness.severity}/10` });
    }
    
    return items;
  };

  const primaryInfo = getPrimaryInfo();
  const secondaryInfo = getSecondaryInfo();
  const url = isVisit && visit ? `/visits/${visit.id}` : `/illnesses/${illness?.id}/edit`;
  
  // Pass child_id in state so we know where to navigate back to
  const linkState = isVisit && visit 
    ? { childId: visit.child_id, fromChild: true }
    : illness 
    ? { childId: illness.child_id, fromChild: true }
    : undefined;

  return (
    <Link to={url} state={linkState} className="timeline-item-link">
      <div className="timeline-item-modern">
        <div className="timeline-item-icon">{getIcon()}</div>
        <div className="timeline-item-content">
          <div className="timeline-item-header-compact">
            <div className="timeline-item-main">
              {isVisit && visit?.visit_type === 'wellness' ? (
                // Wellness visits: everything on one line
                <div className="timeline-item-label-row timeline-item-wellness-single-line">
                  <span className="timeline-item-label-compact">{getLabel()}</span>
                  <div className="wellness-badges-group">
                    {visit.tags && visit.tags.length > 0 && (
                      <>
                        {visit.tags.map((tag, idx) => (
                          <span key={idx} className="timeline-badge">{tag}</span>
                        ))}
                      </>
                    )}
                    {visit.title && (
                      <span className="timeline-badge">{visit.title}</span>
                    )}
                    {visit.location && (
                      <span className="timeline-badge">📍 {visit.location}</span>
                    )}
                    {visit.doctor_name && (
                      <span className="timeline-badge">👨‍⚕️ {visit.doctor_name}</span>
                    )}
                    {visit.weight_value && (
                      <span className="timeline-badge">⚖️ {visit.weight_value} lbs</span>
                    )}
                    {visit.height_value && (
                      <span className="timeline-badge">📏 {visit.height_value}"</span>
                    )}
                    {visit.vaccines_administered && visit.vaccines_administered.length > 0 && (
                      <span className="timeline-badge">💉 {visit.vaccines_administered.length}</span>
                    )}
                    {visit.prescriptions && visit.prescriptions.length > 0 && (
                      <span className="timeline-badge">💊 {visit.prescriptions.length}</span>
                    )}
                  </div>
                  <span className="timeline-item-date-compact wellness-date-spaced">{formatDate(getDate())}</span>
                  {hasAttachments && (
                    <span className="attachment-indicator" title="Has attachments">📎</span>
                  )}
                </div>
              ) : (
                // Other visits and illnesses: two-line layout
                <>
                  <div className="timeline-item-label-row">
                    <span className="timeline-item-label-compact">{getLabel()}</span>
                    {childName && (
                      <Link 
                        to={childId ? `/children/${childId}` : '#'} 
                        className="child-name-badge"
                        onClick={(e) => {
                          if (childId) {
                            e.stopPropagation();
                          } else {
                            e.preventDefault();
                          }
                        }}
                      >
                        {childName}
                      </Link>
                    )}
                    {isVisit && hasAttachments && (
                      <span className="attachment-indicator" title="Has attachments">📎</span>
                    )}
                  </div>
                  <div className="timeline-item-date-row">
                    {!isVisit && illness && illness.illness_type && (
                      <span className="illness-type-badge">🌡️ {illness.illness_type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>
                    )}
                    <span className="timeline-item-date-compact">{formatDate(getDate())}</span>
                    {!isVisit && illness && !illness.end_date && (
                      <span className="timeline-badge timeline-badge-ongoing timeline-badge-ongoing-standalone">Ongoing</span>
                    )}
                  </div>
                </>
              )}
            </div>
            <span className="timeline-item-arrow-compact">→</span>
          </div>
          {primaryInfo && !(isVisit && visit?.visit_type === 'wellness') && (
            <div className="timeline-item-primary">{primaryInfo}</div>
          )}
          {secondaryInfo.length > 0 && !(isVisit && visit?.visit_type === 'wellness') && (
            <div className="timeline-item-badges">
              {secondaryInfo.map((item, idx) => (
                <span key={idx} className={`timeline-badge ${item.isOngoing ? 'timeline-badge-ongoing' : ''}`}>
                  {item.text}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default TimelineItem;

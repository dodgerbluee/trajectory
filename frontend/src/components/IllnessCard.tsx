import { Link } from 'react-router-dom';
import { LuPaperclip, LuThermometer } from 'react-icons/lu';
import type { Illness } from '../types/api';
import { formatDate } from '../lib/date-utils';

interface IllnessCardProps {
  illness: Illness;
  childName?: string;
  childId?: number;
  hasAttachments?: boolean;
}

function IllnessCard({ illness, childName, childId, hasAttachments }: IllnessCardProps) {
  const url = `/illnesses/${illness.id}`;
  const linkState = { childId: illness.child_id, fromChild: true } as const;

  const label = 'Illness';

  const headerBadges = [] as string[];
  // Show a single comma-separated illness label. Prefer `illnesses` array if present,
  // otherwise fall back to legacy `illness_type`.
  const illnessesArr = (illness as any).illnesses;
  const illnessLabel = Array.isArray(illnessesArr) && illnessesArr.length > 0
    ? illnessesArr.map((i: string) => i.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')
    : (illness.illness_type ? illness.illness_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null);
  if (illnessLabel) headerBadges.push(`🤒 ${illnessLabel}`);
  if (illness.severity) headerBadges.push(`⚠️ ${illness.severity}/10`);
  if (illness.temperature) headerBadges.push('🌡️ Fever');
  if (illness.start_date) headerBadges.push(`📅 Start: ${formatDate(illness.start_date)}`);
  if (illness.end_date) {
    headerBadges.push(`🏁 End: ${formatDate(illness.end_date)}`);
  } else {
    headerBadges.push('⏳ Ongoing');
  }

  return (
    <Link to={url} state={linkState} className="timeline-item-link">
      <div className="timeline-item-modern">
        <div className="timeline-item-icon">
            <div className="visit-icon-outline visit-icon--illness" aria-hidden="true">
            <LuThermometer className="visit-type-svg" />
          </div>
        </div>
        <div className="timeline-item-content">
          <div className="timeline-item-header-compact">
            <div className="timeline-item-main">
              <div className="timeline-item-label-row timeline-item-wellness-single-line">
                <span className="timeline-item-label-compact">{label}</span>
                <div className="wellness-badges-group">
                  {childName && (
                    <Link to={childId ? `/children/${childId}` : '#'} className="child-name-badge" onClick={(e) => { if (!childId) e.preventDefault(); else e.stopPropagation(); }}>
                      {childName}
                    </Link>
                  )}
                  {headerBadges.map((b, i) => <span key={i} className="timeline-badge">{b}</span>)}
                </div>
                {hasAttachments && (
                  <span className="attachment-indicator" title="Has attachments">
                    <LuPaperclip className="attachment-icon" aria-hidden="true" />
                  </span>
                )}
              </div>
            </div>
            <span className="timeline-item-arrow-compact">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default IllnessCard;

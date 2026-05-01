import { Link } from 'react-router-dom';
import { LuPaperclip, LuThermometer } from 'react-icons/lu';
import type { Illness } from '@shared/types/api';
import { formatDate } from '@lib/date-utils';
import t from '@shared/components/TimelineItem.module.css';
import vi from '@shared/styles/VisitIcons.module.css';

interface IllnessCardProps {
  illness: Illness;
  personName?: string;
  personId?: number;
  hasAttachments?: boolean;
}

function IllnessCard({ illness, personName, personId, hasAttachments }: IllnessCardProps) {
  const url = `/illnesses/${illness.id}`;
  const linkState = { personId: illness.person_id, fromPerson: true } as const;

  const label = 'Illness';

  const headerBadges = [] as string[];
  const illnessLabel = illness.illness_types?.length
    ? illness.illness_types.map((i) => i.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())).join(', ')
    : null;
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
    <Link to={url} state={linkState} className={t.link}>
      <div className={t.item}>
        <div className={t.icon}>
            <div className={`${vi.iconOutline} ${vi.iconIllness}`} aria-hidden="true">
            <LuThermometer className={vi.typeSvg} />
          </div>
        </div>
        <div className={t.content}>
          <div className={t.headerCompact}>
            <div className={t.main}>
              <div className={`${t.labelRow} ${t.wellnessSingleLine}`}>
                <span className={t.labelCompact}>{label}</span>
                <div className={t.badgesGroup}>
                  {personName && (
                    <Link to={personId ? `/people/${personId}` : '#'} className={t.personNameBadge} onClick={(e) => { if (!personId) e.preventDefault(); else e.stopPropagation(); }}>
                      {personName}
                    </Link>
                  )}
                  {headerBadges.map((b, i) => <span key={i} className={t.badge}>{b}</span>)}
                </div>
                {hasAttachments && (
                  <span className={t.attachmentIndicator} title="Has attachments">
                    <LuPaperclip className={t.attachmentIcon} aria-hidden="true" />
                  </span>
                )}
              </div>
              {illness.start_date && (
                <div className={t.mobileMeta} aria-hidden="true">
                  {formatDate(illness.start_date)}
                  {illness.end_date ? ` – ${formatDate(illness.end_date)}` : ' · Ongoing'}
                </div>
              )}
            </div>
            <span className={t.arrowCompact} aria-hidden>→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default IllnessCard;

import { Link } from 'react-router-dom';
import { memo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import { LuPaperclip, LuActivity, LuHeart, LuPill, LuEye } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import type { Visit } from '@shared/types/api';
import { formatDate } from '@lib/date-utils';
import t from '@shared/components/TimelineItem.module.css';
import vi from '@shared/styles/VisitIcons.module.css';

interface VisitCardProps {
    visit: Visit;
    childName?: string;
    childId?: number;
    hasAttachments?: boolean;
}

function VisitCard({ visit, childName, childId, hasAttachments }: VisitCardProps) {
    const url = `/visits/${visit.id}`;
    const linkState = { childId: visit.child_id, fromChild: true } as const;

    const label = (() => {
        switch (visit.visit_type) {
            case 'wellness': return 'Wellness Visit';
            case 'sick': return 'Sick Visit';
            case 'injury': return 'Injury Visit';
            case 'vision': return 'Vision Visit';
            case 'dental': return 'Dental Visit';
            default: return 'Visit';
        }
    })();

    const iconTypeClass = visit.visit_type === 'wellness' ? vi.iconWellness : visit.visit_type === 'sick' ? vi.iconSick : visit.visit_type === 'injury' ? vi.iconInjury : visit.visit_type === 'vision' ? vi.iconVision : visit.visit_type === 'dental' ? vi.iconDental : vi.iconWellness;
    const Icon = () => {
        if (visit.visit_type === 'wellness') return <LuHeart className={vi.typeSvg} />;
        if (visit.visit_type === 'sick') return <LuPill className={vi.typeSvg} />;
        if (visit.visit_type === 'injury') return <MdOutlinePersonalInjury className={`${vi.typeSvg} ${vi.typeSvgFilled}`} />;
        if (visit.visit_type === 'vision') return <LuEye className={vi.typeSvg} />;
        if (visit.visit_type === 'dental') return <HugeiconsIcon icon={DentalToothIcon} className={vi.typeSvg} size={24} color="currentColor" />;
        return <LuActivity className={vi.typeSvg} />;
    };

    const badges: Array<{ key: string; label: string }> = [];
    if (visit.tags?.length) visit.tags.forEach((t, i) => badges.push({ key: `tag-${i}`, label: t }));
    if (visit.title) badges.push({ key: 'title', label: visit.title });
    if (visit.injury_type) badges.push({ key: 'injury', label: `🤕 ${visit.injury_type}` });
    // Render a single comma-separated illness label. Prefer `visit.illnesses` array,
    // otherwise fall back to legacy `visit.illness_type` if present.
    const illnessesArr = (visit as any).illnesses;
    const illnessLabel = Array.isArray(illnessesArr) && illnessesArr.length > 0
        ? illnessesArr.map(i => i.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())).join(', ')
        : (visit as any).illness_type ? (visit as any).illness_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : null;
    if (illnessLabel) badges.push({ key: 'illness', label: `🤒 ${illnessLabel}` });
    if (visit.visit_date) badges.push({ key: 'visit-date', label: `📅 ${formatDate(visit.visit_date)}` });
    // Dental appointment type (between visit date and cavities found)
    if (visit.visit_type === 'dental' && (visit as any).dental_procedure_type) {
      const dt = (visit as any).dental_procedure_type;
      const procedureLabel = typeof dt === 'string' ? dt.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : String(dt);
      badges.push({ key: 'dental-type', label: `😁 ${procedureLabel}` });
    }
    if (visit.location) badges.push({ key: 'location', label: `📍 ${visit.location}` });
    if (visit.doctor_name) badges.push({ key: 'doctor', label: `👨‍⚕️ ${visit.doctor_name}` });
    if (visit.temperature) badges.push({ key: 'temperature', label: `🌡️ ${visit.temperature}°F` });
    if (visit.weight_value) badges.push({ key: 'weight', label: `⚖️ ${visit.weight_value} lbs` });
    if (visit.height_value) badges.push({ key: 'height', label: `📏 ${visit.height_value}"` });
    if (visit.vaccines_administered?.length) badges.push({ key: 'vax', label: `💉 ${visit.vaccines_administered.length}` });
    if (visit.prescriptions?.length) badges.push({ key: 'rx', label: `💊 ${visit.prescriptions.length}` });
        // Compact vision prescription preview (simple: OD <sphere>, OS <sphere>)
    const vr: any = (visit as any).vision_refraction;
    const fmt = (n: number | null) => (n === null || n === undefined ? '--' : Number(n).toFixed(2));
    if (visit.visit_type === 'vision') {
        if (vr && (vr.od || vr.os)) {
            const od = vr.od || {};
            const os = vr.os || {};
            const presLabel = `OD ${fmt(od.sphere)}, OS ${fmt(os.sphere)}`;
            badges.push({ key: 'vision-presc', label: `👁️ ${presLabel}` });
        } else if (visit.vision_prescription) {
            // Fallback to legacy freeform prescription string (trimmed)
            const short = visit.vision_prescription.length > 40 ? visit.vision_prescription.slice(0, 37) + '…' : visit.vision_prescription;
            badges.push({ key: 'vision-presc', label: `👁️ ${short}` });
        }
    }
    if ((visit as any).ordered_glasses) badges.push({ key: 'ordered-glasses', label: '👓' });
    if ((visit as any).ordered_contacts) badges.push({ key: 'ordered-contacts', label: '🫧' });

    // Dental visit badges
    if (visit.visit_type === 'dental') {
      const v = visit as any;
      if (v.cavities_found != null) badges.push({ key: 'cavities-found', label: `🦷 ${v.cavities_found} found` });
      if (v.cavities_filled != null) badges.push({ key: 'cavities-filled', label: `🦷 ${v.cavities_filled} filled` });
      if (v.xrays_taken === true) badges.push({ key: 'xrays', label: '🩻' });
      if (v.fluoride_treatment === true) badges.push({ key: 'fluoride', label: '💧' });
      if (v.sealants_applied === true) badges.push({ key: 'sealants', label: '🛡️' });
    }

    return (
        <Link to={url} state={linkState} className={t.link}>
            <div className={t.item}>
                <div className={t.icon}>
                    <div className={`${vi.iconOutline} ${iconTypeClass}`} aria-hidden="true">
                        <Icon />
                    </div>
                </div>

                <div className={t.content}>
                    <div className={t.headerCompact}>
                        <div className={t.main}>
                            <div className={t.labelRow}>
                                <span className={t.labelCompact}>{label}</span>
                                <div className={t.badgesGroup}>
                                    {childName && (
                                        <Link to={childId ? `/children/${childId}` : '#'} className={t.childNameBadge} onClick={(e) => { if (!childId) e.preventDefault(); else e.stopPropagation(); }}>
                                            {childName}
                                        </Link>
                                    )}
                                    {badges.map(b => (
                                        <span key={b.key} className={t.badge}>{b.label}</span>
                                    ))}
                                    {hasAttachments && (
                                    <span className={t.attachmentIndicator} title="Has attachments">
                                        <LuPaperclip className={t.attachmentIcon} aria-hidden="true" />
                                    </span>
                                )}
                                </div>
                            </div>
                        </div>
                        <span className={t.arrowCompact} aria-hidden>→</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default memo(VisitCard);

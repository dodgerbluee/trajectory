import { Link } from 'react-router-dom';
import { LuPaperclip, LuActivity, LuHeart, LuPill, LuEye, LuSmile } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import type { Visit } from '../types/api';
import { formatDate } from '../lib/date-utils';

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

    const Icon = () => {
        if (visit.visit_type === 'wellness') return <LuHeart className="visit-type-svg" />;
        if (visit.visit_type === 'sick') return <LuPill className="visit-type-svg" />;
        if (visit.visit_type === 'injury') return <MdOutlinePersonalInjury className="visit-type-svg visit-type-svg--filled" />;
        if (visit.visit_type === 'vision') return <LuEye className="visit-type-svg" />;
        if (visit.visit_type === 'dental') return <LuSmile className="visit-type-svg" />;
        return <LuActivity className="visit-type-svg" />;
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

    return (
        <Link to={url} state={linkState} className="timeline-item-link">
            <div className="timeline-item-modern">
                <div className="timeline-item-icon">
                    <div className={`visit-icon-outline visit-icon--${visit.visit_type}`} aria-hidden="true">
                        <Icon />
                    </div>
                </div>

                <div className="timeline-item-content">
                    <div className="timeline-item-header-compact">
                        <div className="timeline-item-main">
                            <div className="timeline-item-label-row">
                                <span className="timeline-item-label-compact">{label}</span>
                                <div className="wellness-badges-group">
                                    {childName && (
                                        <Link to={childId ? `/children/${childId}` : '#'} className="child-name-badge" onClick={(e) => { if (!childId) e.preventDefault(); else e.stopPropagation(); }}>
                                            {childName}
                                        </Link>
                                    )}
                                    {badges.map(b => (
                                        <span key={b.key} className="timeline-badge">{b.label}</span>
                                    ))}
                                    {hasAttachments && (
                                    <span className="attachment-indicator" title="Has attachments">
                                        <LuPaperclip className="attachment-icon" aria-hidden="true" />
                                    </span>
                                )}
                                </div>
                            </div>
                        </div>
                        <span className="timeline-item-arrow-compact">→</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default VisitCard;

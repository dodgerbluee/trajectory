import type { Child, Visit } from '@shared/types/api';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';
import VisitsTimeline from './VisitsTimeline';

interface VisitsTimelineViewProps {
  visits: Visit[];
  children: Child[];
  visitsWithAttachments: Set<number>;
  showChildName?: boolean;
}

export default function VisitsTimelineView({
  visits,
  children,
  visitsWithAttachments,
  showChildName = true,
}: VisitsTimelineViewProps) {
  return (
    <main className={visitsLayout.main}>
      <VisitsTimeline
        visits={visits}
        children={children}
        visitsWithAttachments={visitsWithAttachments}
        showChildName={showChildName}
      />
    </main>
  );
}

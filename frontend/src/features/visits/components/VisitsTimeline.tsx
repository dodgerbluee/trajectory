import { useMemo } from 'react';
import type { Visit, Child } from '../../../types/api';
import TimelineItem from '../../../shared/components/TimelineItem';
import Card from '../../../shared/components/Card';
import tl from '../../../shared/components/TimelineList.module.css';

interface VisitsTimelineProps {
  visits: Visit[];
  children?: Child[];
  visitsWithAttachments?: Set<number>;
  showChildName?: boolean;
  emptyMessage?: string;
}

/**
 * Reusable component for rendering a timeline of visits.
 * Used by AllVisitsView and ChildDetailPage.
 */
export default function VisitsTimeline({
  visits,
  children = [],
  visitsWithAttachments = new Set(),
  showChildName = true,
  emptyMessage = 'No visits recorded yet. Click "Add Visit" to get started.',
}: VisitsTimelineProps) {
  const childMap = useMemo(() => {
    const map = new Map<number, Child>();
    children.forEach(child => map.set(child.id, child));
    return map;
  }, [children]);

  const sortedVisits = useMemo(() => {
    return [...visits].sort((a, b) => {
      const dateA = new Date(a.visit_date).getTime();
      const dateB = new Date(b.visit_date).getTime();
      return dateB - dateA;
    });
  }, [visits]);

  if (sortedVisits.length === 0) {
    return (
      <Card>
        <p className={tl.empty}>{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className={tl.list}>
        {sortedVisits.map((visit) => {
          const child = childMap.get(visit.child_id);
          return (
            <TimelineItem
              key={visit.id}
              type="visit"
              data={visit}
              childName={showChildName ? (child?.name || `Child #${visit.child_id}`) : undefined}
              childId={showChildName ? visit.child_id : undefined}
              hasAttachments={visitsWithAttachments.has(visit.id)}
            />
          );
        })}
      </div>
    </Card>
  );
}

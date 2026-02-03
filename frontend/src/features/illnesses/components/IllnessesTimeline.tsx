import { useMemo } from 'react';
import type { Illness, Child } from '../../../types/api';
import TimelineItem from '../../../shared/components/TimelineItem';
import Card from '../../../shared/components/Card';
import tl from '../../../shared/components/TimelineList.module.css';

interface IllnessesTimelineProps {
  illnesses: Illness[];
  children?: Child[];
  showChildName?: boolean;
  emptyMessage?: string;
}

/**
 * Reusable component for rendering a timeline of illnesses.
 * Used by AllIllnessesView and ChildDetailPage.
 */
export default function IllnessesTimeline({
  illnesses,
  children = [],
  showChildName = true,
  emptyMessage = 'No illnesses recorded yet. Click "Add Illness" to get started.',
}: IllnessesTimelineProps) {
  const childMap = useMemo(() => {
    const map = new Map<number, Child>();
    children.forEach(child => map.set(child.id, child));
    return map;
  }, [children]);

  const sortedIllnesses = useMemo(() => {
    return [...illnesses].sort((a, b) => {
      const dateA = new Date(a.start_date).getTime();
      const dateB = new Date(b.start_date).getTime();
      return dateB - dateA;
    });
  }, [illnesses]);

  if (sortedIllnesses.length === 0) {
    return (
      <Card>
        <p className={tl.empty}>{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className={tl.list}>
        {sortedIllnesses.map((illness) => {
          const child = childMap.get(illness.child_id);
          return (
            <TimelineItem
              key={illness.id}
              type="illness"
              data={illness}
              childName={showChildName ? (child?.name || `Child #${illness.child_id}`) : undefined}
              childId={showChildName ? illness.child_id : undefined}
            />
          );
        })}
      </div>
    </Card>
  );
}

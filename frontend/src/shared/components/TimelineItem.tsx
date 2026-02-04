import type { Visit, Illness } from '@shared/types/api';
import { VisitCard } from '@features/visits';
import { IllnessCard } from '@features/illnesses';

interface TimelineItemProps {
  type: 'visit' | 'illness';
  data: Visit | Illness;
  childName?: string;
  childId?: number;
  hasAttachments?: boolean;
}

function TimelineItem({ type, data, childName, childId, hasAttachments }: TimelineItemProps) {
  if (type === 'visit') {
    return (
      <VisitCard
        visit={data as Visit}
        childName={childName}
        childId={childId}
        hasAttachments={hasAttachments}
      />
    );
  }

  return (
    <IllnessCard
      illness={data as Illness}
      childName={childName}
      childId={childId}
      hasAttachments={hasAttachments}
    />
  );
}

export default TimelineItem;

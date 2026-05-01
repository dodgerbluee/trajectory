import type { Visit, Illness } from '@shared/types/api';
import { VisitCard } from '@features/visits';
import { IllnessCard } from '@features/illnesses';

interface TimelineItemProps {
  type: 'visit' | 'illness';
  data: Visit | Illness;
  personName?: string;
  personId?: number;
  hasAttachments?: boolean;
}

function TimelineItem({ type, data, personName, personId, hasAttachments }: TimelineItemProps) {
  if (type === 'visit') {
    return (
      <VisitCard
        visit={data as Visit}
        personName={personName}
        personId={personId}
        hasAttachments={hasAttachments}
      />
    );
  }

  return (
    <IllnessCard
      illness={data as Illness}
      personName={personName}
      personId={personId}
      hasAttachments={hasAttachments}
    />
  );
}

export default TimelineItem;

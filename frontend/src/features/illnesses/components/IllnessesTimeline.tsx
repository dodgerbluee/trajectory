import { useMemo, type ReactNode } from 'react';
import type { Illness, Child } from '@shared/types/api';
import TimelineItem from '@shared/components/TimelineItem';
import Card from '@shared/components/Card';
import tl from '@shared/components/TimelineList.module.css';
import PaginationControls from '@shared/components/PaginationControls';

interface IllnessesTimelineProps {
  illnesses: Illness[];
  children?: Child[];
  showChildName?: boolean;
  emptyMessage?: string;
  currentPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (items: number) => void;
  /** When true, render the list without an outer Card wrapper. */
  flat?: boolean;
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
  currentPage = 0,
  itemsPerPage = 20,
  totalItems = 0,
  onPageChange,
  onItemsPerPageChange,
  flat = false,
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

  const Frame = flat
    ? ({ children: c }: { children: ReactNode }) => <>{c}</>
    : Card;

  if (sortedIllnesses.length === 0) {
    return (
      <Frame>
        <p className={tl.empty}>{emptyMessage}</p>
      </Frame>
    );
  }

  return (
    <>
      <Frame>
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
      </Frame>
      {totalItems > 0 && onPageChange && onItemsPerPageChange && (
        <PaginationControls
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      )}
    </>
  );
}

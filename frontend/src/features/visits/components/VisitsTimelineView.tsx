import { memo } from 'react';
import type { Child, Visit } from '@shared/types/api';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';
import VisitsTimeline from './VisitsTimeline';
import PaginationControls from '@shared/components/PaginationControls';

interface VisitsTimelineViewProps {
  visits: Visit[];
  children: Child[];
  visitsWithAttachments: Set<number>;
  showChildName?: boolean;
  currentPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
}

function VisitsTimelineView({
  visits,
  children,
  visitsWithAttachments,
  showChildName = true,
  currentPage = 0,
  itemsPerPage = 20,
  totalItems = 0,
  onPageChange,
  onItemsPerPageChange,
}: VisitsTimelineViewProps) {
  return (
    <main className={visitsLayout.main}>
      <div className={visitsLayout.mainContent}>
        <VisitsTimeline
          visits={visits}
          children={children}
          visitsWithAttachments={visitsWithAttachments}
          showChildName={showChildName}
        />
      </div>
      {totalItems > 0 && onPageChange && onItemsPerPageChange && (
        <PaginationControls
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      )}
    </main>
  );
}

export default memo(VisitsTimelineView);

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
  isLoading?: boolean;
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
  isLoading = false,
  currentPage = 0,
  itemsPerPage = 20,
  totalItems = 0,
  onPageChange,
  onItemsPerPageChange,
}: VisitsTimelineViewProps) {
  return (
    <main className={visitsLayout.main}>
      <VisitsTimeline
        visits={visits}
        children={children}
        visitsWithAttachments={visitsWithAttachments}
        showChildName={showChildName}
      />
      {totalItems > 0 && onPageChange && onItemsPerPageChange && (
        <PaginationControls
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      )}
      {isLoading && (
        <div style={{ padding: '10px', textAlign: 'center', color: '#666', fontSize: '0.875rem' }}>
          Loading attachment info...
        </div>
      )}
    </main>
  );
}

export default memo(VisitsTimelineView);

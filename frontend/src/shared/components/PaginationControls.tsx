import { useMemo } from 'react';
import styles from './PaginationControls.module.css';

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

export interface PaginationActions {
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

interface PaginationControlsProps extends PaginationState, PaginationActions {
  itemsPerPageOptions?: number[];
}

export default function PaginationControls({
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [20, 40, 100],
}: PaginationControlsProps) {
  const totalPages = useMemo(() => Math.ceil(totalItems / itemsPerPage), [totalItems, itemsPerPage]);
  const startItem = currentPage * itemsPerPage + 1;
  const endItem = Math.min((currentPage + 1) * itemsPerPage, totalItems);

  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  const handlePrev = () => onPageChange(Math.max(0, currentPage - 1));
  const handleNext = () => onPageChange(Math.min(totalPages - 1, currentPage + 1));

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onItemsPerPageChange(parseInt(e.target.value, 10));
    onPageChange(0);
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Left: Items per page dropdown */}
        <div className={styles.itemsPerPage}>
          <label htmlFor="items-per-page">Show</label>
          <div className={styles.selectWrapper}>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className={styles.select}
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Item count and page info */}
        <div className={styles.info}>
          <span className={styles.itemCount}>
            Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{' '}
            <strong>{totalItems}</strong> results
          </span>
          <span className={styles.pageInfo}>
            Page <strong>{currentPage + 1}</strong> of <strong>{totalPages}</strong>
          </span>
        </div>

        {/* Right: Navigation buttons */}
        <div className={styles.controls}>
          <button
            className={styles.navButton}
            onClick={handlePrev}
            disabled={!canGoPrev}
            title="Previous page"
            aria-label="Go to previous page"
          >
            Previous
          </button>
          <button
            className={styles.navButton}
            onClick={handleNext}
            disabled={!canGoNext}
            title="Next page"
            aria-label="Go to next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

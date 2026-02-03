import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { illnessesApi, childrenApi, ApiClientError } from '../../lib/api-client';
import type { Illness, Child } from '../../types/api';
import { HiBell, HiX } from 'react-icons/hi';
import { formatDate } from '../../lib/date-utils';
import styles from './IllnessNotification.module.css';

function IllnessNotification() {
  const [illnesses, setIllnesses] = useState<Illness[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadOngoingIllnesses();
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadOngoingIllnesses = async () => {
    try {
      setLoading(true);
      const [illnessesResponse, childrenResponse] = await Promise.all([
        illnessesApi.getAll({ limit: 100 }),
        childrenApi.getAll(),
      ]);
      // Filter for illnesses without end_date
      const ongoing = illnessesResponse.data.filter(illness => !illness.end_date);
      setIllnesses(ongoing);
      setChildren(childrenResponse.data);
    } catch (error) {
      if (error instanceof ApiClientError) {
        console.error('Failed to load ongoing illnesses:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getChildName = (childId: number): string => {
    const child = children.find(c => c.id === childId);
    return child?.name || `Child #${childId}`;
  };

  if (loading) {
    return null;
  }

  if (illnesses.length === 0) {
    return null;
  }

  return (
    <div className={styles.root} ref={dropdownRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`${illnesses.length} ongoing illness${illnesses.length > 1 ? 'es' : ''}`}
      >
        <HiBell className={styles.triggerIcon} aria-hidden />
        {illnesses.length > 0 && (
          <span className={styles.badge}>{illnesses.length}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Ongoing Illness</h3>
            <button
              type="button"
              className={styles.close}
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              <HiX aria-hidden />
            </button>
          </div>
          <div className={styles.list}>
            {illnesses.map((illness) => (
              <Link
                key={illness.id}
                to={`/illnesses/${illness.id}`}
                className={styles.item}
                onClick={() => setIsOpen(false)}
              >
                <div className={styles.itemContent}>
                  <div className={styles.itemHeader}>
                    <strong>{getChildName(illness.child_id)}</strong>
                    <span className={styles.typeBadge}>{illness.illness_types?.join(', ') ?? ''}</span>
                  </div>
                  <div className={styles.itemDetails}>
                    <span>Started: {formatDate(illness.start_date)}</span>
                    {illness.symptoms && (
                      <span className={styles.symptoms}>{illness.symptoms}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default IllnessNotification;

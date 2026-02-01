import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { illnessesApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Illness, Child } from '../types/api';
import { HiBell, HiX } from 'react-icons/hi';
import { formatDate } from '../lib/date-utils';

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
    <div className="illness-notification" ref={dropdownRef}>
      <button
        className="illness-notification-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`${illnesses.length} ongoing illness${illnesses.length > 1 ? 'es' : ''}`}
      >
        <HiBell className="notification-icon" />
        {illnesses.length > 0 && (
          <span className="notification-badge">{illnesses.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="illness-notification-dropdown">
          <div className="notification-header">
            <h3>Ongoing Illnesses</h3>
            <button
              className="notification-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              <HiX />
            </button>
          </div>
          <div className="notification-list">
            {illnesses.map((illness) => (
              <Link
                key={illness.id}
                to={`/illnesses/${illness.id}`}
                className="notification-item"
                onClick={() => setIsOpen(false)}
              >
                <div className="notification-item-content">
                  <div className="notification-item-header">
                    <strong>{getChildName(illness.child_id)}</strong>
                    <span className="illness-type-badge">{illness.illness_types?.join(', ') ?? ''}</span>
                  </div>
                  <div className="notification-item-details">
                    <span>Started: {formatDate(illness.start_date)}</span>
                    {illness.symptoms && (
                      <span className="notification-symptoms">{illness.symptoms}</span>
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

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { childrenApi, ApiClientError } from '../lib/api-client';
import type { Child } from '../types/api';
import { useFamilyPermissions } from '../contexts/FamilyPermissionsContext';
import { calculateAge, formatAge, formatDate } from '../lib/date-utils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import ChildAvatar from '../components/ChildAvatar';
import Button from '../components/Button';

function ChildrenListPage() {
  const { canEdit } = useFamilyPermissions();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await childrenApi.getAll();
      // Sort by age (oldest to youngest) - oldest = earliest date_of_birth
      const sortedChildren = [...response.data].sort((a, b) => {
        const dateA = new Date(a.date_of_birth).getTime();
        const dateB = new Date(b.date_of_birth).getTime();
        return dateA - dateB; // Ascending = oldest first
      });
      setChildren(sortedChildren);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load children');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading children..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadChildren} />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Children</h1>
        <div className="page-header-actions">
          <Link to="/metrics">
            <Button variant="secondary">
              Metrics
            </Button>
          </Link>
        </div>
      </div>

      {children.length === 0 ? (
        <Card>
          <p className="empty-state">
            {canEdit
              ? 'No children added yet. Click "Add Child" to get started.'
              : 'No children added yet.'}
          </p>
        </Card>
      ) : (
        <div className="children-grid-cards">
          {children.map((child) => {
            const age = calculateAge(child.date_of_birth);
            const ageText = formatAge(age.years, age.months);
            const birthdateText = formatDate(child.date_of_birth);

            return (
              <Link key={child.id} to={`/children/${child.id}`} className="child-card-link">
                <Card className="child-card-compact">
                  <div className="child-card-avatar">
                    <ChildAvatar
                      avatar={child.avatar}
                      gender={child.gender}
                      alt={`${child.name}'s avatar`}
                      className="child-avatar-large"
                    />
                  </div>
                  <div className="child-card-content">
                    <div className="child-card-header">
                      <h2 className="child-name">{child.name}</h2>
                    </div>
                    <div className="child-card-details">
                      <div className="child-detail-item">
                        <span className="detail-icon">🎂</span>
                        <span className="detail-text">{ageText}</span>
                      </div>
                      <div className="child-detail-item">
                        <span className="detail-icon">📅</span>
                        <span className="detail-text">{birthdateText}</span>
                      </div>
                    </div>
                    <span className="child-card-arrow">→</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ChildrenListPage;

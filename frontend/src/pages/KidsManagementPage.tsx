import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { childrenApi, ApiClientError } from '../lib/api-client';
import type { Child } from '../types/api';
import { calculateAge, formatAge, formatDate } from '../lib/date-utils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import Button from '../components/Button';
import Notification from '../components/Notification';

function KidsManagementPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const loadChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await childrenApi.getAll();
      setChildren(response.data);
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

  const handleDelete = async (child: Child) => {
    if (!window.confirm(`Are you sure you want to delete ${child.name}? This will permanently delete all associated visits. This action cannot be undone.`)) {
      return;
    }

    setDeletingId(child.id);
    try {
      await childrenApi.delete(child.id);
      setNotification({
        message: `${child.name} has been deleted`,
        type: 'success',
      });
      loadChildren();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setNotification({
          message: err.message,
          type: 'error',
        });
      } else {
        setNotification({
          message: 'Failed to delete child',
          type: 'error',
        });
      }
    } finally {
      setDeletingId(null);
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
        <div>
          <Link to="/" className="breadcrumb">← Back to Children</Link>
          <h1>Children</h1>
        </div>
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="kids-management-list">
        {children.map((child) => {
          const avatarUrl = child.avatar
            ? childrenApi.getAvatarUrl(child.avatar)
            : childrenApi.getDefaultAvatarUrl(child.gender);
          
          const age = calculateAge(child.date_of_birth);
          const ageText = formatAge(age.years, age.months);

          return (
            <Card key={child.id} className="kid-management-card">
              <div className="kid-management-content">
                <div className="kid-management-avatar">
                  <img
                    src={avatarUrl}
                    alt={`${child.name}'s avatar`}
                    className="kid-management-avatar-img"
                  />
                </div>
                <div className="kid-management-info">
                  <h2 className="kid-management-name">{child.name}</h2>
                  <div className="kid-management-details">
                    <span>{ageText}</span>
                    <span>•</span>
                    <span>{formatDate(child.date_of_birth)}</span>
                  </div>
                </div>
                <div className="kid-management-actions">
                  <Link to={`/children/${child.id}/edit`}>
                    <Button variant="secondary" size="sm">Edit</Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(child)}
                    disabled={deletingId === child.id}
                  >
                    {deletingId === child.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        
        {/* Add Child Card */}
        <Link to="/children/new" className="kid-management-add-link">
          <Card className="kid-management-card kid-management-add-card">
            <div className="kid-management-content">
              <div className="kid-management-avatar">
                <div className="kid-management-add-avatar">+</div>
              </div>
              <div className="kid-management-info">
                <h2 className="kid-management-name">Add Child</h2>
                <div className="kid-management-details">
                  <span>Click to add a new child</span>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}

export default KidsManagementPage;

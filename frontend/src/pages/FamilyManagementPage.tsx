import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { childrenApi, ApiClientError } from '../lib/api-client';
import type { Child } from '../types/api';
import { calculateAge, formatAge, formatDate } from '../lib/date-utils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import ChildAvatar from '../components/ChildAvatar';
import Button from '../components/Button';
import Notification from '../components/Notification';
import Tabs from '../components/Tabs';
import GrowthChartTab from '../components/GrowthChartTab';
import { useFamilyPermissions } from '../contexts/FamilyPermissionsContext';

function FamilyManagementPage() {
  const { canEdit } = useFamilyPermissions();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'kids' | 'trends'>('kids');

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

  const sortedChildren = useMemo(() => {
    return [...children].sort((a, b) => {
      // older children first (earlier birthdate -> smaller timestamp)
      return new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime();
    });
  }, [children]);

  if (loading) {
    return <LoadingSpinner message="Loading children..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadChildren} />;
  }

  
  const trendsContent = (
    <div className="family-trends">
      <GrowthChartTab />
    </div>
  );

  const kidsContent = (
    <Card>
      <div className="page-body">
        <div className="body-header">
          <h1>Family</h1>
        </div>
        <div className="family-list">
          {sortedChildren.map((child: Child) => {
              const age = calculateAge(child.date_of_birth);
              const ageText = formatAge(age.years, age.months);

              return (
                <Card key={child.id} className="family-card">
                  <div className="family-content">
                    <div className="family-avatar">
                      <ChildAvatar
                        avatar={child.avatar}
                        gender={child.gender}
                        alt={`${child.name}'s avatar`}
                        className="family-avatar-img"
                      />
                    </div>
                    <div className="family-info">
                      <h2 className="family-name">{child.name}</h2>
                      <div className="family-details">
                        <span>{ageText}</span>
                        <span>•</span>
                        <span>{formatDate(child.date_of_birth)}</span>
                      </div>
                    </div>
                    {canEdit && (
                    <div className="family-actions">
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
                    )}
                  </div>
                </Card>
              );
            })}

          {/* Add Child Card */}
          {canEdit && (
          <Link to="/children/new" className="family-add-link">
            <Card className="family-card family-add-card">
              <div className="family-content">
                <div className="family-avatar">
                  <div className="family-add-avatar">+</div>
                </div>
                <div className="family-info">
                  <h2 className="family-name">Add Child</h2>
                  <div className="family-details">
                    <span>Click to add a new child</span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
          )}
        </div>
      </div>
    </Card>
  );

  

  return (
    <div className="page-container">
      <Tabs
        tabs={[
          { id: 'kids', label: 'Kids', content: kidsContent },
          { id: 'trends', label: 'Trends', content: trendsContent },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as 'kids' | 'trends')}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

export default FamilyManagementPage;

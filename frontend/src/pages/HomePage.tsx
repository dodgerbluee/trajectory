import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { childrenApi } from '../lib/api-client';
import type { Child } from '../types/api';
import { calculateAge, formatAge, formatDate } from '../lib/date-utils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import Button from '../components/Button';
import Tabs from '../components/Tabs';
import AllIllnessesView from '../components/AllIllnessesView';
import AllVisitsView from '../components/AllVisitsView';

function HomePage() {
  const [activeTab, setActiveTab] = useState<'family' | 'illnesses' | 'visits'>('family');
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
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
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load children');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'family' && children.length === 0) {
      loadChildren();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const familyContent = (
    <div className="home-tab-content">
      {loading && <LoadingSpinner message="Loading family..." />}
      {error && <ErrorMessage message={error} onRetry={loadChildren} />}
      {!loading && !error && (
        <>
          {children.length === 0 ? (
            <Card>
              <p className="empty-state">
                No children added yet. Click "Add Child" to get started.
              </p>
            </Card>
          ) : (
            <div className="children-grid-cards">
              {children.map((child) => {
                const avatarUrl = child.avatar
                  ? childrenApi.getAvatarUrl(child.avatar)
                  : childrenApi.getDefaultAvatarUrl(child.gender);
                
                const age = calculateAge(child.date_of_birth);
                const ageText = formatAge(age.years, age.months);
                const birthdateText = formatDate(child.date_of_birth);

                return (
                  <Link key={child.id} to={`/children/${child.id}`} className="child-card-link">
                    <Card className="child-card-compact">
                      <div className="child-card-avatar">
                        <img
                          src={avatarUrl}
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
        </>
      )}
    </div>
  );

  const tabs = [
    {
      id: 'family',
      label: 'Family',
      content: familyContent,
    },
    {
      id: 'illnesses',
      label: 'Illness',
      content: <AllIllnessesView />,
    },
    {
      id: 'visits',
      label: 'Visits',
      content: <AllVisitsView />,
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Home</h1>
        <div className="page-header-actions">
          <Link to="/metrics">
            <Button variant="secondary">
              Metrics
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'family' | 'illnesses' | 'visits')}
        />
      </Card>
    </div>
  );
}

export default HomePage;

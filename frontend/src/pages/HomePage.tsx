import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { childrenApi } from '../lib/api-client';
import type { Child } from '../types/api';
import { calculateAge, formatAge, formatDate } from '../lib/date-utils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import Tabs from '../components/Tabs';
import AllIllnessesView from '../components/AllIllnessesView';
import AllVisitsView from '../components/AllVisitsView';
import MetricsView from '../components/MetricsView';

function HomePage() {
  const [activeTab, setActiveTab] = useState<'family' | 'illnesses' | 'visits' | 'metrics'>('family');
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
    {
      id: 'metrics',
      label: 'Metrics',
      content: <MetricsView />,
    },
  ];

  return (
    <div className="page-container">
      <Card>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'family' | 'illnesses' | 'visits' | 'metrics')}
        />
      </Card>
      <div className="version-footer">
        <a 
          href="https://github.com/dodgerbluee/trajectory" 
          target="_blank" 
          rel="noopener noreferrer"
          className="github-link"
        >
          <svg 
            className="github-link-icon" 
            viewBox="0 0 24 24" 
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span>GitHub</span>
        </a>
        <span className="footer-separator">|</span>
        <span className="footer-version">Trajectory v0.0.0</span>
      </div>
    </div>
  );
}

export default HomePage;

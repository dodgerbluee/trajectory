import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomeTabRequestProvider } from './contexts/HomeTabRequestContext';
import { FamilyPermissionsProvider } from './contexts/FamilyPermissionsContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChildDetailPage from './pages/ChildDetailPage';
import AddChildPage from './pages/AddChildPage';
import EditChildPage from './pages/EditChildPage';
import AddVisitPage from './pages/AddVisitPage';
import EditVisitPage from './pages/EditVisitPage';
import VisitDetailPage from './pages/VisitDetailPage';
import SettingsPage from './pages/SettingsPage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import WelcomePage from './pages/WelcomePage';
import AddIllnessPage from './pages/AddIllnessPage';
import EditIllnessPage from './pages/EditIllnessPage';
import IllnessDetailPage from './pages/IllnessDetailPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite" element={<InviteAcceptPage />} />
        
        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <FamilyPermissionsProvider>
                <OnboardingProvider>
                  <HomeTabRequestProvider>
                    <Routes>
                      <Route path="/welcome" element={<WelcomePage />} />
                      <Route path="/*" element={
                      <Layout>
                        <Routes>
                          <Route path="/" element={<HomePage />} />
                          <Route path="/children/new" element={<AddChildPage />} />
                          <Route path="/children/:id" element={<ChildDetailPage />} />
                          <Route path="/children/:id/edit" element={<EditChildPage />} />
                          <Route path="/visits/new" element={<AddVisitPage />} />
                          <Route path="/children/:childId/visits/new" element={<AddVisitPage />} />
                          <Route path="/visits/:id" element={<VisitDetailPage />} />
                          <Route path="/visits/:id/edit" element={<EditVisitPage />} />
                          <Route path="/illnesses" element={<HomePage />} />
                          <Route path="/illnesses/new" element={<AddIllnessPage />} />
                          <Route path="/illnesses/:id" element={<IllnessDetailPage />} />
                          <Route path="/illnesses/:id/edit" element={<EditIllnessPage />} />
                          <Route path="/family" element={<Navigate to="/settings" replace state={{ tab: 'family', familySubTab: 'members' }} />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Layout>
                    } />
                    </Routes>
                  </HomeTabRequestProvider>
                </OnboardingProvider>
              </FamilyPermissionsProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;

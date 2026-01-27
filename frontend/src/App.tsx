import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChildDetailPage from './pages/ChildDetailPage';
import AddChildPage from './pages/AddChildPage';
import EditChildPage from './pages/EditChildPage';
import GrowthChartsPage from './pages/GrowthChartsPage';
import AddVisitPage from './pages/AddVisitPage';
import EditVisitPage from './pages/EditVisitPage';
import VisitDetailPage from './pages/VisitDetailPage';
import FamilyManagementPage from './pages/FamilyManagementPage';
import SettingsPage from './pages/SettingsPage';
import IllnessesPage from './pages/IllnessesPage';
import AddIllnessPage from './pages/AddIllnessPage';
import EditIllnessPage from './pages/EditIllnessPage';
import MetricsPage from './pages/MetricsPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/children/new" element={<AddChildPage />} />
                  <Route path="/children/:id" element={<ChildDetailPage />} />
                  <Route path="/children/:id/edit" element={<EditChildPage />} />
                  <Route path="/children/:id/growth" element={<GrowthChartsPage />} />
                  
                  {/* Unified Visit Routes */}
                  <Route path="/visits/new" element={<AddVisitPage />} />
                  <Route path="/children/:childId/visits/new" element={<AddVisitPage />} />
                  <Route path="/visits/:id" element={<VisitDetailPage />} />
                  <Route path="/visits/:id/edit" element={<EditVisitPage />} />
                  
                  {/* Illnesses */}
                  <Route path="/illnesses" element={<IllnessesPage />} />
                  <Route path="/illnesses/new" element={<AddIllnessPage />} />
                  <Route path="/illnesses/:id/edit" element={<EditIllnessPage />} />
                  
                  {/* Metrics */}
                  <Route path="/metrics" element={<MetricsPage />} />
                  
                  {/* Management & Settings */}
                  <Route path="/family" element={<FamilyManagementPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;

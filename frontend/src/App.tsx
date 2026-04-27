import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './app/components';
import ErrorBoundary from './shared/components/ErrorBoundary';
import LoadingSpinner from './shared/components/LoadingSpinner';
import { ProtectedRoute, AdminRoute } from './features/auth';

// Lazy-load all route components — each becomes its own chunk.
// Import directly from page files (not feature barrels) so lazy chunks stay tight.
const LoginPage = lazy(() => import('./features/auth/components/LoginPage'));
const SignupPage = lazy(() => import('./features/auth/components/SignupPage'));
const InvitePage = lazy(() => import('./features/auth/components/InvitePage'));
const OAuthCallbackPage = lazy(() => import('./features/auth/components/OAuthCallbackPage'));
const WelcomePage = lazy(() => import('./features/onboarding/pages/WelcomePage'));
const HomePage = lazy(() => import('./app/home/pages/HomePage'));
const AddChildPage = lazy(() => import('./features/children/pages/AddChildPage'));
const ChildDetailPage = lazy(() => import('./features/children/pages/ChildDetailPage'));
const EditChildPage = lazy(() => import('./features/children/pages/EditChildPage'));
const AddVisitPage = lazy(() => import('./features/visits/pages/AddVisitPage'));
const VisitDetailPage = lazy(() => import('./features/visits/pages/VisitDetailPage'));
const EditVisitPage = lazy(() => import('./features/visits/pages/EditVisitPage'));
const AddIllnessPage = lazy(() => import('./features/illnesses/pages/AddIllnessPage'));
const IllnessDetailPage = lazy(() => import('./features/illnesses/pages/IllnessDetailPage'));
const EditIllnessPage = lazy(() => import('./features/illnesses/pages/EditIllnessPage'));
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage'));
const FamilyPage = lazy(() => import('./features/family/pages/FamilyPage'));
const AdminPage = lazy(() => import('./features/admin/pages/AdminPage'));
const NotFoundPage = lazy(() => import('./app/errors/pages/NotFoundPage'));

function LayoutRoute() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<SignupPage />} />
          <Route path="/invite" element={<InvitePage />} />
          <Route path="/auth/oauth/complete" element={<OAuthCallbackPage />} />
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/welcome" element={<WelcomePage />} />

            <Route element={<LayoutRoute />}>
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
              <Route path="/family" element={<FamilyPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;

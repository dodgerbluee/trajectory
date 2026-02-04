import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './app/components';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { ProtectedRoute, AdminRoute } from './features/auth';
import { HomePage } from './app/home';
import { LoginPage, SignupPage, InvitePage } from './features/auth';
import { AddChildPage, EditChildPage, ChildDetailPage } from './features/children';
import { AddVisitPage, EditVisitPage, VisitDetailPage } from './features/visits';
import { AddIllnessPage, EditIllnessPage, IllnessDetailPage } from './features/illnesses';
import { SettingsPage } from './features/settings';
import { AdminPage } from './features/admin';
import { WelcomePage } from './features/onboarding';
import { NotFoundPage } from './app/errors';

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
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<SignupPage />} />
        <Route path="/invite" element={<InvitePage />} />
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
            <Route
              path="/family"
              element={
                <Navigate
                  to="/settings"
                  replace
                  state={{ tab: 'family', familySubTab: 'members' }}
                />
              }
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;

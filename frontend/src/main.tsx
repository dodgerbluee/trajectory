import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { FamilyPermissionsProvider } from './contexts/FamilyPermissionsContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { HomeTabRequestProvider } from './contexts/HomeTabRequestContext';
import App from './App';
import './index.css';

// Get base path from environment variable (set at build time)
// For NPM path routing, this should be set to the path like '/trajectory'
const BASE_PATH = import.meta.env.VITE_BASE_PATH || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={BASE_PATH}>
      <AuthProvider>
        <PreferencesProvider>
          <ThemeProvider>
            <ConfigProvider>
              <FamilyPermissionsProvider>
                <OnboardingProvider>
                  <HomeTabRequestProvider>
                    <App />
                  </HomeTabRequestProvider>
                </OnboardingProvider>
              </FamilyPermissionsProvider>
            </ConfigProvider>
          </ThemeProvider>
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

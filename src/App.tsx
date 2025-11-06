import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ParticleBackground } from './components/ui/ParticleBackground';
import { LandscapeLock } from './components/ui/LandscapeLock';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Loader } from './components/ui/Loader';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const CyberpunkLanding = lazy(() => import('./pages/CyberpunkLanding').then(m => ({ default: m.CyberpunkLanding })));
const JoinGamePage = lazy(() => import('./pages/JoinGamePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const FacilitatorLogin = lazy(() => import('./pages/FacilitatorLogin').then(m => ({ default: m.FacilitatorLogin })));
const FacilitatorDashboard = lazy(() => import('./pages/FacilitatorDashboard').then(m => ({ default: m.FacilitatorDashboard })));
const TestFacilitator = lazy(() => import('./pages/TestFacilitator').then(m => ({ default: m.TestFacilitator })));
const CyberpunkAdminLogin = lazy(() => import('./pages/CyberpunkAdminLogin').then(m => ({ default: m.CyberpunkAdminLogin })));
const CyberpunkAdminDashboard = lazy(() => import('./pages/CyberpunkAdminDashboard').then(m => ({ default: m.CyberpunkAdminDashboard })));
const VisualShowcase = lazy(() => import('./pages/VisualShowcase').then(m => ({ default: m.VisualShowcase })));
const SessionMonitor = lazy(() => import('./pages/SessionMonitor').then(m => ({ default: m.SessionMonitor })));
const InvestmentPhase = lazy(() => import('./pages/InvestmentPhase').then(m => ({ default: m.InvestmentPhase })));

function App() {
  const LoadingFallback = () => (
    <div className="min-h-screen flex items-center justify-center">
      <Loader variant="orbit" size="xl" text="Loading..." />
    </div>
  );

  return (
    <ErrorBoundary>
      <Router>
        <LandscapeLock>
          <div className="min-h-screen bg-space-black text-space-text-primary">
            <ParticleBackground />
            
            <div className="relative z-10">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<CyberpunkLanding />} />
                  <Route path="/corporate" element={<HomePage />} />
                  <Route path="/join" element={<JoinGamePage />} />
                  <Route path="/facilitator/login" element={<FacilitatorLogin />} />
                  <Route path="/facilitator/dashboard" element={
                    <ProtectedRoute allowedRoles={['facilitator', 'admin']}>
                      <FacilitatorDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/facilitator/session/:sessionId" element={
                    <ProtectedRoute allowedRoles={['facilitator', 'admin']}>
                      <SessionMonitor />
                    </ProtectedRoute>
                  } />
                  <Route path="/test" element={<TestFacilitator />} />
                  <Route path="/admin/login" element={<CyberpunkAdminLogin />} />
                  <Route path="/admin" element={<CyberpunkAdminDashboard />} />
                  <Route path="/investment/:sessionId/:teamId" element={<InvestmentPhase />} />
                  <Route path="/dashboard/:sessionId/:teamId" element={<DashboardPage />} />
                  <Route path="/game/:sessionId/:teamId/:playerId" element={<DashboardPage />} />
                  <Route path="/showcase" element={<VisualShowcase />} />
                </Routes>
              </Suspense>
            </div>
          </div>
        </LandscapeLock>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
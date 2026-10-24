import { ErrorBoundary, Spinner } from '@contenox/ui';
import { Suspense, lazy, useContext, type ReactNode } from 'react';
import { Route, HashRouter as Router, Routes } from 'react-router-dom';
import './app.css';
import { Layout } from './components/Layout';
import { NavbarSlotProvider } from './components/NavbarSlot';
import { CommandPalette } from './components/palette/CommandPalette';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AcpSessionSidebar } from './components/sidebar/AcpSessionSidebar';
import { routes } from './config/routes';
import { AuthProvider } from './lib/AuthProvider';
import { AcpWorkspaceProvider } from './lib/acp/AcpWorkspaceProvider';
import { StagedAgentProvider } from './lib/stagedAgent';
import { StagedRootProvider } from './lib/stagedRoot';
import { AdoptIntentProvider } from './lib/adoptIntent';
import { AuthContext } from './lib/authContext';

const AuthPage = lazy(() => import('./pages/public/login/AuthPage'));

function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading, authRequired, authenticated } = useContext(AuthContext);
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (authRequired && !authenticated) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <Spinner />
          </div>
        }>
        <AuthPage />
      </Suspense>
    );
  }
  return <>{children}</>;
}

function AuthenticatedAcpProvider({ children }: { children: ReactNode }) {
  const { user } = useContext(AuthContext);
  if (!user) return <>{children}</>;
  return <AcpWorkspaceProvider>{children}</AcpWorkspaceProvider>;
}

function AuthedCommandPalette() {
  const { user } = useContext(AuthContext);
  if (!user) return null;
  return <CommandPalette />;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AuthGate>
          <AuthenticatedAcpProvider>

            <StagedAgentProvider>

            <StagedRootProvider>

            <AdoptIntentProvider>

            <AuthedCommandPalette />

            <NavbarSlotProvider>
            <Layout
              sidebarContent={({ setIsOpen }) => <AcpSessionSidebar setIsOpen={setIsOpen} />}
              defaultOpen={true}
              mainContent={
                <ErrorBoundary>
                  <Suspense
                    fallback={
                      <div className="flex min-h-screen items-center justify-center">
                        <Spinner />
                      </div>
                    }>
                    <Routes>
                      {routes.map((route, index) => {
                        const Element = route.element;
                        const wrappedElement =
                          route.protected !== false ? (
                            <ProtectedRoute>
                              <Element />
                            </ProtectedRoute>
                          ) : (
                            <Element />
                          );
                        return <Route key={index} path={route.path} element={wrappedElement} />;
                      })}
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              }
            />
            </NavbarSlotProvider>
            </AdoptIntentProvider>
            </StagedRootProvider>
            </StagedAgentProvider>
          </AuthenticatedAcpProvider>
        </AuthGate>
      </AuthProvider>
    </Router>
  );
}

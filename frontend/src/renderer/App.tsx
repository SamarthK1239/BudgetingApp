import React, { useEffect, useState, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, Spin, Alert } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store';
import apiClient from './api/client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import CreateAdmin from './pages/CreateAdmin';
import Users from './pages/Users';
import SetupWizard from './pages/SetupWizard';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Categories from './pages/Categories';
import Goals from './pages/Goals';
import Income from './pages/Income';
import Reports from './pages/Reports';
import MainLayout from './components/Layout/MainLayout';
import './App.css';

// Theme types
export type ThemeVariant = 'default' | 'ocean' | 'sunset' | 'forest' | 'midnight' | 'aurora' | 'ember' | 'royal' | 'slate';

export interface ThemeOption {
  id: ThemeVariant;
  name: string;
  isDark: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'default', name: 'Default', isDark: true },
  { id: 'ocean', name: 'Ocean', isDark: true },
  { id: 'sunset', name: 'Sunset', isDark: true },
  { id: 'forest', name: 'Forest', isDark: true },
  { id: 'midnight', name: 'Midnight', isDark: true },
  { id: 'aurora', name: 'Aurora', isDark: true },
  { id: 'ember', name: 'Ember', isDark: true },
  { id: 'royal', name: 'Royal', isDark: true },
  { id: 'slate', name: 'Slate', isDark: false },
];

// Theme context
interface ThemeContextType {
  currentTheme: ThemeVariant;
  setTheme: (theme: ThemeVariant) => void;
  isDarkMode: boolean;
}

export const ThemeContext = createContext<ThemeContextType>({
  currentTheme: 'default',
  setTheme: () => {},
  isDarkMode: true,
});

export const useTheme = () => useContext(ThemeContext);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface FullScreenProps {
  isDarkMode: boolean;
  children: React.ReactNode;
}

const FullScreen: React.FC<FullScreenProps> = ({ isDarkMode, children }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: isDarkMode ? '#141414' : '#f5f5f5',
      padding: 24,
    }}
  >
    {children}
  </div>
);

/**
 * Routes the user between the first-run admin screen, the login screen,
 * the setup wizard and the main application.
 */
const AuthenticatedApp: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { status, user, error: authError } = useAuth();
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    let cancelled = false;
    const checkSetup = async (): Promise<void> => {
      setSetupLoading(true);
      try {
        const setupStatus = await apiClient.getSetupStatus();
        if (!cancelled) {
          setIsSetupComplete(setupStatus.is_setup_complete);
          setSetupError(null);
        }
      } catch (error: any) {
        if (!cancelled) {
          setSetupError(error?.message || 'Could not load setup status');
        }
      } finally {
        if (!cancelled) {
          setSetupLoading(false);
        }
      }
    };

    checkSetup();
    return () => {
      cancelled = true;
    };
  }, [status, user?.id]);

  if (status === 'loading') {
    return (
      <FullScreen isDarkMode={isDarkMode}>
        <Spin size="large" tip="Connecting to BudgetingApp..." />
      </FullScreen>
    );
  }

  if (status === 'needs-bootstrap') {
    return <CreateAdmin />;
  }

  if (status === 'unauthenticated') {
    return (
      <>
        {authError && (
          <Alert
            type="error"
            message="Connection problem"
            description={authError}
            showIcon
            banner
          />
        )}
        <Login />
      </>
    );
  }

  if (setupLoading) {
    return (
      <FullScreen isDarkMode={isDarkMode}>
        <Spin size="large" tip="Loading BudgetingApp..." />
      </FullScreen>
    );
  }

  if (setupError) {
    return (
      <FullScreen isDarkMode={isDarkMode}>
        <Alert
          type="error"
          message="Connection Error"
          description={setupError}
          showIcon
          style={{ maxWidth: 500 }}
        />
      </FullScreen>
    );
  }

  if (!isSetupComplete) {
    return <SetupWizard onComplete={() => setIsSetupComplete(true)} />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/income" element={<Income />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/users" element={<Users />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
};

function App() {
  const [initialized, setInitialized] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeVariant>(() => {
    const saved = localStorage.getItem('budgetapp-theme');
    return (saved as ThemeVariant) || 'default';
  });
  const [error, setError] = useState<string | null>(null);

  // Get isDarkMode from current theme
  const isDarkMode = THEME_OPTIONS.find(t => t.id === currentTheme)?.isDark ?? true;

  const setTheme = (theme: ThemeVariant) => {
    setCurrentTheme(theme);
    localStorage.setItem('budgetapp-theme', theme);
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await apiClient.initialize();
        setError(null);
      } catch (err: any) {
        console.error('Failed to initialize app:', err);
        setError(
          `Failed to connect to the backend: ${err?.message || 'Unknown error'}. ` +
            'Check that the server is running and reachable.'
        );
      } finally {
        setInitialized(true);
      }
    };

    initializeApp();
  }, []);

  if (!initialized || error) {
    return (
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <FullScreen isDarkMode={isDarkMode}>
          {!initialized ? (
            <Spin size="large" tip="Loading BudgetingApp..." />
          ) : (
            <Alert
              type="error"
              message="Connection Error"
              description={error}
              showIcon
              style={{ maxWidth: 500 }}
            />
          )}
        </FullScreen>
      </ConfigProvider>
    );
  }

  const themeContextValue = {
    currentTheme,
    setTheme,
    isDarkMode,
  };

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeContext.Provider value={themeContextValue}>
        <ConfigProvider
          theme={{
            algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
            token: {
              colorPrimary: '#3b82f6',
              colorSuccess: '#22c55e',
              colorWarning: '#f59e0b', 
              colorError: '#ef4444',
              colorInfo: '#3b82f6',
              borderRadius: 8,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              motion: true,
            },
            components: {
              Layout: {
                headerBg: '#001529',
                siderBg: isDarkMode ? '#141414' : '#fff',
                bodyBg: isDarkMode ? '#0a0a0a' : '#f5f5f5',
              },
              Card: {
                colorBgContainer: isDarkMode ? '#181818' : '#fff',
                boxShadowTertiary: isDarkMode 
                  ? '0 1px 2px 0 rgba(0, 0, 0, 0.3)' 
                  : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
              },
              Table: {
                colorBgContainer: isDarkMode ? '#181818' : '#fff',
                headerBg: isDarkMode ? '#1f1f1f' : '#fafafa',
              },
              Menu: {
                colorBgContainer: 'transparent',
                itemMarginInline: 8,
                itemBorderRadius: 8,
                itemSelectedBg: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                itemSelectedColor: '#3b82f6',
                itemHoverBg: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              },
              Button: {
                borderRadius: 6,
                controlHeight: 36,
              },
              Input: {
                borderRadius: 6,
                controlHeight: 36,
              },
              Select: {
                borderRadius: 6,
                controlHeight: 36,
              },
              Progress: {
                defaultColor: '#3b82f6',
              },
              Statistic: {
                titleFontSize: 13,
                contentFontSize: 28,
              },
            },
          }}
        >
          <AuthProvider>
            <Router>
              <AuthenticatedApp isDarkMode={isDarkMode} />
            </Router>
          </AuthProvider>
        </ConfigProvider>
        </ThemeContext.Provider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;

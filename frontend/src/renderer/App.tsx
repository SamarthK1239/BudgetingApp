import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, Spin, Alert } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store';
import apiClient from './api/client';
import SetupWizard from './pages/SetupWizard';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Categories from './pages/Categories';
import Reports from './pages/Reports';
import MainLayout from './components/Layout/MainLayout';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
    detectSystemTheme();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize API client
      await apiClient.initialize();

      // Check setup status
      const status = await apiClient.getSetupStatus();
      setIsSetupComplete(status.is_setup_complete);
      setError(null);
    } catch (error: any) {
      console.error('Failed to initialize app:', error);
      setError(`Failed to connect to backend: ${error.message || 'Unknown error'}. Please restart the application.`);
    } finally {
      setLoading(false);
    }
  };

  const detectSystemTheme = () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);

    // Listen for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      setIsDarkMode(e.matches);
    });
  };

  if (loading || error) {
    return (
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
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
          {loading ? (
            <Spin size="large" tip="Loading BudgetingApp..." />
          ) : error ? (
            <Alert
              type="error"
              message="Connection Error"
              description={error}
              showIcon
              style={{ maxWidth: 500 }}
            />
          ) : null}
        </div>
      </ConfigProvider>
    );
  }

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
            token: {
              colorPrimary: '#1890ff',
              borderRadius: 6,
            },
            components: {
              Layout: {
                headerBg: '#001529',
                siderBg: isDarkMode ? '#141414' : '#fff',
                bodyBg: isDarkMode ? '#000' : '#f5f5f5',
              },
              Card: {
                colorBgContainer: isDarkMode ? '#1f1f1f' : '#fff',
              },
              Table: {
                colorBgContainer: isDarkMode ? '#1f1f1f' : '#fff',
              },
              Menu: {
                colorBgContainer: 'transparent',
              },
            },
          }}
        >
          <Router>
            {!isSetupComplete ? (
              <SetupWizard onComplete={() => setIsSetupComplete(true)} />
            ) : (
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/budgets" element={<Budgets />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </MainLayout>
            )}
          </Router>
        </ConfigProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;

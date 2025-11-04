import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Layout/Header';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import Cases from './components/Cases/Cases';
import CounselorsManagement from './components/Counselors/CounselorsManagement';
import CalendarManagement from './components/Calendar/CalendarManagement';
import ActivityTimeline from './components/Activity/ActivityTimeline';
import AdminTools from './components/Admin/AdminTools';
import MyProfile from './components/Profile/MyProfile';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#ffc700',
      light: '#ffd633',
      dark: '#e6b300',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#666666',
      light: '#999999',
      dark: '#333333',
      contrastText: '#ffffff',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <div>Loading...</div>
      </Box>
    );
  }

  return currentUser ? <>{children}</> : <Navigate to="/login" />;
};

// Main App component
const AppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();

  console.log('AppContent: loading =', loading, 'currentUser =', currentUser);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <div>Loading...</div>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {currentUser && <Header />}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cases"
            element={
              <ProtectedRoute>
                <Cases />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <MyProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/counselors"
            element={
              <ProtectedRoute>
                <CounselorsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarManagement isAdminView={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <ProtectedRoute>
                <ActivityTimeline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminTools />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Box>
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
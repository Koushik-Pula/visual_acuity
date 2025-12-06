import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';
import SignupWithCalibration from './SignupWithCalibration';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = React.useState('login');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return currentView === 'login' ? (
      <Login onSwitchToSignup={() => setCurrentView('signup')} />
    ) : (
      <SignupWithCalibration 
        onComplete={() => setCurrentView('login')}
        onBackToLogin={() => setCurrentView('login')}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
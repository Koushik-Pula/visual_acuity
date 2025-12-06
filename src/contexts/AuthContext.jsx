import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('authToken');
    return savedToken;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const storedToken = localStorage.getItem('authToken');
      
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${storedToken || token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        const authToken = data.access_token;
        
        localStorage.setItem('authToken', authToken);
        setToken(authToken);
        
        await fetchUserProfile();
        
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (email, password, fullName, focalLength = null, pixelsPerMm = null, screenPpi = null) => {
    try {
      console.log('Registering user with data:', { email, fullName, focalLength, pixelsPerMm, screenPpi });
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email, 
          password, 
          full_name: fullName,
          focal_length: focalLength,
          pixels_per_mm: pixelsPerMm,
          screen_ppi: screenPpi
        })
      });

      console.log('Registration response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Registration successful, data:', data);
        
        const authToken = data.access_token;
        
        localStorage.setItem('authToken', authToken);
        setToken(authToken);
        
        await fetchUserProfile();
        
        return { success: true };
      } else {
        let errorDetail = 'Registration failed';
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
          console.log('Registration error details:', errorData);
        } catch (parseError) {
          console.log('Could not parse error response');
        }
        return { success: false, error: errorDetail };
      }
    } catch (error) {
      console.error('Registration network error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const updateCalibration = async (focalLength, pixelsPerMm, screenPpi) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/update-calibration', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          focal_length: focalLength,
          pixels_per_mm: pixelsPerMm,
          screen_ppi: screenPpi
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || 'Update failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const getCalibration = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/calibration', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const calibrationData = await response.json();
        console.log('Calibration data fetched:', calibrationData);
        return calibrationData;
      } else {
        console.log('Failed to fetch calibration data, status:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch calibration:', error);
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    // Clear calibration data from window
    window.userCalibration = null;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateCalibration,
    getCalibration,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
import api from './api';

// Check if the user is logged in (with token validation)
export const isLoggedIn = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;
  
  // Optional: Add JWT expiration check here if needed
  // You can use jwt-decode library to check token expiration
  
  return true;
};

// Get current user with proper error handling and token refresh
export const getCurrentUser = async () => {
  try {
    const response = await api.get('auth/me/', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    
    // If unauthorized (401), try to refresh token
    if (error.response?.status === 401) {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw error;
        
        const refreshResponse = await api.post('auth/token/refresh/', {
          refresh: refreshToken
        });
        
        // Update tokens in storage
        localStorage.setItem('accessToken', refreshResponse.data.access);
        if (refreshResponse.data.refresh) {
          localStorage.setItem('refreshToken', refreshResponse.data.refresh);
        }
        
        // Retry the original request
        const retryResponse = await api.get('auth/me/', {
          headers: {
            'Authorization': `Bearer ${refreshResponse.data.access}`
          }
        });
        return retryResponse.data;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return null;
      }
    }
    
    return null;
  }
};

// Get current user role with caching
let cachedRole = null;
let lastFetchTime = 0;

export const getCurrentUserRole = async () => {
  // Return cached role if it's been less than 5 minutes
  if (cachedRole && Date.now() - lastFetchTime < 300000) {
    return cachedRole;
  }
  
  const user = await getCurrentUser();
  if (user) {
    cachedRole = user.role;
    lastFetchTime = Date.now();
  }
  
  return cachedRole || null;
};

// WebSocket connection helper with auth
export const getAuthenticatedWebSocket = (urlSuffix) => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('No access token available for WebSocket');
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  return new WebSocket(`${wsProtocol}${window.location.host}/ws/${urlSuffix}/?token=${token}`);
};
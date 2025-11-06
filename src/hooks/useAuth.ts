import { useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import { AuthService } from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const authUser = await AuthService.ensureAuthenticated();
        setUser(authUser);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        console.error('Auth initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user
  };
};
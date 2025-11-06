import { signInAnonymously, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

// Hardcoded admin credentials for testing
const ADMIN_CREDENTIALS = {
  email: 'admin@spacecolony.test',
  password: 'admin123',
  // For testing, we'll use a known admin UID pattern
  adminUID: 'admin_user_hardcoded'
};

export class AdminAuthService {
  private static isAdminAuthenticated = false;
  private static adminSession: string | null = null;

  // Admin login with hardcoded credentials
  static async adminLogin(email: string, password: string): Promise<boolean> {
    try {
      // For testing, check against hardcoded credentials
      if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        // Sign in anonymously to get Firebase auth
        await signInAnonymously(auth);
        
        this.isAdminAuthenticated = true;
        this.adminSession = `admin_session_${Date.now()}`;
        
        // Store admin session in localStorage for persistence
        localStorage.setItem('space_colony_admin_session', this.adminSession);
        localStorage.setItem('space_colony_admin_authenticated', 'true');
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Admin login failed:', error);
      return false;
    }
  }

  // Check if user is admin
  static isAdmin(): boolean {
    // Check session storage
    const storedAuth = localStorage.getItem('space_colony_admin_authenticated');
    const storedSession = localStorage.getItem('space_colony_admin_session');
    
    if (storedAuth === 'true' && storedSession) {
      this.isAdminAuthenticated = true;
      this.adminSession = storedSession;
      return true;
    }
    
    return this.isAdminAuthenticated;
  }

  // Admin logout
  static async adminLogout(): Promise<void> {
    try {
      await signOut(auth);
      this.isAdminAuthenticated = false;
      this.adminSession = null;
      
      // Clear localStorage
      localStorage.removeItem('space_colony_admin_session');
      localStorage.removeItem('space_colony_admin_authenticated');
    } catch (error) {
      console.error('Admin logout failed:', error);
    }
  }

  // Get admin session info
  static getAdminSession(): string | null {
    return this.adminSession;
  }

  // Initialize admin check on app start
  static initializeAdminCheck(): boolean {
    return this.isAdmin();
  }

  // For production, these would be real Firebase users
  static getHardcodedCredentials() {
    return {
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
      note: 'These are hardcoded credentials for testing. In production, use Firebase Authentication.'
    };
  }
}
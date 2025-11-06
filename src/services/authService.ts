import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase/config';

export class AuthService {
  private static currentUser: User | null = null;
  private static authPromise: Promise<User> | null = null;

  static async ensureAuthenticated(): Promise<User> {
    // Return existing auth promise if in progress
    if (this.authPromise) {
      return this.authPromise;
    }

    // Return current user if already authenticated
    if (this.currentUser) {
      return Promise.resolve(this.currentUser);
    }

    // Create new auth promise
    this.authPromise = new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe(); // Stop listening after first auth state change
        
        if (user) {
          this.currentUser = user;
          this.authPromise = null;
          resolve(user);
        } else {
          try {
            // Sign in anonymously if no user
            const result = await signInAnonymously(auth);
            this.currentUser = result.user;
            this.authPromise = null;
            resolve(result.user);
          } catch (error) {
            this.authPromise = null;
            reject(error);
          }
        }
      });
    });

    return this.authPromise;
  }

  static getCurrentUser(): User | null {
    return this.currentUser;
  }

  static async signOut(): Promise<void> {
    await auth.signOut();
    this.currentUser = null;
    this.authPromise = null;
  }
}
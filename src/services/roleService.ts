import { doc, setDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import type { UserRole, FacilitatorAccess } from '../types';

interface RoleContext {
  role: UserRole;
  facilitatorAccess?: FacilitatorAccess;
  userId: string;
}

export class RoleService {
  private static readonly ROLE_STORAGE_KEY = 'space_colony_role';
  private static readonly FACILITATOR_ACCESS_KEY = 'space_colony_facilitator_access';
  
  /**
   * Detects the user role based on the provided code
   */
  static detectRoleFromCode(code: string): UserRole {
    const upperCode = code.toUpperCase();
    
    // Check if it's a facilitator code (FAC###)
    if (/^FAC\d{3}$/.test(upperCode)) {
      return 'facilitator';
    }
    
    // Check if it's an admin code (ADM###)
    if (/^ADM\d{3}$/.test(upperCode)) {
      return 'admin';
    }
    
    // Otherwise, it's a player code (e.g., CGAB01)
    return 'player';
  }
  
  /**
   * Validates a facilitator code and returns access permissions
   */
  static async validateFacilitatorCode(code: string): Promise<FacilitatorAccess | null> {
    try {
      // Query Firestore for the facilitator access document
      const accessQuery = query(
        collection(firestore, 'facilitatorAccess'),
        where('facilitatorCode', '==', code.toUpperCase())
      );
      
      const snapshot = await getDocs(accessQuery);
      
      if (snapshot.empty) {
        return null;
      }
      
      const accessDoc = snapshot.docs[0];
      const accessData = accessDoc.data() as FacilitatorAccess;
      
      // Update last access time
      await setDoc(doc(firestore, 'facilitatorAccess', accessDoc.id), {
        ...accessData,
        lastAccess: Date.now()
      });
      
      return accessData;
    } catch (error) {
      console.error('Error validating facilitator code:', error);
      return null;
    }
  }
  
  /**
   * Creates a new facilitator access entry
   */
  static async createFacilitatorAccess(
    facilitatorCode: string,
    eventId: string,
    sessionId: string
  ): Promise<void> {
    const facilitatorId = `facilitator_${Date.now()}`;
    
    const accessData: FacilitatorAccess = {
      facilitatorId,
      facilitatorCode: facilitatorCode.toUpperCase(),
      eventIds: [eventId],
      sessionIds: [sessionId],
      createdAt: Date.now(),
      lastAccess: Date.now()
    };
    
    await setDoc(
      doc(firestore, 'facilitatorAccess', facilitatorId),
      accessData
    );
  }
  
  /**
   * Stores role information in session storage
   */
  static setRoleContext(context: RoleContext): void {
    sessionStorage.setItem(this.ROLE_STORAGE_KEY, JSON.stringify(context));
    
    if (context.facilitatorAccess) {
      sessionStorage.setItem(
        this.FACILITATOR_ACCESS_KEY,
        JSON.stringify(context.facilitatorAccess)
      );
    }
  }
  
  /**
   * Retrieves role information from session storage
   */
  static getRoleContext(): RoleContext | null {
    const roleData = sessionStorage.getItem(this.ROLE_STORAGE_KEY);
    
    if (!roleData) {
      return null;
    }
    
    try {
      const context = JSON.parse(roleData) as RoleContext;
      
      // Also load facilitator access if available
      const facilitatorAccessData = sessionStorage.getItem(this.FACILITATOR_ACCESS_KEY);
      if (facilitatorAccessData) {
        context.facilitatorAccess = JSON.parse(facilitatorAccessData) as FacilitatorAccess;
      }
      
      return context;
    } catch {
      return null;
    }
  }
  
  /**
   * Clears role information from session storage
   */
  static clearRoleContext(): void {
    sessionStorage.removeItem(this.ROLE_STORAGE_KEY);
    sessionStorage.removeItem(this.FACILITATOR_ACCESS_KEY);
  }
  
  /**
   * Checks if the current user has access to a specific session
   */
  static hasSessionAccess(sessionId: string): boolean {
    const context = this.getRoleContext();
    
    if (!context) {
      return false;
    }
    
    // Admins have access to all sessions
    if (context.role === 'admin') {
      return true;
    }
    
    // Facilitators only have access to their assigned sessions
    if (context.role === 'facilitator' && context.facilitatorAccess) {
      return context.facilitatorAccess.sessionIds.includes(sessionId);
    }
    
    // Players have access to the session they joined
    // This would be handled by the game code validation
    return true;
  }
  
  /**
   * Checks if the current user has access to a specific event
   */
  static hasEventAccess(eventId: string): boolean {
    const context = this.getRoleContext();
    
    if (!context) {
      return false;
    }
    
    // Admins have access to all events
    if (context.role === 'admin') {
      return true;
    }
    
    // Facilitators only have access to their assigned events
    if (context.role === 'facilitator' && context.facilitatorAccess) {
      return context.facilitatorAccess.eventIds.includes(eventId);
    }
    
    // Players don't have direct event access
    return false;
  }
  
  /**
   * Gets the current user's role
   */
  static getCurrentRole(): UserRole | null {
    const context = this.getRoleContext();
    return context?.role || null;
  }
  
  /**
   * Checks if the current user is an admin
   */
  static isAdmin(): boolean {
    return this.getCurrentRole() === 'admin';
  }
  
  /**
   * Checks if the current user is a facilitator
   */
  static isFacilitator(): boolean {
    return this.getCurrentRole() === 'facilitator';
  }
  
  /**
   * Checks if the current user is a player
   */
  static isPlayer(): boolean {
    return this.getCurrentRole() === 'player';
  }
}
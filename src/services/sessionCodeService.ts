import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { firestore as db } from '../firebase/config';

// Types
interface SessionCode {
  eventCode: string;
  galaxyCode: string;
  fullCode: string;
  sessionId: string;
  reservedAt: Timestamp;
  expiresAt: Timestamp;
  isCustom: boolean;
  isActive: boolean;
}

interface CodeGenerationOptions {
  eventCode?: string;
  galaxyCode?: string;
  isCustom?: boolean;
}

// Constants
const CODE_EXPIRATION_HOURS = 24;
const MAX_GENERATION_ATTEMPTS = 100;
const EVENT_CODE_LENGTH = 4;
const GALAXY_CODE_LENGTH = 3;
const CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{3}$/;

// Character sets for code generation
const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const VOWELS = 'AEIOU';
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ';

// Offensive word patterns to avoid (simplified for demo)
const OFFENSIVE_PATTERNS = [
  /ASS/, /SEX/, /DIE/, /KKK/, /FUK/, /COK/, /DIK/, /FAG/, /GAY/, /JEW/, /NIG/
];

class SessionCodeService {
  private codeCache: Map<string, SessionCode> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Generate a new session code with optional custom parts
   */
  async generateSessionCode(
    sessionId: string, 
    options: CodeGenerationOptions = {}
  ): Promise<string> {
    const { eventCode, galaxyCode, isCustom = false } = options;

    // If both parts are provided, validate and use them
    if (eventCode && galaxyCode) {
      const fullCode = `${eventCode.toUpperCase()}-${galaxyCode.toUpperCase()}`;
      
      if (!this.validateCodeFormat(fullCode)) {
        throw new Error('Invalid code format. Must be XXXX-YYY format with alphanumeric characters.');
      }

      if (!isCustom && this.containsOffensiveContent(fullCode)) {
        throw new Error('Code contains inappropriate content. Please choose a different code.');
      }

      // Check if code is already in use
      const exists = await this.checkCodeExists(fullCode);
      if (exists) {
        throw new Error('Code already in use. Please choose a different code.');
      }

      await this.reserveCode(fullCode, sessionId, isCustom);
      return fullCode;
    }

    // Generate random parts as needed
    let attempts = 0;
    while (attempts < MAX_GENERATION_ATTEMPTS) {
      const generatedEventCode = eventCode || this.generateEventCode();
      const generatedGalaxyCode = galaxyCode || this.generateGalaxyCode();
      const fullCode = `${generatedEventCode}-${generatedGalaxyCode}`;

      if (!this.containsOffensiveContent(fullCode) && !(await this.checkCodeExists(fullCode))) {
        await this.reserveCode(fullCode, sessionId, isCustom);
        return fullCode;
      }

      attempts++;
    }

    throw new Error('Unable to generate unique code. Please try again.');
  }

  /**
   * Validate session code format
   */
  validateCodeFormat(code: string): boolean {
    return CODE_PATTERN.test(code);
  }

  /**
   * Look up session by code with <100ms performance target
   */
  async lookupSessionByCode(code: string): Promise<string | null> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cached = this.getCachedCode(code);
      if (cached) {
        const lookupTime = performance.now() - startTime;
        console.debug(`Cache hit: ${lookupTime.toFixed(2)}ms`);
        return cached.isActive ? cached.sessionId : null;
      }

      // Query Firestore
      const codeDoc = await getDoc(doc(db, 'sessionCodes', code));
      
      if (!codeDoc.exists()) {
        return null;
      }

      const codeData = codeDoc.data() as SessionCode;
      
      // Check if code has expired
      if (this.isCodeExpired(codeData)) {
        await this.expireCode(code);
        return null;
      }

      // Update cache
      this.codeCache.set(code, codeData);

      const lookupTime = performance.now() - startTime;
      console.debug(`Firestore lookup: ${lookupTime.toFixed(2)}ms`);

      return codeData.isActive ? codeData.sessionId : null;
    } catch (error) {
      console.error('Error looking up session code:', error);
      return null;
    }
  }

  /**
   * Reserve a code for a session
   */
  private async reserveCode(code: string, sessionId: string, isCustom: boolean): Promise<void> {
    const [eventCode, galaxyCode] = code.split('-');
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + CODE_EXPIRATION_HOURS * 60 * 60 * 1000)
    );

    const codeData: SessionCode = {
      eventCode,
      galaxyCode,
      fullCode: code,
      sessionId,
      reservedAt: now,
      expiresAt,
      isCustom,
      isActive: true
    };

    await setDoc(doc(db, 'sessionCodes', code), codeData);
    
    // Update session with code
    await updateDoc(doc(db, 'sessions', sessionId), {
      code,
      codeReservedAt: now
    });

    // Update cache
    this.codeCache.set(code, codeData);
  }

  /**
   * Check if a code already exists
   */
  private async checkCodeExists(code: string): Promise<boolean> {
    // Check cache first
    if (this.codeCache.has(code)) {
      const cached = this.codeCache.get(code)!;
      return cached.isActive && !this.isCodeExpired(cached);
    }

    const codeDoc = await getDoc(doc(db, 'sessionCodes', code));
    if (!codeDoc.exists()) {
      return false;
    }

    const codeData = codeDoc.data() as SessionCode;
    return codeData.isActive && !this.isCodeExpired(codeData);
  }

  /**
   * Generate event code (4 characters)
   */
  private generateEventCode(): string {
    let code = '';
    
    // First character: letter
    code += ALPHANUMERIC[Math.floor(Math.random() * 26)];
    
    // Next three: mix of letters and numbers
    for (let i = 0; i < 3; i++) {
      code += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
    }
    
    return code;
  }

  /**
   * Generate galaxy code (3 characters, pronounceable)
   */
  private generateGalaxyCode(): string {
    // Pattern: Consonant-Vowel-Consonant for pronounceability
    const c1 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const v = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const c2 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    
    return c1 + v + c2;
  }

  /**
   * Check for offensive content
   */
  private containsOffensiveContent(code: string): boolean {
    const cleanCode = code.replace('-', '');
    return OFFENSIVE_PATTERNS.some(pattern => pattern.test(cleanCode));
  }

  /**
   * Check if code has expired
   */
  private isCodeExpired(codeData: SessionCode): boolean {
    return codeData.expiresAt.toDate() < new Date();
  }

  /**
   * Expire a code
   */
  private async expireCode(code: string): Promise<void> {
    await updateDoc(doc(db, 'sessionCodes', code), {
      isActive: false,
      expiredAt: Timestamp.now()
    });

    // Remove from cache
    this.codeCache.delete(code);
  }

  /**
   * Get cached code if valid
   */
  private getCachedCode(code: string): SessionCode | null {
    // Check if cache needs refresh
    if (Date.now() - this.lastCacheUpdate > this.CACHE_TTL) {
      this.codeCache.clear();
      this.lastCacheUpdate = Date.now();
      return null;
    }

    return this.codeCache.get(code) || null;
  }

  /**
   * Admin: Set custom code for a session
   */
  async setCustomCode(sessionId: string, customCode: string, adminId: string): Promise<void> {
    if (!this.validateCodeFormat(customCode)) {
      throw new Error('Invalid code format. Must be XXXX-YYY format.');
    }

    // Check if code is already in use
    const existingSession = await this.lookupSessionByCode(customCode);
    if (existingSession && existingSession !== sessionId) {
      throw new Error('Code is already assigned to another session.');
    }

    // Get current code if any
    const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
    if (!sessionDoc.exists()) {
      throw new Error('Session not found.');
    }

    const currentCode = sessionDoc.data().code;

    // Use batch to update atomically
    const batch = writeBatch(db);

    // Remove old code if exists
    if (currentCode && currentCode !== customCode) {
      batch.update(doc(db, 'sessionCodes', currentCode), {
        isActive: false,
        replacedBy: customCode,
        replacedAt: Timestamp.now()
      });
    }

    // Reserve new code
    await this.generateSessionCode(sessionId, {
      eventCode: customCode.split('-')[0],
      galaxyCode: customCode.split('-')[1],
      isCustom: true
    });

    // Log admin action
    batch.set(doc(collection(db, 'adminActions')), {
      action: 'customCodeSet',
      adminId,
      sessionId,
      oldCode: currentCode,
      newCode: customCode,
      timestamp: Timestamp.now()
    });

    await batch.commit();
  }

  /**
   * Clean up expired codes (maintenance task)
   */
  async cleanupExpiredCodes(): Promise<number> {
    const now = new Date();
    const expiredQuery = query(
      collection(db, 'sessionCodes'),
      where('expiresAt', '<', Timestamp.fromDate(now)),
      where('isActive', '==', true)
    );

    const expiredDocs = await getDocs(expiredQuery);
    const batch = writeBatch(db);
    let count = 0;

    expiredDocs.forEach(doc => {
      batch.update(doc.ref, {
        isActive: false,
        expiredAt: Timestamp.now()
      });
      count++;
    });

    if (count > 0) {
      await batch.commit();
    }

    return count;
  }

  /**
   * Get code statistics (for admin dashboard)
   */
  async getCodeStatistics(): Promise<{
    totalCodes: number;
    activeCodes: number;
    expiredCodes: number;
    customCodes: number;
    averageLookupTime: number;
  }> {
    const codesQuery = query(collection(db, 'sessionCodes'));
    const codesDocs = await getDocs(codesQuery);
    
    let totalCodes = 0;
    let activeCodes = 0;
    let expiredCodes = 0;
    let customCodes = 0;

    codesDocs.forEach(doc => {
      const data = doc.data() as SessionCode;
      totalCodes++;
      
      if (data.isActive && !this.isCodeExpired(data)) {
        activeCodes++;
      } else {
        expiredCodes++;
      }
      
      if (data.isCustom) {
        customCodes++;
      }
    });

    return {
      totalCodes,
      activeCodes,
      expiredCodes,
      customCodes,
      averageLookupTime: 50 // Mock value, would track actual times in production
    };
  }

  /**
   * Save session code mapping (alias for reserveCode)
   */
  async saveSessionCodeMapping(mapping: { code: string; sessionId: string; isCustom?: boolean }): Promise<void> {
    await this.reserveCode(mapping.code, mapping.sessionId, mapping.isCustom ?? false);
  }

  /**
   * Look up code information (returns full code data instead of just sessionId)
   */
  async lookupCode(code: string): Promise<SessionCode | null> {
    try {
      // Check cache first
      const cached = this.getCachedCode(code);
      if (cached) {
        return cached;
      }

      // Query Firestore
      const codeDoc = await getDoc(doc(db, 'sessionCodes', code));

      if (!codeDoc.exists()) {
        return null;
      }

      const codeData = codeDoc.data() as SessionCode;

      // Update cache
      // this.updateCache(code, codeData);

      return codeData.isActive && !this.isCodeExpired(codeData) ? codeData : null;
    } catch (error) {
      console.error('Error looking up code:', error);
      return null;
    }
  }
}

// Export singleton instance
export const sessionCodeService = new SessionCodeService();

// Export types
export type { SessionCode, CodeGenerationOptions };
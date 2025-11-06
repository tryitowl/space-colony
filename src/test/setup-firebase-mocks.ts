import { vi } from 'vitest';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  collection: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  endBefore: vi.fn(),
  onSnapshot: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date(), toMillis: () => Date.now() })),
    fromDate: vi.fn((date) => ({ toDate: () => date, toMillis: () => date.getTime() })),
  },
  arrayUnion: vi.fn((...args) => ({ _type: 'arrayUnion', values: args })),
  arrayRemove: vi.fn((...args) => ({ _type: 'arrayRemove', values: args })),
}));

// Mock Firebase Realtime Database
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(),
  ref: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  push: vi.fn(),
  onValue: vi.fn(),
  off: vi.fn(),
  child: vi.fn(),
  serverTimestamp: vi.fn(),
}));

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));

// Mock Firebase Analytics
vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  logEvent: vi.fn(),
}));

// Mock Firebase App
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

// Mock Firebase config with all exports
vi.mock('../firebase/config', () => ({
  default: {},
  analytics: {},
  firestore: {},
  realtimeDb: {},
  auth: {},
  functions: {},
  // Aliases used in some services
  db: {},
  rtdb: {},
}));

// Mock the import.meta.env for tests
// This is handled by Vite during testing, so we don't need to set it up manually
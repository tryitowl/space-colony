// Mock hoisting - these must be at the top before any imports
import { vi } from 'vitest';

// First define the mock functions so they can be accessed by vi.mocked()
const firestoreMocks = {
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
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(),
  Timestamp: {
    now: vi.fn(),
    fromDate: vi.fn(),
  },
  writeBatch: vi.fn(),
  runTransaction: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  increment: vi.fn(),
};

const realtimeMocks = {
  ref: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  push: vi.fn(),
  onValue: vi.fn(),
  off: vi.fn(),
  child: vi.fn(),
  serverTimestamp: vi.fn(),
  getDatabase: vi.fn(() => ({})),
};

const authMocks = {
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  currentUser: null,
};

// Setup global Firebase mocks before any imports
vi.mock('../firebase/config', () => ({
  db: {},
  firestore: {},
  realtimeDb: {},
  rtdb: {},
  auth: {},
}));

vi.mock('firebase/firestore', () => firestoreMocks);
vi.mock('firebase/database', () => realtimeMocks);
vi.mock('firebase/auth', () => authMocks);

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach } from 'vitest';
import { setupTestEnv } from './setup-test-env';

// Setup test environment including Firebase mocks
const testEnv = setupTestEnv();

// Configure default behaviors for mocks
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  
  // Setup default Firestore behaviors
  firestoreMocks.doc.mockImplementation((db: any, ...pathSegments: string[]) => ({
    id: pathSegments[pathSegments.length - 1],
    path: pathSegments.join('/'),
  }));
  
  firestoreMocks.collection.mockImplementation((db: any, path: string) => ({
    path,
    doc: firestoreMocks.doc,
  }));
  
  firestoreMocks.getDoc.mockResolvedValue(testEnv.mockSnapshot({}));
  firestoreMocks.getDocs.mockResolvedValue(testEnv.mockQuerySnapshot([]));
  firestoreMocks.setDoc.mockResolvedValue(undefined);
  firestoreMocks.updateDoc.mockResolvedValue(undefined);
  firestoreMocks.deleteDoc.mockResolvedValue(undefined);
  firestoreMocks.addDoc.mockResolvedValue({ id: 'new-doc-id' });
  
  firestoreMocks.query.mockImplementation((...args) => args[0]);
  firestoreMocks.where.mockReturnValue({});
  firestoreMocks.orderBy.mockReturnValue({});
  firestoreMocks.limit.mockReturnValue({});
  
  firestoreMocks.onSnapshot.mockImplementation((query, callback) => {
    callback(testEnv.mockQuerySnapshot([]));
    return vi.fn();
  });
  
  firestoreMocks.serverTimestamp.mockReturnValue(testEnv.mockServerTimestamp());
  firestoreMocks.Timestamp.now.mockReturnValue(testEnv.mockTimestamp);
  firestoreMocks.Timestamp.fromDate.mockReturnValue(testEnv.mockTimestamp);
  
  firestoreMocks.writeBatch.mockReturnValue(testEnv.mockBatch());
  firestoreMocks.runTransaction.mockImplementation(testEnv.mockTransaction);
  
  firestoreMocks.arrayUnion.mockImplementation((...elements) => ({ _arrayUnion: elements }));
  firestoreMocks.arrayRemove.mockImplementation((...elements) => ({ _arrayRemove: elements }));
  firestoreMocks.increment.mockImplementation((n) => ({ _increment: n }));
  
  // Setup default Realtime Database behaviors
  realtimeMocks.ref.mockImplementation((db: any, path?: string) => ({ path }));
  realtimeMocks.get.mockResolvedValue({
    exists: () => true,
    val: () => ({}),
    key: 'mock-key',
  });
  realtimeMocks.set.mockResolvedValue(undefined);
  realtimeMocks.update.mockResolvedValue(undefined);
  realtimeMocks.remove.mockResolvedValue(undefined);
  realtimeMocks.push.mockReturnValue({ key: 'new-push-key' });
  
  realtimeMocks.onValue.mockImplementation((ref, callback) => {
    callback({
      exists: () => true,
      val: () => ({}),
      key: ref.path,
    });
    return vi.fn();
  });
  
  realtimeMocks.off.mockImplementation(() => {});
  realtimeMocks.child.mockImplementation((ref, path) => ({ ...ref, path: `${ref.path}/${path}` }));
  realtimeMocks.serverTimestamp.mockReturnValue({ '.sv': 'timestamp' });
  realtimeMocks.getDatabase.mockReturnValue({});
  
  // Setup default Auth behaviors
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    getIdToken: vi.fn().mockResolvedValue('mock-token'),
  };
  
  authMocks.currentUser = mockUser;
  authMocks.onAuthStateChanged.mockImplementation((auth, callback) => {
    callback(mockUser);
    return vi.fn();
  });
  authMocks.signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
  authMocks.signOut.mockResolvedValue(undefined);
});

// Make test environment utilities globally available
(globalThis as any).mockTimestamp = testEnv.mockTimestamp;
(globalThis as any).mockServerTimestamp = testEnv.mockServerTimestamp;
(globalThis as any).mockDoc = testEnv.mockDoc;
(globalThis as any).mockCollection = testEnv.mockCollection;
(globalThis as any).mockBatch = testEnv.mockBatch;
(globalThis as any).mockTransaction = testEnv.mockTransaction;
(globalThis as any).mockSnapshot = testEnv.mockSnapshot;
(globalThis as any).mockQuerySnapshot = testEnv.mockQuerySnapshot;

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Audio
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  volume: 1,
  currentTime: 0,
}));

// Mock WebGL context for Three.js components
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      getExtension: vi.fn(),
      getParameter: vi.fn(),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      viewport: vi.fn(),
      clear: vi.fn(),
      clearColor: vi.fn(),
    };
  }
  return null;
});
import { vi } from 'vitest';

// Setup global test environment
export const setupTestEnv = () => {
  // Mock import.meta.env
  Object.defineProperty(import.meta, 'env', {
    value: {
      VITE_FIREBASE_API_KEY: 'test-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'test-auth-domain',
      VITE_FIREBASE_DATABASE_URL: 'test-database-url',
      VITE_FIREBASE_PROJECT_ID: 'test-project-id',
      VITE_FIREBASE_STORAGE_BUCKET: 'test-storage-bucket',
      VITE_FIREBASE_MESSAGING_SENDER_ID: 'test-sender-id',
      VITE_FIREBASE_APP_ID: 'test-app-id',
      VITE_FIREBASE_MEASUREMENT_ID: 'test-measurement-id',
      MODE: 'test',
      DEV: false,
      PROD: false,
      SSR: false,
    },
    configurable: true,
  });

  // Common mocked functions that can be imported
  const mockTimestamp = { toDate: () => new Date(), toMillis: () => Date.now() };
  
  return {
    mockTimestamp,
    mockServerTimestamp: () => mockTimestamp,
    mockDoc: (path: string) => ({ id: path.split('/').pop(), path }),
    mockCollection: (path: string) => ({ path }),
    mockBatch: () => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    }),
    mockTransaction: (callback: any) => {
      const transaction = {
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      return Promise.resolve(callback(transaction));
    },
    mockSnapshot: (data: any, exists = true) => ({
      exists: () => exists,
      data: () => data,
      id: data?.id || 'mock-id',
      ref: { id: data?.id || 'mock-id' },
    }),
    mockQuerySnapshot: (docs: any[]) => ({
      docs: docs.map(doc => ({
        id: doc.id,
        data: () => doc,
        exists: () => true,
      })),
      empty: docs.length === 0,
      size: docs.length,
    }),
  };
};

// Firebase mock factories for consistent mocking across tests
export const createFirestoreMocks = () => {
  const mocks = setupTestEnv();
  
  // Create a more complete mock doc function that returns a proper reference
  const mockDocRef = (path: string) => {
    const segments = path.split('/');
    return {
      id: segments[segments.length - 1],
      path,
      parent: { path: segments.slice(0, -1).join('/') }
    };
  };
  
  return {
    // Firestore functions
    doc: vi.fn((db: any, ...pathSegments: string[]) => {
      const path = pathSegments.filter(Boolean).join('/');
      return mockDocRef(path);
    }),
    collection: vi.fn((db: any, path: string) => ({
      ...mocks.mockCollection(path),
      doc: vi.fn((id: string) => mockDocRef(`${path}/${id}`))
    })),
    getDoc: vi.fn().mockResolvedValue(mocks.mockSnapshot({})),
    getDocs: vi.fn().mockResolvedValue(mocks.mockQuerySnapshot([])),
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    addDoc: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
    query: vi.fn((...args) => args[0]), // Return the collection/query for chaining
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
    limit: vi.fn(() => ({})),
    onSnapshot: vi.fn((query, callback) => {
      callback(mocks.mockQuerySnapshot([]));
      return vi.fn(); // unsubscribe function
    }),
    serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
    Timestamp: {
      now: () => mocks.mockTimestamp,
      fromDate: (date: Date) => mocks.mockTimestamp,
    },
    writeBatch: vi.fn(() => mocks.mockBatch()),
    runTransaction: vi.fn(mocks.mockTransaction),
    arrayUnion: vi.fn((...elements) => ({ _arrayUnion: elements })),
    arrayRemove: vi.fn((...elements) => ({ _arrayRemove: elements })),
    increment: vi.fn((n) => ({ _increment: n })),
  };
};

export const createRealtimeDatabaseMocks = () => {
  return {
    ref: vi.fn((db: any, path?: string) => ({ path })),
    get: vi.fn().mockResolvedValue({
      exists: () => true,
      val: () => ({}),
      key: 'mock-key',
    }),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    push: vi.fn().mockReturnValue({ key: 'new-push-key' }),
    onValue: vi.fn((ref, callback) => {
      callback({
        exists: () => true,
        val: () => ({}),
        key: ref.path,
      });
      return vi.fn(); // unsubscribe function
    }),
    off: vi.fn(),
    child: vi.fn((ref, path) => ({ ...ref, path: `${ref.path}/${path}` })),
    serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
    getDatabase: vi.fn(() => ({})),
  };
};

export const createAuthMocks = () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    getIdToken: vi.fn().mockResolvedValue('mock-token'),
  };

  return {
    onAuthStateChanged: vi.fn((auth, callback) => {
      callback(mockUser);
      return vi.fn(); // unsubscribe function
    }),
    signInWithEmailAndPassword: vi.fn().mockResolvedValue({ user: mockUser }),
    signOut: vi.fn().mockResolvedValue(undefined),
    currentUser: mockUser,
  };
};

// Complete Firebase config mock
export const createFirebaseConfigMock = () => {
  return {
    db: {},
    firestore: {},
    realtimeDb: {},
    rtdb: {},
    auth: {},
  };
};
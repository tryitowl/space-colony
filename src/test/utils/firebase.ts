import { vi } from 'vitest';
import type { 
  DocumentData, 
  DocumentReference, 
  DocumentSnapshot,
  QuerySnapshot,
  CollectionReference,
  Firestore,
  Unsubscribe,
  WriteBatch,
  Transaction,
  FieldValue,
  Timestamp,
} from 'firebase/firestore';
import type { User, Auth } from 'firebase/auth';
import type { Database, DataSnapshot, DatabaseReference } from 'firebase/database';

// Mock Firestore document
export const mockDoc = (id: string, data: DocumentData): DocumentSnapshot => ({
  id,
  exists: () => true,
  data: () => data,
  get: (field: string) => data[field],
  ref: { id } as DocumentReference,
} as DocumentSnapshot);

// Mock Firestore query snapshot
export const mockQuerySnapshot = (docs: DocumentSnapshot[]): QuerySnapshot => ({
  docs,
  size: docs.length,
  empty: docs.length === 0,
  forEach: (callback: (doc: DocumentSnapshot) => void) => docs.forEach(callback),
} as QuerySnapshot);

// Mock Firestore collection
export const mockCollection = (): CollectionReference => ({
  id: 'mock-collection',
  path: 'mock/collection',
  add: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
  doc: vi.fn().mockReturnValue(mockDocumentReference()),
} as unknown as CollectionReference);

// Mock Firestore document reference
export const mockDocumentReference = (id: string = 'mock-doc'): DocumentReference => ({
  id,
  path: `mock/collection/${id}`,
  get: vi.fn().mockResolvedValue(mockDoc(id, {})),
  set: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn().mockReturnValue(() => {}),
} as unknown as DocumentReference);

// Mock Firestore instance
export const mockFirestore = (): Firestore => ({
  collection: vi.fn().mockReturnValue(mockCollection()),
  doc: vi.fn().mockReturnValue(mockDocumentReference()),
  batch: vi.fn().mockReturnValue(mockWriteBatch()),
  runTransaction: vi.fn().mockImplementation((fn) => fn(mockTransaction())),
} as unknown as Firestore);

// Mock WriteBatch
export const mockWriteBatch = (): WriteBatch => ({
  set: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  commit: vi.fn().mockResolvedValue(undefined),
} as unknown as WriteBatch);

// Mock Transaction
export const mockTransaction = (): Transaction => ({
  get: vi.fn().mockResolvedValue(mockDoc('tx-doc', {})),
  set: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
} as unknown as Transaction);

// Mock Auth user
export const mockUser = (overrides: Partial<User> = {}): User => ({
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  getIdToken: vi.fn().mockResolvedValue('mock-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({ token: 'mock-token' }),
  reload: vi.fn().mockResolvedValue(undefined),
  toJSON: vi.fn(),
  delete: vi.fn().mockResolvedValue(undefined),
  ...overrides,
} as User);

// Mock Auth instance
export const mockAuth = (): Auth => ({
  currentUser: mockUser(),
  onAuthStateChanged: vi.fn().mockReturnValue(() => {}),
  signInWithEmailAndPassword: vi.fn().mockResolvedValue({ user: mockUser() }),
  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({ user: mockUser() }),
  signOut: vi.fn().mockResolvedValue(undefined),
} as unknown as Auth);

// Mock Realtime Database
export const mockDatabase = (): Database => ({
  ref: vi.fn().mockReturnValue(mockDatabaseReference()),
} as unknown as Database);

// Mock Database Reference
export const mockDatabaseReference = (path: string = 'mock/path'): DatabaseReference => ({
  key: 'mock-key',
  path,
  child: vi.fn().mockReturnValue(mockDatabaseReference(`${path}/child`)),
  on: vi.fn().mockReturnValue(() => {}),
  off: vi.fn(),
  once: vi.fn().mockResolvedValue(mockDataSnapshot()),
  set: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  push: vi.fn().mockReturnValue(mockDatabaseReference(`${path}/pushed`)),
  orderByChild: vi.fn().mockReturnThis(),
  orderByKey: vi.fn().mockReturnThis(),
  orderByValue: vi.fn().mockReturnThis(),
  limitToFirst: vi.fn().mockReturnThis(),
  limitToLast: vi.fn().mockReturnThis(),
  startAt: vi.fn().mockReturnThis(),
  endAt: vi.fn().mockReturnThis(),
  equalTo: vi.fn().mockReturnThis(),
} as unknown as DatabaseReference);

// Mock Data Snapshot
export const mockDataSnapshot = (val: any = {}): DataSnapshot => ({
  val: () => val,
  exists: () => val !== null,
  key: 'mock-key',
  ref: mockDatabaseReference(),
  forEach: vi.fn(),
  hasChild: vi.fn().mockReturnValue(false),
  hasChildren: vi.fn().mockReturnValue(false),
  numChildren: () => 0,
  child: vi.fn().mockReturnValue(mockDataSnapshot()),
  toJSON: () => val,
  exportVal: () => val,
  getPriority: () => null,
} as unknown as DataSnapshot);

// Mock Timestamp
export const mockTimestamp = (seconds: number = Date.now() / 1000): Timestamp => ({
  seconds,
  nanoseconds: 0,
  toDate: () => new Date(seconds * 1000),
  toMillis: () => seconds * 1000,
  isEqual: vi.fn().mockReturnValue(false),
  valueOf: () => ({ seconds, nanoseconds: 0 }),
} as Timestamp);

// Mock serverTimestamp function
export const mockServerTimestamp = () => mockTimestamp();

// Mock FieldValue
export const mockFieldValue = {
  serverTimestamp: vi.fn().mockReturnValue('SERVER_TIMESTAMP'),
  increment: vi.fn().mockReturnValue('INCREMENT'),
  arrayUnion: vi.fn().mockReturnValue('ARRAY_UNION'),
  arrayRemove: vi.fn().mockReturnValue('ARRAY_REMOVE'),
  delete: vi.fn().mockReturnValue('DELETE'),
};

// Helper to create a mock unsubscribe function
export const mockUnsubscribe = (): Unsubscribe => vi.fn();

// Helper to wait for async updates
export const waitForFirebaseUpdate = () => new Promise(resolve => setTimeout(resolve, 0));
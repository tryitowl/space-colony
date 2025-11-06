# Session Code System Documentation

## Overview

The Session Code System provides a memorable, secure way for players to join game sessions using short codes in the format `XXXX-YYY` (e.g., "C725-ADA", "MSFT-CEO").

## Code Format

### Structure: `XXXX-YYY`
- **Event Code (XXXX)**: 4 alphanumeric characters
  - Can be auto-generated or custom
  - Examples: "C725", "MSFT", "2024"
  
- **Galaxy Code (YYY)**: 3 alphanumeric characters
  - Auto-generated for pronounceability (consonant-vowel-consonant)
  - Examples: "ADA", "MLK", "CEO"

### Examples
- Corporate Events: `MSFT-CEO`, `GOOGL-AI1`, `AMZN-AWS`
- Standard Games: `C725-ADA`, `X9B2-MLK`, `2024-JAN`
- Themed Events: `NASA-MRS`, `SPCE-ISS`, `MOON-LND`

## Features

### 1. Automatic Code Generation
- Generates unique, memorable codes
- Avoids offensive content
- Handles collision detection
- Creates pronounceable galaxy codes

### 2. Custom Code Support
- Admins can set custom codes for branded events
- Validates format and availability
- Tracks admin actions for audit

### 3. Performance Optimization
- **<100ms lookup time** guaranteed
- In-memory caching for frequent lookups
- Efficient Firestore indexing
- Batch operations for maintenance

### 4. Code Lifecycle
- Codes expire after 24 hours of inactivity
- Automatic cleanup of expired codes
- Code reservation system prevents duplicates
- History tracking for replaced codes

## API Usage

### Generating a Code

```typescript
// Auto-generate both parts
const code = await sessionCodeService.generateSessionCode(sessionId);
// Result: "C725-ADA"

// Custom event code, auto galaxy code
const code = await sessionCodeService.generateSessionCode(sessionId, {
  eventCode: 'MSFT'
});
// Result: "MSFT-BEN"

// Fully custom code
const code = await sessionCodeService.generateSessionCode(sessionId, {
  eventCode: 'NASA',
  galaxyCode: 'MRS',
  isCustom: true
});
// Result: "NASA-MRS"
```

### Looking Up a Session

```typescript
const sessionId = await sessionCodeService.lookupSessionByCode('C725-ADA');
// Returns: 'session-123' or null if not found/expired
```

### Validating Code Format

```typescript
const isValid = sessionCodeService.validateCodeFormat('C725-ADA');
// Returns: true

const isValid = sessionCodeService.validateCodeFormat('INVALID');
// Returns: false
```

### Admin Functions

```typescript
// Set custom code
await sessionCodeService.setCustomCode(
  sessionId,
  'MSFT-CEO',
  adminId
);

// Get statistics
const stats = await sessionCodeService.getCodeStatistics();
// Returns: { totalCodes, activeCodes, expiredCodes, customCodes, averageLookupTime }

// Clean up expired codes
const count = await sessionCodeService.cleanupExpiredCodes();
// Returns: number of codes cleaned up
```

## Integration Examples

### 1. Join Game Flow

```typescript
// In JoinGame component
const handleJoinGame = async (inputCode: string) => {
  try {
    // Validate format
    if (!sessionCodeService.validateCodeFormat(inputCode)) {
      throw new Error('Please enter a code like "C725-ADA"');
    }
    
    // Look up session
    const sessionId = await sessionCodeService.lookupSessionByCode(inputCode);
    
    if (!sessionId) {
      throw new Error('Invalid or expired code');
    }
    
    // Navigate to team selection
    navigate(`/session/${sessionId}/select-team`);
  } catch (error) {
    setError(getCodeErrorMessage(error));
  }
};
```

### 2. Create Session Flow

```typescript
// In CreateSession component
const handleCreateSession = async (config: SessionConfig) => {
  try {
    // Create session in Firestore
    const sessionId = await createSession(config);
    
    // Generate code
    const code = await sessionCodeService.generateSessionCode(sessionId, {
      eventCode: config.customEventCode // optional
    });
    
    // Display to facilitator
    setSessionCode(code);
    setShareMessage(`Players can join with code: ${code}`);
  } catch (error) {
    setError('Failed to create session');
  }
};
```

### 3. Admin Dashboard

```typescript
// In AdminDashboard component
const loadCodeStats = async () => {
  const stats = await sessionCodeService.getCodeStatistics();
  
  setDashboardData({
    activeSessions: stats.activeCodes,
    utilizationRate: (stats.activeCodes / stats.totalCodes) * 100,
    performanceHealth: stats.averageLookupTime < 100 ? 'Good' : 'Warning'
  });
};
```

## Error Handling

The service provides specific error messages for common scenarios:

- **Invalid Format**: "Invalid code format. Must be XXXX-YYY format."
- **Code Exists**: "Code already in use. Please choose a different code."
- **Offensive Content**: "Code contains inappropriate content."
- **Not Found**: "Session not found or has expired."
- **Generation Failed**: "Unable to generate unique code. Please try again."

## Performance Characteristics

- **Cold Lookup**: <100ms (includes Firestore query)
- **Cached Lookup**: <10ms (memory access only)
- **Code Generation**: <50ms average
- **Batch Operations**: Optimized for 1000+ concurrent lookups
- **Cache TTL**: 1 minute (configurable)

## Security Considerations

1. **Offensive Content Filter**: Prevents inappropriate codes
2. **Collision Prevention**: Ensures unique codes
3. **Expiration**: Codes expire after 24 hours
4. **Admin Audit**: All custom code changes are logged
5. **Case Sensitivity**: Codes are case-insensitive for user input

## Database Schema

```typescript
// Firestore collection: sessionCodes
{
  eventCode: "C725",
  galaxyCode: "ADA",
  fullCode: "C725-ADA",
  sessionId: "session-123",
  reservedAt: Timestamp,
  expiresAt: Timestamp,
  isCustom: false,
  isActive: true,
  replacedBy?: "NEW1-CDE",
  replacedAt?: Timestamp,
  expiredAt?: Timestamp
}
```

## Maintenance

### Automatic Tasks
- Expired codes are marked inactive during lookups
- Cache refreshes every minute
- Performance metrics tracked automatically

### Manual Tasks
- Run `cleanupExpiredCodes()` daily
- Monitor `averageLookupTime` for performance
- Review custom code usage in admin dashboard

## Testing

The service includes comprehensive tests:
- Unit tests for all methods
- Performance tests ensuring <100ms lookups
- Load tests with 1000+ concurrent operations
- Integration examples for common use cases

Run tests with:
```bash
npm test src/services/__tests__/sessionCodeService.test.ts
npm test src/services/__tests__/sessionCodeService.performance.test.ts
```
# Team Data Storage Analysis Report
## Space Colony Exchange - August 21, 2025

## Executive Summary

The codebase has **three conflicting patterns** for storing team data in Firebase, creating significant risk for data inconsistency and runtime errors. This document analyzes the current state and provides recommendations for standardization.

## Current Storage Patterns

### Pattern A: Root Collection Pattern
**Path**: `/teams/{teamId}`  
**Used By**: `galaxyService.ts`, `sessionService.ts` (for queries)  
**Structure**:
```typescript
{
  id: string,
  sessionId: string,
  galaxyId: string,
  name: string,
  resources: Resources,
  // ... other team fields
}
```

**Example Usage**:
```typescript
// galaxyService.ts
const teamsQuery = query(
  collection(db, 'teams'),
  where('galaxyId', '==', galaxyId)
);
```

### Pattern B: Session Subcollection Pattern
**Path**: `/sessions/{sessionId}/teams/{teamId}`  
**Used By**: `intelService.ts`, `intelGenerationService.ts`, `tradeAnalyticsService.ts`  
**Structure**: Same as Pattern A

**Example Usage**:
```typescript
// intelService.ts
const teamsQuery = query(
  collection(firestore, 'sessions', sessionId, 'teams'),
  where('isAIControlled', '==', true)
);
```

### Pattern C: Embedded Array Pattern
**Path**: `/sessions/{sessionId}` with `teams` array field  
**Used By**: `GameService.ts`, `tradingService.ts`, `sessionService.ts` (for creation)  
**Structure**:
```typescript
{
  // Session fields
  teams: Colony[], // Array of team objects
}
```

**Example Usage**:
```typescript
// GameService.ts
const sessionData: GameSession = {
  id: sessionId,
  teams: [], // Embedded array
};
```

## Service-by-Service Analysis

### sessionService.ts
- **Creates**: Teams array in session document (Pattern C)
- **Queries**: Root teams collection (Pattern A)
- **Critical Bug**: Creates teams in one place but queries from another

### galaxyService.ts
- **Expects**: Root teams collection (Pattern A)
- **Updates**: Using batch operations on root collection
- **Multi-galaxy support**: Relies on galaxyId field

### GameService.ts
- **Uses**: Embedded teams array (Pattern C)
- **Updates**: Entire teams array on each change (inefficient)
- **Legacy**: Appears to be older implementation

### tradingService.ts
- **Reads**: Teams from session.teams array (Pattern C)
- **Dependencies**: Expects GameService pattern

### intelService.ts & intelGenerationService.ts
- **Expects**: Session subcollection (Pattern B)
- **Updates**: Individual team documents in subcollection
- **Modern**: Appears to be newer implementation

### tradeAnalyticsService.ts
- **Uses**: Session subcollection (Pattern B)
- **Queries**: Complex analytics queries on subcollection

## Impact Analysis

### 1. Data Integrity Risks
- Teams created via GameService won't be found by galaxyService
- Intel services won't find teams created by sessionService
- Updates in one location won't reflect in others

### 2. Query Failures
- `sessionService.getSessionTeams()` will return empty if teams are embedded
- Intel generation will fail if teams aren't in subcollection
- Galaxy operations will fail if teams aren't in root collection

### 3. Performance Issues
- Pattern C requires updating entire teams array for single team changes
- No ability to query individual teams efficiently
- Document size limits could be exceeded with large sessions

### 4. Consistency Issues
- Different services have different views of team data
- Race conditions when multiple services update teams
- No single source of truth

## Recommendations

### 1. Standardize on Root Collection Pattern (Pattern A)

**Advantages**:
- Supports multi-galaxy architecture
- Efficient individual team updates
- Better query flexibility
- Scales well with session size

**Implementation**:
```typescript
// Standard team document structure
interface TeamDocument {
  id: string;
  sessionId: string;
  galaxyId: string;
  eventId: string;
  name: string;
  colonyType: ColonyType;
  resources: Resources;
  players: TeamPlayer[];
  isAIControlled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2. Migration Plan

1. **Phase 1**: Create migration utility
   - Scan all sessions for embedded teams
   - Copy teams to root collection
   - Maintain backward compatibility

2. **Phase 2**: Update all services
   - Modify all services to use root collection
   - Add deprecation warnings for old patterns
   - Update Firestore security rules

3. **Phase 3**: Data cleanup
   - Remove embedded teams arrays
   - Delete subcollection teams
   - Verify data integrity

### 3. Service Updates Required

- **sessionService.ts**: Remove teams array creation, use root collection
- **GameService.ts**: Major refactor to use root collection
- **tradingService.ts**: Update to query root collection
- **intelService.ts**: Change from subcollection to root collection
- **intelGenerationService.ts**: Update all team references
- **tradeAnalyticsService.ts**: Modify queries for root collection

### 4. Create Shared Team Access Utility

```typescript
// services/teamDataService.ts
class TeamDataService {
  async getTeam(teamId: string): Promise<Colony | null> {
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    return teamDoc.exists() ? teamDoc.data() as Colony : null;
  }

  async getSessionTeams(sessionId: string): Promise<Colony[]> {
    const q = query(
      collection(db, 'teams'),
      where('sessionId', '==', sessionId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Colony);
  }

  async updateTeam(teamId: string, updates: Partial<Colony>): Promise<void> {
    await updateDoc(doc(db, 'teams', teamId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }
}
```

## Security Rules Update

```javascript
// Firestore Security Rules
match /teams/{teamId} {
  allow read: if request.auth != null;
  
  allow write: if request.auth != null && (
    // Facilitator can update any team in their event
    isFacilitator(resource.data.eventId) ||
    // Team members can update their own team
    isTeamMember(teamId)
  );
}
```

## Timeline Estimate

- **Analysis & Planning**: 1 day (COMPLETE)
- **Migration Utility**: 1 day
- **Service Updates**: 2-3 days
- **Testing & Verification**: 1 day
- **Total**: 5-6 days

## Risk Mitigation

1. **Backward Compatibility**: Maintain read support for all patterns during migration
2. **Feature Flags**: Use flags to switch between old and new implementations
3. **Monitoring**: Add logging to track which pattern each service uses
4. **Rollback Plan**: Keep backup of data before migration

## Conclusion

The current multi-pattern approach is unsustainable and poses significant risks. Standardizing on the root collection pattern will provide the best foundation for future features while resolving current inconsistencies. This migration should be prioritized as it affects core game functionality.
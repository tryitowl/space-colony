# Intel Storage Analysis

## Current Storage Structure

### Location
Intel items are stored directly within the `Resources` interface in `team.resources`:

```typescript
export interface Resources {
  // ... other resources ...
  
  // Information (Intel Arrays)
  marketIntel: IntelItem[];
  surveyReports: IntelItem[];
  crisisWarnings: IntelItem[];
}
```

### IntelItem Structure
```typescript
export interface IntelItem {
  id: string;
  title: string;
  content: string;
  value: number;
  distributionCount: number;
  roundGenerated: number;
  source: 'scout' | 'communication' | 'traded';
}
```

## Storage Impact Analysis

### Document Size Considerations

1. **Intel Generation Rate**
   - Base: 1 intel per round per scout level
   - With communication array: 2x-3x multiplier
   - Max: 8 intel pieces per generation (capped)
   - Rounds: 5 total rounds

2. **Potential Intel Accumulation**
   - Worst case per team: 8 intel × 5 rounds = 40 intel items
   - Plus traded intel from other teams
   - Realistic max: ~50-60 intel items per team

3. **Size Per Intel Item**
   - id: ~30 bytes
   - title: ~50 bytes
   - content: ~200-500 bytes (main concern)
   - value: 8 bytes
   - distributionCount: 8 bytes
   - roundGenerated: 8 bytes
   - source: ~10 bytes
   - **Total per item**: ~350-650 bytes

4. **Total Intel Storage Impact**
   - Per team worst case: 60 items × 650 bytes = 39KB
   - Per session (8 teams): 312KB
   - Per galaxy (10 sessions): 3.12MB

### Firestore Document Limits
- Maximum document size: 1MB
- Team document includes:
  - Basic info: ~500 bytes
  - Resources (numbers): ~200 bytes
  - Players array: ~500 bytes per player (max 9)
  - Intel arrays: ~39KB worst case
  - **Total team document**: ~45KB worst case (well under 1MB limit)

## Performance Considerations

### Read/Write Operations
1. **Every team update includes all intel data**
   - Increases bandwidth usage
   - Slower document reads/writes
   - More data transferred to clients

2. **Query Efficiency**
   - Cannot query intel items directly
   - Must fetch entire team to access intel
   - Cannot filter intel server-side

3. **Real-time Updates**
   - Larger documents = more data over websocket
   - Intel changes trigger full team document updates
   - Affects all team listeners

## Alternative Storage Approaches

### Option 1: Subcollection
```
/teams/{teamId}/intel/{intelId}
```
**Pros:**
- Direct queries on intel
- Smaller team documents
- Can paginate intel
- Server-side filtering

**Cons:**
- Additional reads for intel
- More complex data fetching
- Requires migration

### Option 2: Separate Intel Collection
```
/intel/{intelId}
{
  teamId: string,
  sessionId: string,
  ...intelData
}
```
**Pros:**
- Global intel queries
- Better for analytics
- Smaller documents

**Cons:**
- Requires compound queries
- More complex access control
- Significant refactoring

### Option 3: Hybrid Approach
- Keep recent intel (current round) in team document
- Archive older intel to subcollection
- Best of both worlds

## Recommendations

### Current Storage is Acceptable Because:
1. Document size remains well under limits (45KB vs 1MB)
2. Intel is always accessed with team data
3. Simplifies security rules
4. No additional reads required

### Optimization Opportunities:
1. **Compress intel content** - Reduce from 500 to 200 bytes
2. **Archive old intel** - Move rounds 1-2 intel after round 3
3. **Limit intel retention** - Cap at 30 items per team
4. **Lazy load intel details** - Store only IDs in team, fetch content on demand

### When to Consider Migration:
- If team documents exceed 100KB regularly
- If intel-specific queries become necessary
- If real-time performance degrades
- If intel trading becomes primary feature

## Conclusion

The current storage approach is sufficient for the game's scope. The 39KB worst-case intel storage is only 4% of Firestore's document limit. The simplicity of embedded storage outweighs the minor performance impact for this use case.

However, implementing content compression and intel caps would be prudent optimizations that don't require architectural changes.
# Space Colony Trade - Data Flow Analysis

## Application Architecture Overview

The Space Colony Trade application follows a React-based front-end architecture with Firebase as the backend. The application uses both Firestore (for persistent data) and Realtime Database (for live updates and real-time interactions).

## Key Components and Data Flow

### 1. Core Application Structure

- **App.tsx**: Main application component handling routing between different pages
- **GameProvider/GameContext**: Central state management for session, team, and player data
- **Layout**: Wraps game-related pages with navigation and common UI elements

### 2. Authentication & Session Flow

```
User → JoinGame Page → gameService.joinGame() → Firebase Authentication 
→ GameContext (stores session/team/player data) → Dashboard
```

1. Users enter game codes on the JoinGame page
2. The `gameService.joinGame()` function validates the code and retrieves session data
3. Upon successful validation, the user is redirected to the main Dashboard
4. The GameContext maintains the authenticated state and relevant game data

### 3. Trading System Data Flow

#### Component Hierarchy
```
Trading Page
└── TradingModal
    ├── ResourceSelector
    │   └── TradeBundle (data structure)
    ├── NegotiationPanel
    ├── TradeTimer
    └── TradeConfirmation
```

#### Data Flow for Creating Trades
```
1. User selects partner in AvailableColoniesGrid
2. TradingModal opens with ResourceSelector
3. User configures trade bundles (offering & requesting)
4. TradingService.validateTrade() validates the trade bundles
5. TradingService.createTradeOffer() submits to Firebase
6. Firebase Firestore (trades collection) & Realtime Database updated
7. Partner receives trade notification via real-time subscription
```

#### Data Flow for Responding to Trades
```
1. TradeNotifications component shows incoming trade via real-time subscription
2. User opens TradingModal to view trade details
3. User selects response (accept/reject/counter)
4. TradingService processes the response:
   - accept → acceptTradeOffer() → updates resources for both teams
   - reject → rejectTradeOffer() → updates trade status
   - counter → createCounterOffer() → creates new trade based on original
5. Both teams receive updates via real-time subscriptions
```

### 4. Resource Management

```
GameService/TradingService → Team Resources → ResourceDisplay Components → UI
```

- Resources are stored in Team documents in Firestore
- For real-time updates, resource data is mirrored to Realtime Database
- Resource changes (from trades, round processing, etc.) are synced between both databases
- UI components subscribe to real-time resource updates

### 5. Game State Management

```
AdminDashboard → gameService.updateGameState() → Firestore/Realtime DB → GameContext → UI Components
```

1. Event facilitators control game phases through AdminDashboard
2. Phase changes update both Firestore and Realtime Database
3. All clients receive updates through real-time subscriptions
4. The UI adapts to different game phases (e.g., trading only allowed in certain phases)

## Database Structure

### Firestore Collections
- **events**: Metadata about game events
- **sessions**: Game session data, including teams and game state
- **teams**: Team data, including resources, players, and history
- **trades**: Trade offers and completed trades
- **intel**: Intel pieces that can be discovered/traded

### Realtime Database Structure
```
|- sessions
|  |- {sessionId}
|     |- gameState
|        |- currentPhase
|        |- roundStartTime
|        |- roundEndTime
|        |- lastUpdated
|
|- teams
   |- {teamId}
      |- name
      |- colonyType
      |- resources
      |- status
      |- isEliminated
      |- lastUpdated
```

## Service Integration

The application's services are structured to handle different aspects of the game:

1. **gameService.ts**: Core game mechanics, session management, and round processing
2. **tradingService.ts**: Trading-specific functionality, trade validation, and resource transfers
3. **adminService.ts**: Administration features for facilitators (creating games, managing sessions)

These services interact with both databases and expose methods that components use to perform game actions.

## Enhancement Opportunities

1. **Service Integration**: Some duplication exists between services; opportunity to clean up interactions
2. **Real-time Sync**: Enhance synchronization between Firestore and Realtime Database
3. **Error Handling**: Improve error handling for network issues and conflict resolution

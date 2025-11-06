# PRD 1: Space Colony Exchange - Core Game Engine & Logic

## Introduction/Overview

The Space Colony Exchange is a negotiation-based trading game designed for corporate team-building events. Teams manage different types of space colonies, trading resources, information, and services while managing resource depletion and responding to market events. The game emphasizes strategic thinking, negotiation skills, and team collaboration through time-pressured trading scenarios.

The core game engine handles session management, real-time trading mechanics, resource tracking, and progression through 5 distinct trading rounds with escalating complexity and time pressure.

## Goals

1. **Scalable Session Management**: Support multiple concurrent events with flexible participant numbers (10-360+ players per event)
2. **Real-time Trading System**: Enable seamless negotiation-based trading with availability tracking
3. **Dynamic Resource Economy**: Implement resource depletion, generation, and market fluctuations
4. **Flexible Timing Control**: Allow facilitators to adjust round durations while maintaining game balance
5. **Seamless Reconnection**: Ensure players can rejoin sessions without disruption
6. **Intelligence Value System**: Create degrading value for shared information based on distribution

## User Stories

### Core Gameplay
- **As a player**, I want to see my colony's resource status in real-time so I can make informed trading decisions
- **As a player**, I want to initiate trades with available colonies so I can acquire needed resources
- **As a player**, I want to negotiate with counter-offers so I can get better deals
- **As a player**, I want to see which colonies are currently available for trading so I don't waste time on busy teams
- **As a team**, we want strategy time between rounds so we can plan our next moves

### Information Management
- **As a player**, I want to receive intel based on my scout investments so I can gain trading advantages
- **As a player**, I want to trade intelligence with diminishing value so strategic timing matters
- **As a player**, I want to see my trading history so I can track relationships and opportunities

### Session Management
- **As a facilitator**, I want to adjust round timings so I can fit different event durations
- **As a facilitator**, I want to monitor all sessions simultaneously so I can manage large events
- **As a player**, I want to reconnect with my game code so technical issues don't eliminate me

## Functional Requirements

### 1. Session Architecture
1.1. **Event Creation**: System must support creating events with 1-5 sessions
1.2. **Session Configuration**: Each session must contain exactly 12 teams (6 colony types × 2 teams each)
1.3. **Team Size Flexibility**: Teams must support 1-6 players with unique game codes
1.4. **Game Code Generation**: Generate unique codes in format: [Event][Session][Team][Player] (e.g., CGAB01)
1.5. **Auto-Save System**: Save all player actions and game state every 30 seconds
1.6. **Reconnection Logic**: Allow players to rejoin using game codes without losing progress

### 2. Colony Types & Starting Assets
2.1. **Mining Colony**: Minerals(20), Energy(8), Oxygen(6), Food(4), Water(3)
2.2. **Agricultural Colony**: Food(20), Water(15), Oxygen(6), Energy(4), Minerals(2)
2.3. **Research Station**: Tech(15), Energy(12), Oxygen(8), Food(4), Water(3)
2.4. **Trade Hub**: Balanced resources (8-10 each), Credits(500)
2.5. **Military Outpost**: Defense(15), Energy(10), Oxygen(8), Food(4), Water(4)
2.6. **Manufacturing Base**: Production(12), Minerals(8), Energy(8), Oxygen(6), Food(4)
2.7. **Universal Credits**: All teams start with 1000 credits for initial investments

### 3. Investment System (Pre-Round 1)
3.1. **Scout Investment**: 200-400 credits → Generate 1-3 intel pieces per round
3.2. **Production Upgrades**: 300-500 credits → +1 specialty resource generation per round
3.3. **Research Labs**: 250-400 credits → Generate 1 Tech Patent per round
3.4. **Communication Array**: 150-300 credits → Generate 1 Market Intel per round
3.5. **Emergency Reserves**: 100+ credits → Generate 0.5 basic resources per round
3.6. **Investment Validation**: Ensure total investments don't exceed 1000 credits

### 4. Resource Management
4.1. **Resource Categories**:
   - Basic Resources: Oxygen, Food, Water, Energy
   - Advanced Materials: Minerals, Alloys, Tech Components
   - Information: Market Intel, Survey Reports, Crisis Warnings
   - Services: Defense Contracts, System Repairs, Transport Routes
   - Technology: Tech Patents, Blueprints, Alien Tech

4.2. **Resource Consumption**: Deduct per round at round end:
   - Oxygen: 2 units
   - Food: 2 units
   - Energy: 3 units
   - Water: 1 unit

4.3. **Resource Generation**: Apply investment bonuses at round start
4.4. **Critical Mode**: Trigger when any basic resource reaches zero
4.5. **Elimination Logic**: Colony eliminated after 2 rounds in critical mode

### 5. Trading System
5.1. **Availability Status**: Track and display which teams are available/busy
5.2. **Trade Initiation**: Allow teams to select available colonies and propose trades
5.3. **Negotiation Flow**:
   - Initial offer with 3-minute countdown
   - Maximum 3 counter-offers per team
   - Final accept/deny decision
   - Auto-reject if countdown expires

5.4. **Trade Validation**: Ensure teams have resources they're offering
5.5. **Trade Execution**: Update both teams' resources simultaneously
5.6. **Trade History**: Log all trades with timestamps and parties involved
5.7. **Concurrent Trading**: Block teams from multiple simultaneous negotiations

### 6. Intelligence System
6.1. **Intel Generation**: Create intel based on scout investments and round progression
6.2. **Intel Distribution Tracking**: Track how many teams know each piece of intel
6.3. **Intel Value Calculation**: Reduce value as more teams gain access
6.4. **Intel Trading**: Allow intel to be traded like resources
6.5. **Sample Intel Library**:
   - "Asteroid belt minerals available Round 4" 
   - "Solar storm doubles energy costs Round 3"
   - "Supply ship delayed - food shortage Round 4"
   - "Alien tech discovery - tech values spike Round 5"

### 7. Game Progression System
7.1. **Round Structure**: Support 5 distinct trading rounds with flexible timing
7.2. **Default Timing**:
   - Instructions: 5 minutes
   - Strategy Planning: 5 minutes
   - Round 1: 6 min trading + 3 min strategy
   - Round 2: 5 min trading + 2 min strategy
   - Milestone Break: 5 min strategy
   - Round 3: 1 min intro + 6 min trading + 2 min strategy
   - Round 4: 3 min trading + 3 min strategy
   - Round 5: 4 min trading (one trade limit)

7.3. **Timing Flexibility**: Allow facilitator to extend any segment (minimum 2 minutes)
7.4. **Round Transitions**: Automatic progression with countdown warnings
7.5. **Strategy Time Content**: Display next round information during strategy periods

### 8. Milestone Events
8.1. **Alien Contact (Round 3)**:
   - Introduce 13th trading entity with unique resources
   - Offer limited quantities on first-come-first-served basis
   - Accept combination trades (basic + specialty resources)
   - Generate unique items: Quantum Crystals, Alien Tech, Hyperfuel

8.2. **Market Events**: Trigger based on intel and round progression
8.3. **Crisis Events**: Require specific resource combinations for survival bonuses

### 9. Scoring System
9.1. **Base Survival Score**: Calculate rounds survivable with end-game resources
9.2. **Efficiency Multipliers**:
   - Trade Success Rate: (Successful trades / Total attempted) × 0.2
   - Opportunity Cost: Penalty for rejected beneficial trades
   - Crisis Response: Bonus for having correct resources during events
   - Diversification: Bonus for balanced portfolio vs over-specialization

9.3. **Real-time Leaderboard**: Update scores after each round
9.4. **Final Ranking**: Combine survival score with efficiency multipliers

### 10. Data Persistence & Sync
10.1. **Firebase Integration**: Use Firestore for game state and Realtime Database for live updates
10.2. **Conflict Resolution**: Handle simultaneous updates with transaction-based writes
10.3. **Data Structure**: Organize by Event → Session → Team → Player hierarchy
10.4. **Backup System**: Create snapshots at round transitions
10.5. **Performance Optimization**: Use listeners only for active game elements

## Non-Goals (Out of Scope)

- **Voice/Video Communication**: Players use external tools for team coordination
- **Advanced AI**: No computer-controlled trading opponents (except Alien Contact)
- **Complex Economic Modeling**: Simplified resource economics for gameplay clarity
- **Historical Data Analytics**: Focus on current game session, not cross-game analysis
- **Social Features**: No friend lists, profiles, or social networking elements
- **Customizable Game Rules**: Fixed ruleset to ensure consistent experience
- **Multi-Language Support**: English-only for initial version

## Technical Considerations

### Architecture
- **Frontend**: React with real-time Firebase listeners
- **Backend**: Firebase Firestore + Realtime Database
- **State Management**: React Context/Redux for local state, Firebase for shared state
- **Real-time Updates**: Firebase listeners for trading status and resource changes

### Performance Requirements
- **Response Time**: < 500ms for trade actions
- **Concurrent Users**: Support 500+ simultaneous players across multiple events
- **Data Sync**: Real-time updates within 1 second across all clients
- **Offline Handling**: Queue actions when offline, sync on reconnection

### Security
- **Game Code Validation**: Verify codes before allowing session access
- **Action Validation**: Server-side validation of all trades and resource changes
- **Session Isolation**: Prevent cross-session data access
- **Rate Limiting**: Prevent spam trading attempts

## Success Metrics

### Game Performance
- **Session Completion Rate**: > 95% of started sessions complete successfully
- **Average Engagement**: Players remain active > 90% of game duration
- **Trade Volume**: Average 15-20 trades per team per session
- **Technical Issues**: < 5% of players experience disconnection issues

### Business Metrics
- **Facilitator Satisfaction**: Easy setup and management for events
- **Scalability**: Support events with 50-500 participants
- **Replayability**: Teams want to play multiple sessions
- **Learning Outcomes**: Clear connection to teamwork and negotiation skills

## Open Questions

### Technical Implementation
1. **Offline Queue Limit**: How many actions should be queued when players are offline?
2. **Session Cleanup**: When should completed sessions be archived/deleted?
3. **Error Recovery**: How should the system handle partial trade failures?
4. **Load Balancing**: How to distribute multiple events across Firebase instances?

### Game Balance
5. **Elimination Frequency**: Is 5% team elimination rate appropriate for corporate events?
6. **Intel Balance**: Should some intel be colony-type specific vs universal?
7. **Alien Contact Items**: Should alien resources provide permanent advantages?
8. **Trade Limits**: Should there be daily/hourly limits on number of trades?

### User Experience
9. **Tutorial Integration**: Should there be practice rounds for complex corporate groups?
10. **Spectator Mode**: Do facilitators need live trading monitoring capabilities?
11. **Post-Game Analysis**: What level of trade analytics should be provided?
12. **Mobile Optimization**: Should portrait mode be completely blocked or have limited functionality?

---

**Next Steps**: This PRD should be reviewed with the development team to validate technical feasibility and estimate implementation timeline. Priority should be given to core trading mechanics and session management, with advanced features like alien contact and complex scoring implemented in subsequent iterations.
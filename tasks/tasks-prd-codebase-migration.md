# Tasks for Space Colony Trade Codebase Migration

## Relevant Files

- `/src/services/gameService.ts` - Main game service to be enhanced with complete logic from `space-colony-exchange`
- `/src/services/adminService.ts` - Admin service for session and event management
- `/src/services/authService.ts` - Authentication service to be integrated from `space-colony-exchange` 
- `/src/types/game.ts` - Game data models and types that need enhancement
- `/src/types/index.ts` - Main types index file that may need updates for new types
- `/src/pages/AdminDashboard.tsx` - Admin dashboard that needs complete session creation functionality
- `/src/components/ui/*` - UI components that will continue to provide the HUD-style design
- `/src/components/trading/*` - Trading UI components that need to work with enhanced data models
- `/firebase/config.js` - Firebase configuration to be verified and potentially updated
- `/src/App.tsx` - Main application routing
- `/space-colony-exchange/src/services/gameService.ts` - Source game service with full functionality
- `/space-colony-exchange/src/types/index.ts` - Source types with complete game data models
- `/space-colony-exchange/src/pages/AdminDashboard.tsx` - Source admin dashboard with full event creation

### Notes

- The migration should maintain the existing HUD-style UI components while integrating the full game functionality
- Files from `space-colony-exchange` should not be copied directly; their functionality should be integrated into the main app
- Unit tests should be updated or created to verify the functionality of migrated components
- Run `npm run build` after completing the migration to verify the application builds successfully

## Tasks

- [x] 1.0 Project Analysis and Migration Planning
  - [x] 1.1 Create a detailed inventory of unique features/functions in `space-colony-exchange`
  - [x] 1.2 Create an inventory of UI components and styles in the main app that need to be preserved
  - [x] 1.3 Compare Firebase configurations between the two implementations
  - [x] 1.4 Analyze dependencies in both package.json files to identify any missing packages
  - [x] 1.5 Document the data flow and component interactions in the existing applications
  - [x] 1.6 Create a detailed migration sequence diagram to visualize the migration steps

- [x] 2.0 Service Layer Migration
  - [x] 2.1 Enhance `gameService.ts` with event creation functionality from `space-colony-exchange`
  - [x] 2.2 Migrate session creation with proper team/colony generation logic
  - [x] 2.3 Implement resource initialization and management functions
  - [x] 2.4 Add real-time database integration for live updates
  - [x] 2.5 Integrate authentication service enhancements if needed
  - [x] 2.6 Update any Firebase references to match the main app's configuration
  - [x] 2.7 Migrate round processing logic and game state management

- [x] 3.0 Data Model Migration
  - [x] 3.1 Update `types/game.ts` with complete game data models from `space-colony-exchange`
  - [x] 3.2 Ensure proper typing for colonies, resources, and game sessions
  - [x] 3.3 Add interfaces for events, organization management, and team types
  - [x] 3.4 Update any type references throughout the application
  - [x] 3.5 Implement helper functions for data transformation and validation
  - [x] 3.6 Ensure backward compatibility where needed for existing UI components

- [x] 4.0 Admin Dashboard Enhancement
  - [x] 4.1 Add event creation functionality to AdminDashboard
  - [x] 4.2 Implement organization management UI
  - [x] 4.3 Update session creation to generate proper game data
  - [x] 4.4 Add team/colony type selection and configuration
  - [x] 4.5 Implement facilitator code generation with proper format
  - [x] 4.6 Maintain HUD-style UI elements in all new or updated admin components
  - [x] 4.7 Add validation for all form inputs
  - [x] 4.8 Implement success/error feedback for admin actions

- [ ] 5.0 Game UI Component Updates
  - [x] 5.1 Implement game joining functionality with team assignment
  - [x] 5.2 Update trading components to work with enhanced data models
    - [x] 5.2.1 Review and migrate TradeNotifications component with HUD-style UI
    - [x] 5.2.2 Assess AvailableColoniesGrid (main app version is more advanced, retain with compatibility updates)
    - [x] 5.2.3 Assess ResourceSelector (main app version is more advanced, retain with compatibility updates)
    - [x] 5.2.4 Assess TradingModal (main app version is more advanced, retain with compatibility updates)
    - [x] 5.2.5 Verify trade validation and service integration with new data models
    - [x] 5.2.6 Test full trading flow with enhanced models
  - [x] 5.3 Ensure resource displays show correct data from the enhanced models
  - [x] 5.4 Update colony information displays
  - [x] 5.5 Update game phase and round management UI
  - [x] 5.6 Enhance leaderboard to work with new scoring models
  - [x] 5.7 Update any game timers or progress indicators
  - [x] 5.8 Verify all UI animations and transitions still work properly
  - [x] 5.9 Test responsive behavior of all updated components

- [ ] 6.0 Testing and Cleanup
  - [ ] 6.1 Identify and remove redundant code within the codebase
    - [x] 6.1.1 Audit all service files to identify duplicate methods
    - [x] 6.1.2 Remove unused imports and components
    - [x] 6.1.3 Move resource utility methods to gameUtils.ts
      - [x] Fix remaining TypeScript errors in gameUtils.ts
    - [x] 6.1.4 Verify service method uniqueness and remove duplicates
    - [x] 6.1.5 Review and consolidate `listenToActiveTrades` (tradingService.ts) and `subscribeToActiveTrades` (gameService.ts)
      - [x] Clarify the different purposes of these methods (ActiveTrade[] vs TradeOffer[] return types)
      - [x] Ensure consistent naming patterns across the codebase
      - [x] Update all references to use the appropriate method based on needed functionality
    - [x] 6.1.6 Fix TypeScript errors in Team interface usage in adminService.ts
    - [x] 6.1.7 Consolidate all trade offer methods into tradingService.ts; remove from tradeService.ts
      - [x] Make required TradingService methods public to support hook integration
      - [x] Update useTrading.ts to use TradingService methods exclusively
      - [x] Remove tradeService.ts and update all references
  - [ ] 6.2 Ensure consistent naming conventions throughout the codebase
  - [ ] 6.3 Update imports and references to use the consolidated services
  - [ ] 6.4 Test full user flow through the application
  - [x] 6.5 Test admin session creation with full game data
  - [ ] 6.6 Test player experience with trading and resource management
  - [x] 6.7 Verify build process completes successfully
  - [x] 6.8 Test Firebase deployment of the consolidated application
  - [ ] 6.9 Document any significant architectural changes for future developers

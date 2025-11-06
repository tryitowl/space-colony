# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Space Colony Exchange** project - a real-time negotiation-based trading game designed for corporate team-building events. Teams manage different types of space colonies, trading resources while managing depletion and responding to market events across 5 distinct rounds.

The project uses Vite + React 19 + TypeScript with a modern development stack and professional glassmorphism UI design.

## Development Commands

```bash
# Development
npm run dev          # Start Vite dev server on port 5173

# Building
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking

# Testing
npm test            # Run Vitest tests
npm run test:ui     # Run tests with UI
npm run test:coverage  # Generate coverage report

# Firebase
npm run deploy      # Deploy to Firebase Hosting
npm run deploy:functions  # Deploy Firebase Functions only
```

## Architecture Overview

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **State Management**: React Context API (`GameContext`) for global state, Firebase for shared state
- **Routing**: React Router v6 with protected routes
- **Styling**: Tailwind CSS with glassmorphism design system
- **Animations**: Framer Motion for 60fps animations
- **Real-time**: Firebase listeners for immediate updates

### Key Design Patterns
1. **Service Layer Pattern**: All Firebase operations go through services (`/src/services/`)
2. **Component Composition**: Reusable UI components in `/src/components/ui/`
3. **Type Safety**: Comprehensive TypeScript types in `/src/types/`
4. **Context-based State**: Game state managed via `GameContext`
5. **Real-time Synchronization**: Firebase listeners update local state automatically

### Firebase Architecture
- **Firestore**: Primary database for game state, sessions, teams
- **Realtime Database**: High-frequency updates (trading status, timers)
- **Functions**: Server-side validation and game logic (TypeScript)
- **Hosting**: Static file hosting for the React app

## Development Workflow

This project follows a structured PRD → Task List → Implementation workflow:

### Working with Tasks
**CRITICAL**: Only work on ONE sub-task at a time
1. Check `/tasks/` directory for current task lists
2. Mark tasks `[x]` immediately when completed
3. Update task list file after each work session
4. Wait for user permission before moving to next task

### File Organization
```
/guide/                      - Development process documentation
/prd/                       - Product Requirements Documents
/tasks/                     - Task lists with implementation status
/src/                       - Main application source
  ├── components/           - UI components
  │   ├── trading/         - Trading-specific components
  │   └── ui/              - Reusable UI components (including HUD components)
  ├── pages/               - Page components
  ├── services/            - Firebase and business logic
  ├── contexts/            - React contexts
  ├── types/               - TypeScript definitions
  ├── firebase/            - Firebase configuration
  ├── utils/               - Utility functions
  └── styles/              - Global styles and theme
/functions/                 - Firebase Functions (TypeScript)
```

## Current Implementation Status

Refer to `DEVELOPMENT_STATUS.md` for detailed status. Key completed features:
- Professional glassmorphism UI with HUD components
- Complete trading system with real-time notifications
- Session and team management with game codes
- Real-time Firebase integration
- Mobile responsive with landscape lock
- Facilitator dashboard with test session creation
- Enhanced UI components (CircularGauge, HUDFrame, HexGrid, DataVisualization)

## Technical Requirements

### Performance Targets
- 60fps animations on all devices
- < 500ms response time for actions
- < 100MB memory footprint on mobile
- Real-time updates within 1 second

### Mobile Requirements
- Forced landscape orientation below 768px
- Touch-optimized interfaces
- Hardware-accelerated animations
- Responsive grid layouts

### Security Considerations
- All trades validated server-side in Firebase Functions
- Environment variables for sensitive configuration
- Firestore security rules enforce access control
- No client-side resource manipulation

## Key Implementation Notes

1. **Firebase Listeners**: Always clean up listeners in `useEffect` cleanup
2. **Type Safety**: Use generated types from `/src/types/` - don't use `any`
3. **Component Reuse**: Check `/src/components/ui/` before creating new components
4. **Real-time Updates**: Use `onSnapshot` for Firestore, `on` for Realtime Database
5. **Error Handling**: All Firebase operations should have try-catch blocks
6. **Loading States**: Show loading indicators during async operations
7. **Responsive Design**: Test on mobile viewport (landscape) regularly

## Testing Approach

- Unit tests for utility functions and services
- Integration tests for Firebase operations
- Component tests for critical UI components
- Manual testing for real-time features
- Use Vitest for all testing needs

## Deployment Process

1. Run all tests and linting: `npm test && npm run lint && npm run type-check`
2. Build production bundle: `npm run build`
3. Test production build locally: `npm run preview`
4. Deploy to Firebase: `npm run deploy`
5. Verify deployment at: https://space-colony-exchange.web.app

## Common Development Tasks

### Adding a New Component
1. Create component in appropriate directory
2. Follow existing naming conventions (PascalCase)
3. Include TypeScript types
4. Use existing UI components from `/src/components/ui/`

### Modifying Firebase Schema
1. Update types in `/src/types/`
2. Update Firestore security rules if needed
3. Update Firebase Functions validation
4. Test with emulator before deploying

### Working with Real-time Features
1. Use Firebase listeners appropriately
2. Implement proper cleanup in components
3. Handle connection state changes
4. Test with multiple browser tabs

## Important Conventions

- **No console.log in production**: Use proper error handling
- **Accessibility**: All interactive elements need ARIA labels
- **Colorblind-friendly**: Use patterns/shapes in addition to colors
- **Corporate audience**: Professional design, no casual language
- **Performance first**: Optimize re-renders, use React.memo when needed

## Development Rules for Efficient Implementation

### 1. Code Quality Standards
- **TypeScript Strict Mode**: No `any` types allowed - use proper interfaces
- **Error Boundaries**: Wrap all major components with error boundaries
- **Try-Catch Blocks**: All async operations must have proper error handling
- **Loading States**: Every async operation needs loading/error/success states
- **Test Coverage**: Minimum 80% coverage for new code

### 2. Implementation Priorities
- **Fix Before Feature**: Address technical debt before adding new features
- **Core Before Polish**: Game mechanics before visual enhancements
- **Test As You Go**: Write tests alongside implementation
- **Document Decisions**: Add comments for non-obvious logic

### 3. Sub-Agent Coordination
- **Clear Boundaries**: Each agent owns specific directories/features
- **API Contracts**: Define interfaces between features before implementation
- **Daily Integration**: Merge to main branch at least once daily
- **Blocking Issues**: Immediately escalate integration blockers

### 4. Performance Guidelines
- **Bundle Size**: Keep under 500KB for initial load
- **Lazy Loading**: Code split by route and heavy components
- **Memoization**: Use React.memo for expensive renders
- **Debouncing**: Throttle real-time updates appropriately
- **Animation**: Use CSS transforms, avoid layout thrashing

### 5. Firebase Best Practices
- **Batch Operations**: Use batch writes for multiple updates
- **Offline Support**: Implement proper offline handling
- **Security Rules**: Never trust client data - validate server-side
- **Connection Management**: Monitor and display connection state
- **Listener Cleanup**: Always unsubscribe in useEffect cleanup

### 6. Testing Requirements
- **Unit Tests**: All services and utilities
- **Component Tests**: Interactive components and forms
- **Integration Tests**: Firebase operations and game flows
- **E2E Tests**: Critical user journeys (join game, trade, etc.)
- **Performance Tests**: Load testing with 100+ concurrent users

### 7. Accessibility Compliance
- **ARIA Labels**: All interactive elements
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Proper focus flow
- **Screen Readers**: Test with NVDA/JAWS
- **Color Contrast**: WCAG 2.1 AA minimum

### 8. Mobile-First Development
- **Touch Targets**: Minimum 44x44px
- **Gesture Support**: Swipe for panels
- **Viewport Testing**: Test at 375px, 768px, 1024px
- **Performance**: Test on mid-range devices
- **Offline Mode**: Handle connectivity issues

### 9. Security Requirements
- **Environment Variables**: All secrets in .env files
- **Input Validation**: Sanitize all user inputs
- **XSS Prevention**: Use React's built-in protections
- **CSRF Protection**: Implement for all mutations
- **Rate Limiting**: Prevent abuse of Firebase operations

### 10. Deployment Checklist
- [ ] All tests passing (unit, integration, E2E)
- [ ] TypeScript build succeeds with no errors
- [ ] ESLint passes with no warnings
- [ ] Lighthouse score > 90 for performance
- [ ] Security audit completed
- [ ] Accessibility audit passed
- [ ] Load testing successful
- [ ] Documentation updated
# Admin System Documentation

## Overview

The Space Colony Exchange admin system provides comprehensive tools for facilitators to manage game sessions, monitor gameplay, and control game dynamics.

## Authentication & Access Control

### Authentication Flow
1. **Admin Authentication**: Uses Firebase Auth with email/password
2. **Game Code System**: 6-character codes provide role-based access
   - Format: `EESTTJ` (Event, Session, Team, Player)
   - Facilitator codes: Special format for facilitator access
3. **Token Claims**: Custom claims added to Firebase tokens for authorization

### Security Rules

The Firestore security rules enforce strict access control:

```javascript
// Helper functions validate game codes and player membership
function hasValidGameCode() {
  return request.auth.token.gameCode != null && 
         request.auth.token.gameCode.size() == 6;
}

function isPlayerInTeam(teamId, gameCode) {
  return teamId == extractEventFromGameCode(gameCode) + 
                 extractSessionFromGameCode(gameCode) + 
                 extractTeamFromGameCode(gameCode);
}
```

### Current Security Configuration
- **Authentication**: Required for all database access
- **Game Code Validation**: Enforces proper code format and team membership
- **Resource Updates**: Validated to prevent negative values
- **Rate Limiting**: Placeholder for Cloud Functions implementation
- **Write Restrictions**: Many collections restricted to Cloud Functions only

## Admin Dashboard Features

### 1. Session Management
- **Create Sessions**: Configure game parameters, rounds, and timing
- **Galaxy Configuration**: Set up multiple galaxies with different rules
- **Victory Conditions**: Choose from 20+ victory conditions
- **AI Configuration**: Configure AI teams and difficulty

### 2. Facilitator Tools
- **Galaxy Management Dashboard**: Monitor and control multiple galaxies
  - Pause/Resume galaxies
  - Send global announcements
  - View real-time statistics
  - Export galaxy data
- **Facilitator Settings**: Persistent dashboard preferences
  - Real-time updates toggle
  - Performance metrics display
  - Alert system configuration
  - Auto-refresh intervals

### 3. Reporting & Analytics
- **Player Analytics**: Track individual and team performance
- **Trading Analytics**: Monitor trade patterns and strategies
- **Privacy Controls**: GDPR-compliant data handling
  - Data retention policies
  - Anonymization options
  - Export format controls
- **Export Formats**: PDF, CSV, Excel, JSON

### 4. Game Control
- **Event System**: Trigger and manage crisis events
- **Intel Management**: Create and distribute custom intel
- **Resource Control**: Adjust team resources when needed
- **Trading Control**: Pause/resume trading for galaxies

## Admin Components

### Core Admin Components
- `AdminDashboard`: Main admin interface
- `SessionCreationForm`: Comprehensive session setup
- `GalaxyConfigurationForm`: Galaxy-specific settings
- `GalaxyManagementDashboard`: Real-time galaxy control
- `FacilitatorConfig`: Dashboard preferences
- `ReportingConfig`: Privacy and export settings

### Supporting Services
- `galaxyStateService`: Galaxy pause/resume and announcements
- `facilitatorSettingsService`: Persistent facilitator preferences
- `analyticsService`: Comprehensive game analytics
- `eventSystemService`: Crisis event management

## Security Best Practices

### Current Implementation
1. **Authentication Required**: All Firestore access requires authentication
2. **Role-Based Access**: Game codes determine access levels
3. **Input Validation**: Resource updates validated in security rules
4. **Write Restrictions**: Critical operations restricted to Cloud Functions

### Recommendations for Production
1. **Replace Test Credentials**: Remove hardcoded admin credentials
2. **Implement Rate Limiting**: Add proper rate limiting in Cloud Functions
3. **Add Admin Authentication**: Implement proper admin user management
4. **Enable Audit Logging**: Track all admin actions
5. **Review Security Rules**: Tighten rules based on production needs

## API Endpoints (Cloud Functions)

### Secured Endpoints
- `createSession`: Creates new game session
- `executeRound`: Advances game round
- `generateIntel`: Creates intel for teams
- `validateTrade`: Validates trade offers
- `executeAITrade`: Processes AI trades

### Authentication Middleware
All Cloud Functions use authentication middleware:
```javascript
export const authenticatedFunction = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  // Function logic
});
```

## Deployment Security Checklist

- [ ] Remove hardcoded test credentials
- [ ] Review and tighten Firestore security rules
- [ ] Implement proper admin user management
- [ ] Enable Cloud Functions authentication
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategies
- [ ] Review data retention policies
- [ ] Test all security boundaries

## Known Limitations

1. **Test Credentials**: Currently uses hardcoded test admin account
2. **Open Rules**: Some collections have permissive rules for testing
3. **Rate Limiting**: Not fully implemented (placeholder in rules)
4. **Audit Logging**: Write-only, needs admin interface for viewing

## Future Enhancements

1. **Multi-Factor Authentication**: Add MFA for admin accounts
2. **IP Whitelisting**: Restrict admin access by IP
3. **Session Recording**: Record gameplay for review
4. **Advanced Analytics**: Machine learning insights
5. **Custom Permissions**: Granular facilitator permissions
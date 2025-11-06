# Space Colony Exchange 🚀

A real-time negotiation-based trading game designed for corporate team-building events. Teams manage different types of space colonies, trading resources while managing depletion and responding to market events.

## Overview

Space Colony Exchange is a sophisticated multiplayer trading simulation where teams must collaborate, negotiate, and strategize to achieve victory. Each team manages a unique colony type with specific strengths and weaknesses, creating natural trading opportunities and strategic alliances.

## Features

### 🎮 Core Gameplay
- **5 Distinct Rounds**: Each with unique challenges and opportunities
- **6 Colony Types**: Mining, Agricultural, Research, Military, Trading, Manufacturing
- **Real-time Trading**: Live negotiation and counter-offer system
- **Resource Management**: 10+ resource types with depletion mechanics
- **Crisis Events**: Dynamic challenges requiring team cooperation
- **Intel System**: Gather and trade valuable information

### 🤖 AI System
- **Autonomous AI Colonies**: Fill empty slots with intelligent AI players
- **Difficulty Levels**: Easy, Medium, and Hard AI opponents
- **Strategic Behaviors**: Each colony type has unique AI strategies
- **Realistic Trading**: AI colonies evaluate and respond to trade offers

### 👨‍💼 Admin & Facilitation
- **Comprehensive Dashboard**: Create and manage game sessions
- **Multi-Galaxy Support**: Run parallel games with different rules
- **Victory Conditions**: Choose from 20+ victory conditions
- **Real-time Controls**: Pause/resume galaxies, send announcements
- **Analytics & Reporting**: Track performance and export reports

### 🎨 Professional UI/UX
- **Glassmorphism Design**: Modern, corporate-friendly aesthetic
- **Mobile Responsive**: Optimized for tablets and phones (landscape)
- **60fps Animations**: Smooth, professional interactions
- **HUD Components**: Data visualization and status indicators
- **Accessibility**: WCAG 2.1 AA compliance in progress

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Realtime Database, Functions)
- **State Management**: React Context API
- **Animations**: Framer Motion
- **Testing**: Vitest, React Testing Library

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/space-colony-exchange.git
cd space-colony-exchange

# Install dependencies
npm install

# Install Firebase Functions dependencies
cd functions && npm install && cd ..
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication, Firestore, and Realtime Database
3. Update `.firebaserc` with your project ID
4. Deploy security rules: `firebase deploy --only firestore:rules`

## Game Flow

1. **Admin Creates Session**: Configure game parameters and galaxies
2. **Players Join**: Use 6-character game codes to join teams
3. **Investment Phase**: Teams choose colony upgrades
4. **Trading Rounds**: Negotiate and execute resource trades
5. **Crisis Events**: Respond to dynamic challenges
6. **Victory Evaluation**: Multiple paths to victory

## Documentation

- [Admin System](docs/ADMIN_SYSTEM.md) - Admin features and security
- [Current Status](docs/CURRENT_STATUS.md) - Development progress
- [AI Colony System](docs/AI_COLONY_SYSTEM.md) - AI implementation details
- [Session Code System](docs/session-code-system.md) - Game code structure
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Production deployment guide

## Project Structure

```
src/
├── components/       # UI components
│   ├── trading/     # Trading-specific components
│   └── ui/          # Reusable UI components
├── pages/           # Page components
├── services/        # Business logic and Firebase
├── contexts/        # React contexts
├── types/           # TypeScript definitions
├── utils/           # Utility functions
└── config/          # Configuration files

functions/           # Firebase Cloud Functions
├── src/
│   ├── ai/         # AI trading logic
│   ├── auth/       # Authentication
│   └── game/       # Game mechanics
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate coverage report
- `npm run deploy` - Deploy to Firebase

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Code Style

- TypeScript strict mode enabled
- ESLint configuration for consistent code style
- Prettier for code formatting
- No `any` types allowed (work in progress)

## Performance Targets

- Initial load: < 3 seconds
- Response time: < 500ms for all actions
- Animation: 60fps on all devices
- Memory: < 100MB on mobile devices

## License

This project is proprietary software. All rights reserved.

## Support

For questions or support, please contact the development team.

---

Built with ❤️ for corporate team building and strategic gameplay.
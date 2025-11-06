import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GameProvider } from '../../contexts/GameContext';
import JoinGamePage from '../../pages/JoinGamePage';
import { sessionService } from '../../services/sessionService';
import { GameService } from '../../services/GameService';
import { teamDataService } from '../../services/teamDataService';

// Mock services
vi.mock('../../services/sessionService');
vi.mock('../../services/GameService');
vi.mock('../../services/teamDataService');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('JoinGame Integration', () => {
  const mockSession = {
    id: 'test-session',
    gameCode: 'GAME123',
    facilitatorId: 'facilitator-123',
    galaxyName: 'Test Galaxy',
    currentRound: 1,
    totalRounds: 5,
    status: 'active' as const,
    settings: {
      tradingEnabled: true,
      messagesEnabled: true,
      aiEnabled: false,
      showLeaderboard: true,
      victoryConditions: ['survival', 'economic']
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const mockTeams = [
    {
      id: 'team1',
      name: 'Alpha Colony',
      colonyType: 'mining' as const,
      players: []
    },
    {
      id: 'team2',
      name: 'Beta Station',
      colonyType: 'agriculture' as const,
      players: ['player1']
    },
    {
      id: 'team3',
      name: 'Gamma Outpost',
      colonyType: 'research' as const,
      players: ['player2', 'player3', 'player4'] // Full team
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Game Code Entry', () => {
    it('should validate game code format', async () => {
      renderWithProviders(<JoinGamePage />);
      
      const input = screen.getByPlaceholderText('Enter 6-character code');
      const joinButton = screen.getByText('Join Galaxy');
      
      // Try invalid code
      fireEvent.change(input, { target: { value: '123' } });
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid 6-character game code')).toBeInTheDocument();
      });
      
      expect(sessionService.getSessionByCode).not.toHaveBeenCalled();
    });

    it('should handle non-existent game code', async () => {
      (sessionService.getSessionByCode as any).mockResolvedValue(null);
      
      renderWithProviders(<JoinGamePage />);
      
      const input = screen.getByPlaceholderText('Enter 6-character code');
      const joinButton = screen.getByText('Join Galaxy');
      
      fireEvent.change(input, { target: { value: 'NOEXIST' } });
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid game code. Please check and try again.')).toBeInTheDocument();
      });
    });

    it('should proceed to team selection with valid code', async () => {
      (sessionService.getSessionByCode as any).mockResolvedValue(mockSession);
      (teamDataService.getTeamsForSession as any).mockResolvedValue(mockTeams);
      
      renderWithProviders(<JoinGamePage />);
      
      const input = screen.getByPlaceholderText('Enter 6-character code');
      const joinButton = screen.getByText('Join Galaxy');
      
      fireEvent.change(input, { target: { value: 'GAME123' } });
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(screen.getByText('Join Test Galaxy')).toBeInTheDocument();
        expect(screen.getByText('Select Your Colony')).toBeInTheDocument();
      });
      
      // Should show team cards
      expect(screen.getByText('Alpha Colony')).toBeInTheDocument();
      expect(screen.getByText('Beta Station')).toBeInTheDocument();
      expect(screen.getByText('Gamma Outpost')).toBeInTheDocument();
    });
  });

  describe('Team Selection', () => {
    beforeEach(async () => {
      (sessionService.getSessionByCode as any).mockResolvedValue(mockSession);
      (teamDataService.getTeamsForSession as any).mockResolvedValue(mockTeams);
      
      renderWithProviders(<JoinGamePage />);
      
      const input = screen.getByPlaceholderText('Enter 6-character code');
      const joinButton = screen.getByText('Join Galaxy');
      
      fireEvent.change(input, { target: { value: 'GAME123' } });
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(screen.getByText('Select Your Colony')).toBeInTheDocument();
      });
    });

    it('should show team capacity', () => {
      expect(screen.getByText('0/4 players')).toBeInTheDocument(); // Alpha Colony
      expect(screen.getByText('1/4 players')).toBeInTheDocument(); // Beta Station
      expect(screen.getByText('4/4 players')).toBeInTheDocument(); // Gamma Outpost
    });

    it('should disable full teams', () => {
      const gammaCard = screen.getByText('Gamma Outpost').closest('.glass-panel');
      expect(gammaCard).toHaveClass('opacity-50');
      
      const joinButtons = screen.getAllByText('Join Team');
      expect(joinButtons[2]).toBeDisabled(); // Gamma's join button
    });

    it('should proceed to player name entry after team selection', async () => {
      const alphaJoinButton = screen.getAllByText('Join Team')[0];
      fireEvent.click(alphaJoinButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enter Your Name')).toBeInTheDocument();
        expect(screen.getByText('Joining Alpha Colony')).toBeInTheDocument();
      });
    });
  });

  describe('Player Name Entry', () => {
    beforeEach(async () => {
      (sessionService.getSessionByCode as any).mockResolvedValue(mockSession);
      (teamDataService.getTeamsForSession as any).mockResolvedValue(mockTeams);
      (GameService.joinTeam as any).mockResolvedValue({ playerId: 'new-player-123' });
      
      renderWithProviders(<JoinGamePage />);
      
      // Navigate to team selection
      const input = screen.getByPlaceholderText('Enter 6-character code');
      fireEvent.change(input, { target: { value: 'GAME123' } });
      fireEvent.click(screen.getByText('Join Galaxy'));
      
      await waitFor(() => {
        expect(screen.getByText('Select Your Colony')).toBeInTheDocument();
      });
      
      // Select a team
      fireEvent.click(screen.getAllByText('Join Team')[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Enter Your Name')).toBeInTheDocument();
      });
    });

    it('should validate player name', async () => {
      const nameInput = screen.getByPlaceholderText('Your name');
      const startButton = screen.getByText('Start Playing');
      
      // Empty name
      fireEvent.click(startButton);
      await waitFor(() => {
        expect(screen.getByText('Please enter your name')).toBeInTheDocument();
      });
      
      // Too short
      fireEvent.change(nameInput, { target: { value: 'A' } });
      fireEvent.click(startButton);
      await waitFor(() => {
        expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
      });
    });

    it('should save player data and navigate to colony dashboard', async () => {
      const navigate = vi.fn();
      vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(navigate);
      
      const nameInput = screen.getByPlaceholderText('Your name');
      const startButton = screen.getByText('Start Playing');
      
      fireEvent.change(nameInput, { target: { value: 'Test Player' } });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(GameService.joinTeam).toHaveBeenCalledWith(
          mockSession.id,
          'team1',
          'Test Player'
        );
      });
      
      // Check localStorage
      const savedData = JSON.parse(localStorage.getItem('playerData') || '{}');
      expect(savedData.playerId).toBe('new-player-123');
      expect(savedData.playerName).toBe('Test Player');
      expect(savedData.teamId).toBe('team1');
      expect(savedData.sessionId).toBe('test-session');
      
      // Check navigation
      expect(navigate).toHaveBeenCalledWith('/colony');
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching session', async () => {
      (sessionService.getSessionByCode as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSession), 100))
      );
      
      renderWithProviders(<JoinGamePage />);
      
      const input = screen.getByPlaceholderText('Enter 6-character code');
      fireEvent.change(input, { target: { value: 'GAME123' } });
      fireEvent.click(screen.getByText('Join Galaxy'));
      
      expect(screen.getByText('Connecting to galaxy...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Connecting to galaxy...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (sessionService.getSessionByCode as any).mockRejectedValue(
        new Error('Network error')
      );
      
      renderWithProviders(<JoinGamePage />);
      
      const input = screen.getByPlaceholderText('Enter 6-character code');
      fireEvent.change(input, { target: { value: 'GAME123' } });
      fireEvent.click(screen.getByText('Join Galaxy'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to connect. Please try again.')).toBeInTheDocument();
      });
    });

    it('should handle team join errors', async () => {
      (sessionService.getSessionByCode as any).mockResolvedValue(mockSession);
      (teamDataService.getTeamsForSession as any).mockResolvedValue(mockTeams);
      (GameService.joinTeam as any).mockRejectedValue(
        new Error('Team is full')
      );
      
      renderWithProviders(<JoinGamePage />);
      
      // Navigate through flow
      const input = screen.getByPlaceholderText('Enter 6-character code');
      fireEvent.change(input, { target: { value: 'GAME123' } });
      fireEvent.click(screen.getByText('Join Galaxy'));
      
      await waitFor(() => {
        expect(screen.getByText('Select Your Colony')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getAllByText('Join Team')[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Enter Your Name')).toBeInTheDocument();
      });
      
      fireEvent.change(screen.getByPlaceholderText('Your name'), { 
        target: { value: 'Test Player' } 
      });
      fireEvent.click(screen.getByText('Start Playing'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to join team. It may be full.')).toBeInTheDocument();
      });
    });
  });

  describe('Back Navigation', () => {
    it('should allow going back from team selection to code entry', async () => {
      (sessionService.getSessionByCode as any).mockResolvedValue(mockSession);
      (teamDataService.getTeamsForSession as any).mockResolvedValue(mockTeams);
      
      renderWithProviders(<JoinGamePage />);
      
      // Go to team selection
      const input = screen.getByPlaceholderText('Enter 6-character code');
      fireEvent.change(input, { target: { value: 'GAME123' } });
      fireEvent.click(screen.getByText('Join Galaxy'));
      
      await waitFor(() => {
        expect(screen.getByText('Select Your Colony')).toBeInTheDocument();
      });
      
      // Click back
      fireEvent.click(screen.getByLabelText('Go back'));
      
      expect(screen.getByPlaceholderText('Enter 6-character code')).toBeInTheDocument();
      expect(screen.queryByText('Select Your Colony')).not.toBeInTheDocument();
    });
  });
});
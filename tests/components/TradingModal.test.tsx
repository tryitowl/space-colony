import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { TradingModal } from '../../src/components/trading/TradingModal';
import { render } from '../../src/test/utils/renderUtils';
import { createColony, createIntelItem } from '../../src/test/utils/factories';
import type { Colony } from '../../src/types';

// Mock the trading service
vi.mock('../../src/services/tradingService', () => ({
  TradingService: {
    createTradeOffer: vi.fn().mockResolvedValue({ id: 'trade-123' }),
    validateTradeResources: vi.fn().mockReturnValue({ isValid: true, errors: [] })
  }
}));

// Mock audio alerts
vi.mock('../../src/utils/audioAlerts', () => ({
  AudioAlerts: {
    playUrgentTimerAlert: vi.fn(),
    playWarningTimerAlert: vi.fn(),
    playTradeCreatedAlert: vi.fn(),
    playTradeAcceptedAlert: vi.fn()
  }
}));

// Mock UI components to focus on TradingModal logic
vi.mock('../../src/components/ui/GlassPanel', () => ({
  GlassPanel: ({ children, className, isOpen }: any) => (
    isOpen ? <div className={`glass-panel ${className || ''}`} data-testid="trading-modal">{children}</div> : null
  )
}));

vi.mock('../../src/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, loading, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled || loading}
      className={`btn ${variant || ''} ${loading ? 'loading' : ''}`}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}));

vi.mock('../../src/components/trading/ResourceSelector', () => ({
  ResourceSelector: ({ selectedResources, onResourceChange, availableResources, mode }: any) => (
    <div data-testid="resource-selector">
      <div data-mode={mode}>Resource Selector</div>
      <div data-available-resources={JSON.stringify(availableResources)}>
        {Object.entries(selectedResources || {}).map(([resource, amount]) => (
          <div key={resource} data-testid={`selected-${resource}`}>
            {resource}: {amount}
          </div>
        ))}
      </div>
      <button 
        onClick={() => onResourceChange({ oxygen: 10 })}
        data-testid="select-oxygen"
      >
        Select Oxygen
      </button>
    </div>
  )
}));

vi.mock('../../src/components/trading/IntelSelector', () => ({
  IntelSelector: ({ selectedIntel, onIntelChange, availableIntel }: any) => (
    <div data-testid="intel-selector">
      <div data-available-intel={JSON.stringify(availableIntel)}>
        Intel Selector - {selectedIntel.length} selected
      </div>
      <button 
        onClick={() => onIntelChange([{ id: 'intel-1', title: 'Test Intel' }])}
        data-testid="select-intel"
      >
        Select Intel
      </button>
    </div>
  )
}));

describe('TradingModal', () => {
  let mockCurrentTeam: Colony;
  let mockTargetTeam: Colony;
  let mockOnClose: vi.Mock;
  let mockOnTradeCreated: vi.Mock;

  beforeEach(() => {
    vi.useFakeTimers();

    mockCurrentTeam = createColony({
      id: 'colony-1',
      name: 'Mining Colony A1',
      type: 'mining',
      resources: {
        ...createColony().resources,
        oxygen: 20,
        food: 10,
        water: 15,
        energy: 25,
        minerals: 30,
        credits: 1000,
        marketIntel: [createIntelItem({ id: 'intel-1', title: 'Market Intel 1' })],
        surveyReports: [createIntelItem({ id: 'intel-2', title: 'Survey Report 1' })]
      }
    });

    mockTargetTeam = createColony({
      id: 'colony-2',
      name: 'Agricultural Colony B1',
      type: 'agricultural',
      resources: {
        ...createColony().resources,
        oxygen: 15,
        food: 35,
        water: 20,
        energy: 10,
        minerals: 5,
        credits: 800
      }
    });

    mockOnClose = vi.fn();
    mockOnTradeCreated = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when open', () => {
      render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      expect(screen.getByTestId('trading-modal')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <TradingModal
          isOpen={false}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      expect(screen.queryByTestId('trading-modal')).not.toBeInTheDocument();
    });

    it('should render resource and intel selectors', () => {
      render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      expect(screen.getByTestId('resource-selector')).toBeInTheDocument();
      expect(screen.getByTestId('intel-selector')).toBeInTheDocument();
    });

    it('should display team names', () => {
      render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      expect(screen.getByText(mockCurrentTeam.name)).toBeInTheDocument();
      expect(screen.getByText(mockTargetTeam.name)).toBeInTheDocument();
    });
  });

  describe('timer functionality', () => {
    it('should start with 180 seconds and countdown', () => {
      render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      expect(screen.getByText('3:00')).toBeInTheDocument();

      // Advance timer by 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('2:59')).toBeInTheDocument();
    });

    it('should trigger warning alert at 60 seconds', async () => {
      const { AudioAlerts } = vi.mocked(await import('../../src/utils/audioAlerts'));

      render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Advance to 60 seconds remaining (120 seconds elapsed)
      act(() => {
        vi.advanceTimersByTime(120000);
      });

      expect(AudioAlerts.playWarningTimerAlert).toHaveBeenCalled();
      expect(screen.getByText('1:00')).toBeInTheDocument();
    });

    it('should trigger urgent alert at 30 seconds', () => {
      const { AudioAlerts } = vi.mocked(await import('../../src/utils/audioAlerts'));

      render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Advance to 30 seconds remaining (150 seconds elapsed)
      act(() => {
        vi.advanceTimersByTime(150000);
      });

      expect(AudioAlerts.playUrgentTimerAlert).toHaveBeenCalled();
      expect(screen.getByText('0:30')).toBeInTheDocument();
    });

    it('should auto-close when timer expires', () => {
      render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Advance timer to expiration
      act(() => {
        vi.advanceTimersByTime(180000);
      });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('trading modes', () => {
    it('should start in resources mode', () => {
      render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      const resourceSelector = screen.getByTestId('resource-selector');
      expect(resourceSelector.querySelector('[data-mode="offer"]')).toBeInTheDocument();
    });

    it('should allow switching between resources and intel modes', async () => {
      const { user } = render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Look for mode toggle buttons
      const intelModeButton = screen.getByText(/intel/i);
      await user.click(intelModeButton);

      // Should now be in intel mode
      expect(screen.getByTestId('intel-selector')).toBeVisible();
    });
  });

  describe('resource selection', () => {
    it('should handle resource selection for offers', async () => {
      const { user } = render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      const selectOxygenButton = screen.getByTestId('select-oxygen');
      await user.click(selectOxygenButton);

      expect(screen.getByTestId('selected-oxygen')).toBeInTheDocument();
      expect(screen.getByText('oxygen: 10')).toBeInTheDocument();
    });

    it('should validate available resources', () => {
      render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      const resourceSelector = screen.getByTestId('resource-selector');
      const availableResourcesData = resourceSelector.querySelector('[data-available-resources]');
      
      expect(availableResourcesData).toBeInTheDocument();
      
      const availableResources = JSON.parse(availableResourcesData!.getAttribute('data-available-resources')!);
      expect(availableResources.oxygen).toBe(20);
      expect(availableResources.minerals).toBe(30);
    });
  });

  describe('intel selection', () => {
    it('should handle intel selection', async () => {
      const { user } = render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      const selectIntelButton = screen.getByTestId('select-intel');
      await user.click(selectIntelButton);

      expect(screen.getByText('Intel Selector - 1 selected')).toBeInTheDocument();
    });

    it('should display available intel items', () => {
      render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      const intelSelector = screen.getByTestId('intel-selector');
      const availableIntelData = intelSelector.querySelector('[data-available-intel]');
      
      expect(availableIntelData).toBeInTheDocument();
      
      const availableIntel = JSON.parse(availableIntelData!.getAttribute('data-available-intel')!);
      expect(availableIntel).toHaveLength(2); // marketIntel + surveyReports
    });
  });

  describe('trade validation', () => {
    it('should validate trade before submission', async () => {
      const { TradingService } = vi.mocked(await import('../../src/services/tradingService'));
      TradingService.validateTradeResources.mockReturnValue({
        isValid: false,
        errors: ['Insufficient oxygen resources']
      });

      const { user } = render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Try to submit an invalid trade
      const submitButton = screen.getByText(/create trade/i);
      await user.click(submitButton);

      expect(screen.getByText('Insufficient oxygen resources')).toBeInTheDocument();
    });

    it('should require both offer and request', async () => {
      const { user } = render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Try to submit without selecting anything
      const submitButton = screen.getByText(/create trade/i);
      await user.click(submitButton);

      expect(screen.getByText(/must offer something/i)).toBeInTheDocument();
      expect(screen.getByText(/must request something/i)).toBeInTheDocument();
    });
  });

  describe('trade submission', () => {
    it('should create trade when validation passes', async () => {
      const { TradingService } = vi.mocked(await import('../../src/services/tradingService'));
      const { user } = render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Select resources
      await user.click(screen.getByTestId('select-oxygen'));

      // Submit trade
      const submitButton = screen.getByText(/create trade/i);
      await user.click(submitButton);

      expect(TradingService.createTradeOffer).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({
          initiatorId: mockCurrentTeam.id,
          targetId: mockTargetTeam.id
        })
      );
    });

    it('should show loading state during submission', async () => {
      const { TradingService } = vi.mocked(await import('../../src/services/tradingService'));
      // Make the service take some time to resolve
      TradingService.createTradeOffer.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ id: 'trade-123' }), 100))
      );

      const { user } = render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Select resources
      await user.click(screen.getByTestId('select-oxygen'));

      // Submit trade
      const submitButton = screen.getByText(/create trade/i);
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should call onTradeCreated callback on successful submission', async () => {
      const { user } = render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Select resources
      await user.click(screen.getByTestId('select-oxygen'));

      // Submit trade
      const submitButton = screen.getByText(/create trade/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnTradeCreated).toHaveBeenCalled();
      });
    });

    it('should close modal on successful submission', async () => {
      const { user } = render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Select resources
      await user.click(screen.getByTestId('select-oxygen'));

      // Submit trade
      const submitButton = screen.getByText(/create trade/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle trade creation errors', async () => {
      const { TradingService } = vi.mocked(await import('../../src/services/tradingService'));
      TradingService.createTradeOffer.mockRejectedValue(new Error('Trade creation failed'));

      const { user } = render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Select resources
      await user.click(screen.getByTestId('select-oxygen'));

      // Submit trade
      const submitButton = screen.getByText(/create trade/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create trade/i)).toBeInTheDocument();
      });
    });
  });

  describe('modal reset', () => {
    it('should reset form when modal reopens', () => {
      const { rerender } = render(
        <TradingModal
          isOpen={false}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Open modal
      rerender(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Should start with fresh timer
      expect(screen.getByText('3:00')).toBeInTheDocument();

      // Should start in resources mode
      const resourceSelector = screen.getByTestId('resource-selector');
      expect(resourceSelector.querySelector('[data-mode="offer"]')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible buttons', () => {
      render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        expect(
          button.textContent?.trim() || 
          button.getAttribute('aria-label')
        ).toBeTruthy();
      });
    });

    it('should properly handle keyboard navigation', async () => {
      const { user } = render(
        <TradingModal
          isOpen={true}
          onClose={mockOnClose}
          sessionId="session-1"
          currentTeam={mockCurrentTeam}
          targetTeam={mockTargetTeam}
          onTradeCreated={mockOnTradeCreated}
        />
      );

      // Should be able to tab through focusable elements
      await user.tab();
      expect(document.activeElement).toBeInTheDocument();
    });
  });
});
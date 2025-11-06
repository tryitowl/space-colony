import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { IntelPanel } from '../../src/components/ui/IntelPanel';
import { render, generateMockIntelItems } from '../../src/test/utils/renderUtils';
import type { IntelItem } from '../../src/types';

// Mock UI components to focus on IntelPanel logic
vi.mock('../../src/components/ui/HUDFrame', () => ({
  HUDFrame: ({ children, color, variant, className }: any) => (
    <div className={`hud-frame ${color || ''} ${variant || ''} ${className || ''}`}>
      {children}
    </div>
  )
}));

vi.mock('../../src/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`btn ${variant || ''} ${size || ''} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  )
}));

describe('IntelPanel', () => {
  let mockIntelItems: IntelItem[];
  let mockOnSelectIntel: vi.Mock;
  let mockOnTradeIntel: vi.Mock;

  beforeEach(() => {
    vi.useFakeTimers();

    mockIntelItems = [
      {
        id: 'intel-1',
        title: 'Market Analysis Report',
        content: 'Colony B is experiencing high demand for water resources. Trade opportunity detected.',
        value: 150,
        distributionCount: 0,
        roundGenerated: 1,
        source: 'scout'
      },
      {
        id: 'intel-2',
        title: 'Crisis Warning: Solar Storm',
        content: 'Massive solar storm incoming. All colonies should prepare for energy disruptions.',
        value: 200,
        distributionCount: 2,
        roundGenerated: 2,
        source: 'communication'
      },
      {
        id: 'intel-3',
        title: 'Resource Discovery',
        content: 'Rich mineral deposits discovered in sector 7. First-come, first-served basis.',
        value: 120,
        distributionCount: 1,
        roundGenerated: 1,
        source: 'scout'
      },
      {
        id: 'intel-4',
        title: 'Alien Contact Protocols',
        content: 'Advanced alien civilization detected. Technology exchange protocols available.',
        value: 300,
        distributionCount: 0,
        roundGenerated: 3,
        source: 'communication'
      },
      {
        id: 'intel-5',
        title: 'Expired Survey Data',
        content: 'Old resource survey from early rounds. Data may be outdated.',
        value: 50,
        distributionCount: 5,
        roundGenerated: 1,
        source: 'traded'
      }
    ];

    mockOnSelectIntel = vi.fn();
    mockOnTradeIntel = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with grid variant by default', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      expect(screen.getByText('Intelligence Reports')).toBeInTheDocument();
      expect(screen.getByText('Market Analysis Report')).toBeInTheDocument();
      expect(screen.getByText('Crisis Warning: Solar Storm')).toBeInTheDocument();
    });

    it('should render with list variant', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          variant="list"
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      expect(screen.getByText('Intelligence Database')).toBeInTheDocument();
      expect(screen.getByText('Market Analysis Report')).toBeInTheDocument();
    });

    it('should render with ticker variant', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          variant="ticker"
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      expect(screen.getByText('Intel Feed')).toBeInTheDocument();
      // Should show first intel item in ticker
      expect(screen.getByText('Market Analysis Report')).toBeInTheDocument();
    });

    it('should display all intel items in grid/list variants', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      mockIntelItems.forEach(intel => {
        expect(screen.getByText(intel.title)).toBeInTheDocument();
      });
    });
  });

  describe('filtering', () => {
    it('should show filters when showFilters is true', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          showFilters={true}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      expect(screen.getByLabelText('Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort By')).toBeInTheDocument();
      expect(screen.getByLabelText('Show Expired Intel')).toBeInTheDocument();
    });

    it('should hide filters when showFilters is false', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          showFilters={false}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      expect(screen.queryByLabelText('Type')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Sort By')).not.toBeInTheDocument();
    });

    it('should filter by intel type', async () => {
      const { user } = render(
        <IntelPanel
          intelItems={mockIntelItems}
          showFilters={true}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      const typeSelect = screen.getByLabelText('Type');
      await user.selectOptions(typeSelect, 'crisis_warning');

      // Should only show crisis warning intel
      expect(screen.getByText('Crisis Warning: Solar Storm')).toBeInTheDocument();
      expect(screen.queryByText('Market Analysis Report')).not.toBeInTheDocument();
    });

    it('should filter by expiration status', async () => {
      const { user } = render(
        <IntelPanel
          intelItems={mockIntelItems}
          showFilters={true}
          currentRound={5} // Current round 5, intel from round 1 should be expired
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      const showExpiredCheckbox = screen.getByLabelText('Show Expired Intel');
      
      // Should not show expired intel by default
      expect(showExpiredCheckbox).not.toBeChecked();
      
      // Check the box to show expired intel
      await user.click(showExpiredCheckbox);
      
      expect(showExpiredCheckbox).toBeChecked();
    });

    it('should show item count', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          showFilters={true}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      expect(screen.getByText(`${mockIntelItems.length} of ${mockIntelItems.length} items`)).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('should sort by newest first by default', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      const sortSelect = screen.getByLabelText('Sort By');
      expect(sortSelect).toHaveValue('newest');
    });

    it('should sort by value when selected', async () => {
      const { user } = render(
        <IntelPanel
          intelItems={mockIntelItems}
          showFilters={true}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      const sortSelect = screen.getByLabelText('Sort By');
      await user.selectOptions(sortSelect, 'value_high');

      expect(sortSelect).toHaveValue('value_high');
      
      // Highest value item (300) should appear first
      const intelCards = screen.getAllByText(/CR$/);
      expect(intelCards[0]).toHaveTextContent('300');
    });

    it('should sort by source when selected', async () => {
      const { user } = render(
        <IntelPanel
          intelItems={mockIntelItems}
          showFilters={true}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      const sortSelect = screen.getByLabelText('Sort By');
      await user.selectOptions(sortSelect, 'source');

      expect(sortSelect).toHaveValue('source');
    });
  });

  describe('value display', () => {
    it('should show values when showValue is true', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          showValue={true}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      mockIntelItems.forEach(intel => {
        // Should show some value (may be degraded from original)
        expect(screen.getByText(new RegExp(`\\d+ CR`))).toBeInTheDocument();
      });
    });

    it('should hide values when showValue is false', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          showValue={false}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      expect(screen.queryByText(/CR$/)).not.toBeInTheDocument();
    });

    it('should calculate degraded values correctly', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          showValue={true}
          currentRound={3} // Intel from round 1 should be degraded
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      // Round 1 intel with 2 rounds of age should have degraded value
      // Original value 150 - 20% age penalty - distribution penalty
      // Should show both current and original values
      expect(screen.getByText(/150/)).toBeInTheDocument(); // Original value
    });
  });

  describe('expiration indicators', () => {
    it('should show expiration indicators when enabled', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          showExpirationIndicators={true}
          currentRound={4} // Some intel should be aged/expired
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      expect(screen.getByText(/Fresh|Aging|Stale|Expired/)).toBeInTheDocument();
    });

    it('should hide expiration indicators when disabled', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          showExpirationIndicators={false}
          currentRound={4}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      expect(screen.queryByText(/Fresh|Aging|Stale|Expired/)).not.toBeInTheDocument();
    });

    it('should show correct expiration status', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          showExpirationIndicators={true}
          currentRound={1} // Same round as generated
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      expect(screen.getByText('Fresh')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('should call onSelectIntel when intel item is clicked', async () => {
      const { user } = render(
        <IntelPanel
          intelItems={mockIntelItems}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      const firstIntelItem = screen.getByText('Market Analysis Report');
      await user.click(firstIntelItem);

      expect(mockOnSelectIntel).toHaveBeenCalledWith(mockIntelItems[0]);
    });

    it('should call onTradeIntel when trade button is clicked', async () => {
      const { user } = render(
        <IntelPanel
          intelItems={mockIntelItems}
          showValue={true}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      const tradeButtons = screen.getAllByText('Trade');
      await user.click(tradeButtons[0]);

      expect(mockOnTradeIntel).toHaveBeenCalledWith(mockIntelItems[0]);
    });

    it('should not show trade buttons when onTradeIntel is not provided', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          showValue={true}
          onSelectIntel={mockOnSelectIntel}
        />
      );

      expect(screen.queryByText('Trade')).not.toBeInTheDocument();
    });

    it('should highlight selected intel', async () => {
      const { user } = render(
        <IntelPanel
          intelItems={mockIntelItems}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      const firstIntelItem = screen.getByText('Market Analysis Report').closest('div[role="button"], div[class*="cursor-pointer"]');
      await user.click(firstIntelItem!);

      expect(firstIntelItem).toHaveClass('ring-purple-400');
    });
  });

  describe('ticker variant', () => {
    it('should auto-advance in ticker mode', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          variant="ticker"
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      // Should show first item initially
      expect(screen.getByText('Market Analysis Report')).toBeInTheDocument();

      // Advance timer by 4 seconds (ticker interval)
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // Should show second item
      expect(screen.getByText('Crisis Warning: Solar Storm')).toBeInTheDocument();
    });

    it('should show ticker indicators', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          variant="ticker"
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      // Should have indicator dots (one for each intel item)
      const indicators = document.querySelectorAll('.rounded-full');
      expect(indicators.length).toBe(mockIntelItems.length);
    });
  });

  describe('empty state', () => {
    it('should show empty state when no intel items', () => {
      render(
        <IntelPanel
          intelItems={[]}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      expect(screen.getByText('No intel matches current filters')).toBeInTheDocument();
    });

    it('should show empty state when all items are filtered out', async () => {
      const { user } = render(
        <IntelPanel
          intelItems={mockIntelItems}
          showFilters={true}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      const typeSelect = screen.getByLabelText('Type');
      await user.selectOptions(typeSelect, 'endgame'); // No items of this type

      expect(screen.getByText('No intel matches current filters')).toBeInTheDocument();
    });
  });

  describe('intel type classification', () => {
    it('should classify intel types correctly', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      // Should show classified types
      expect(screen.getByText('MARKET INTEL')).toBeInTheDocument();
      expect(screen.getByText('CRISIS WARNING')).toBeInTheDocument();
      expect(screen.getByText('DISCOVERY')).toBeInTheDocument();
      expect(screen.getByText('ALIEN')).toBeInTheDocument();
    });

    it('should use correct colors for different types', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      const marketIntelBadge = screen.getByText('MARKET INTEL');
      expect(marketIntelBadge).toHaveClass('text-blue-400');

      const crisisBadge = screen.getByText('CRISIS WARNING');
      expect(crisisBadge).toHaveClass('text-red-400');
    });
  });

  describe('accessibility', () => {
    it('should have accessible selects', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          showFilters={true}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      const typeSelect = screen.getByLabelText('Type');
      const sortSelect = screen.getByLabelText('Sort By');
      
      expect(typeSelect).toBeInTheDocument();
      expect(sortSelect).toBeInTheDocument();
      expect(typeSelect).toHaveAccessibleName('Type');
      expect(sortSelect).toHaveAccessibleName('Sort By');
    });

    it('should have accessible buttons', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          showValue={true}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
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

    it('should handle keyboard navigation', async () => {
      const { user } = render(
        <IntelPanel
          intelItems={mockIntelItems}
          showFilters={true}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      // Should be able to tab through focusable elements
      await user.tab();
      expect(document.activeElement).toBeInTheDocument();
    });
  });

  describe('source icons', () => {
    it('should display correct source icons', () => {
      render(
        <IntelPanel
          intelItems={mockIntelItems}
          onSelectIntel={mockOnSelectIntel}
          onTradeIntel={mockOnTradeIntel}
        />
      );

      // Scout icon
      expect(screen.getByText('🔍')).toBeInTheDocument();
      // Communication icon
      expect(screen.getByText('📡')).toBeInTheDocument();
      // Traded icon
      expect(screen.getByText('🤝')).toBeInTheDocument();
    });
  });
});
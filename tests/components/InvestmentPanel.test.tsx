import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { InvestmentPanel } from '../../src/components/investment/InvestmentPanel';
import { render, generateMockInvestmentOptions } from '../../src/test/utils/renderUtils';
import type { InvestmentAllocation } from '../../src/types/investment.types';
import { INVESTMENT_BUDGET } from '../../src/types/investment.types';

// Mock the investment service
vi.mock('../../src/services/investmentService', () => ({
  InvestmentService: {
    validateInvestment: vi.fn().mockReturnValue({
      isValid: true,
      totalCost: 0,
      remainingCredits: 1000,
      errors: [],
      warnings: []
    })
  }
}));

// Mock UI components to focus on InvestmentPanel logic
vi.mock('../../src/components/ui/Card', () => ({
  Card: ({ children, className, variant, hover, onMouseEnter, onMouseLeave, ...props }: any) => (
    <div 
      className={`card ${className || ''} ${variant || ''} ${hover ? 'hover' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...props}
    >
      {children}
    </div>
  )
}));

vi.mock('../../src/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`btn ${variant || ''} ${size || ''}`}
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('../../src/components/ui/HUDFrame', () => ({
  HUDFrame: ({ children, color, className }: any) => (
    <div className={`hud-frame ${color || ''} ${className || ''}`}>
      {children}
    </div>
  )
}));

describe('InvestmentPanel', () => {
  let mockOptions: any[];
  let mockAllocation: InvestmentAllocation;
  let mockOnAllocationChange: vi.Mock;

  beforeEach(async () => {
    mockOptions = generateMockInvestmentOptions();
    mockAllocation = {
      scouts: 0,
      productionUpgrades: 0,
      researchLabs: 0,
      communicationArray: 0,
      emergencyReserves: 0
    };
    mockOnAllocationChange = vi.fn();

    // Reset the mock service
    const { InvestmentService } = vi.mocked(await import('../../src/services/investmentService'));
    InvestmentService.validateInvestment.mockReturnValue({
      isValid: true,
      totalCost: 0,
      remainingCredits: INVESTMENT_BUDGET,
      errors: [],
      warnings: []
    });
  });

  describe('rendering', () => {
    it('should render the investment panel with budget overview', () => {
      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      // Check budget overview
      expect(screen.getByText('Investment Budget')).toBeInTheDocument();
      expect(screen.getByText('Allocate your 1000 credits wisely')).toBeInTheDocument();
      expect(screen.getByText(`${INVESTMENT_BUDGET} / ${INVESTMENT_BUDGET}`)).toBeInTheDocument();
      expect(screen.getByText('Credits Remaining')).toBeInTheDocument();
    });

    it('should render all investment options', () => {
      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      // Check that all options are rendered
      expect(screen.getByText('Scout Network')).toBeInTheDocument();
      expect(screen.getByText('Production Upgrades')).toBeInTheDocument();
      expect(screen.getByText('Research Labs')).toBeInTheDocument();

      // Check descriptions
      expect(screen.getByText('Deploy scouts to gather intelligence')).toBeInTheDocument();
      expect(screen.getByText('Improve resource production efficiency')).toBeInTheDocument();
      expect(screen.getByText('Develop new technologies')).toBeInTheDocument();
    });

    it('should display cost per level for each option', () => {
      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      expect(screen.getByText('100 credits/level')).toBeInTheDocument(); // Scouts
      expect(screen.getByText('150 credits/level')).toBeInTheDocument(); // Production
      expect(screen.getByText('200 credits/level')).toBeInTheDocument(); // Research
    });

    it('should show current levels correctly', () => {
      const allocationWithLevels: InvestmentAllocation = {
        scouts: 2,
        productionUpgrades: 1,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 0
      };

      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={allocationWithLevels}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      // Should show Level 2 for scouts, Level 1 for production, Level 0 for research
      const levelDisplays = screen.getAllByText(/Level \d+/);
      expect(levelDisplays).toHaveLength(mockOptions.length);
    });
  });

  describe('investment controls', () => {
    it('should enable increase button when within limits', () => {
      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      const increaseButtons = screen.getAllByText('+');
      increaseButtons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should disable decrease button when at level 0', () => {
      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      const decreaseButtons = screen.getAllByText('-');
      decreaseButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should call onAllocationChange when increasing level', async () => {
      const { user } = render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      const increaseButtons = screen.getAllByText('+');
      await user.click(increaseButtons[0]); // Click first increase button (scouts)

      expect(mockOnAllocationChange).toHaveBeenCalledWith({
        ...mockAllocation,
        scouts: 1
      });
    });

    it('should call onAllocationChange when decreasing level', async () => {
      const allocationWithLevels: InvestmentAllocation = {
        scouts: 2,
        productionUpgrades: 1,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 0
      };

      const { user } = render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={allocationWithLevels}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      const decreaseButtons = screen.getAllByText('-');
      await user.click(decreaseButtons[0]); // Click first decrease button

      expect(mockOnAllocationChange).toHaveBeenCalledWith({
        ...allocationWithLevels,
        scouts: 1
      });
    });

    it('should not allow increasing beyond max level', async () => {
      const maxLevelAllocation: InvestmentAllocation = {
        scouts: 5, // Max level for scouts
        productionUpgrades: 0,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 0
      };

      const { user } = render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={maxLevelAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      const increaseButtons = screen.getAllByText('+');
      expect(increaseButtons[0]).toBeDisabled(); // First button should be disabled (scouts at max)
    });
  });

  describe('budget management', () => {
    it('should update remaining credits display correctly', () => {
      const allocationWithCosts: InvestmentAllocation = {
        scouts: 2, // 200 credits
        productionUpgrades: 1, // 150 credits
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 0
      };

      // Mock validation to return proper costs
      const { InvestmentService } = vi.mocked(await import('../../src/services/investmentService'));
      InvestmentService.validateInvestment.mockReturnValue({
        isValid: true,
        totalCost: 350,
        remainingCredits: 650,
        errors: [],
        warnings: []
      });

      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={allocationWithCosts}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      expect(screen.getByText('650 / 1000')).toBeInTheDocument();
    });

    it('should show validation errors when budget is exceeded', () => {
      const { InvestmentService } = vi.mocked(await import('../../src/services/investmentService'));
      InvestmentService.validateInvestment.mockReturnValue({
        isValid: false,
        totalCost: 1200,
        remainingCredits: -200,
        errors: ['Total cost (1200) exceeds budget (1000)'],
        warnings: []
      });

      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      expect(screen.getByText('Errors')).toBeInTheDocument();
      expect(screen.getByText('Total cost (1200) exceeds budget (1000)')).toBeInTheDocument();
    });

    it('should show validation warnings for suboptimal choices', () => {
      const { InvestmentService } = vi.mocked(await import('../../src/services/investmentService'));
      InvestmentService.validateInvestment.mockReturnValue({
        isValid: true,
        totalCost: 200,
        remainingCredits: 800,
        errors: [],
        warnings: ['You have significant unused budget. Consider maximizing your investments.']
      });

      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      expect(screen.getByText('Suggestions')).toBeInTheDocument();
      expect(screen.getByText('You have significant unused budget. Consider maximizing your investments.')).toBeInTheDocument();
    });
  });

  describe('reset functionality', () => {
    it('should reset all allocations when reset button is clicked', async () => {
      const allocationWithLevels: InvestmentAllocation = {
        scouts: 2,
        productionUpgrades: 1,
        researchLabs: 1,
        communicationArray: 0,
        emergencyReserves: 0
      };

      const { user } = render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={allocationWithLevels}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      const resetButton = screen.getByText('Reset All');
      await user.click(resetButton);

      expect(mockOnAllocationChange).toHaveBeenCalledWith({
        scouts: 0,
        productionUpgrades: 0,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 0
      });
    });
  });

  describe('tooltip functionality', () => {
    it('should show tooltip on hover', async () => {
      const { user } = render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      const scoutCard = screen.getByText('Scout Network').closest('.card');
      expect(scoutCard).toBeInTheDocument();

      if (scoutCard) {
        await user.hover(scoutCard);
        
        // Wait for tooltip to appear
        await waitFor(() => {
          expect(screen.getByText('Scouts provide valuable intelligence about other colonies and resources')).toBeInTheDocument();
        });
      }
    });

    it('should hide tooltip on mouse leave', async () => {
      const { user } = render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      const scoutCard = screen.getByText('Scout Network').closest('.card');
      expect(scoutCard).toBeInTheDocument();

      if (scoutCard) {
        await user.hover(scoutCard);
        await user.unhover(scoutCard);
        
        // Tooltip should disappear
        await waitFor(() => {
          expect(screen.queryByText('Scouts provide valuable intelligence about other colonies and resources')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('accessibility', () => {
    it('should have accessible button labels', () => {
      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      // All buttons should be accessible
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        // Button should have either text content or aria-label
        expect(
          button.textContent?.trim() || 
          button.getAttribute('aria-label')
        ).toBeTruthy();
      });
    });

    it('should properly indicate disabled state', () => {
      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      const decreaseButtons = screen.getAllByText('-');
      decreaseButtons.forEach(button => {
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('disabled');
      });
    });
  });

  describe('progress indicators', () => {
    it('should show progress bars for investment levels', () => {
      const allocationWithLevels: InvestmentAllocation = {
        scouts: 2, // 40% of max (2/5)
        productionUpgrades: 2, // 50% of max (2/4)
        researchLabs: 1, // 33% of max (1/3)
        communicationArray: 0,
        emergencyReserves: 0
      };

      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={allocationWithLevels}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      // Progress bars should be present (they're styled divs with specific classes)
      const progressBars = document.querySelectorAll('.bg-gradient-to-r');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should show budget progress bar', () => {
      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      // Budget progress bar should exist
      const budgetProgressContainer = document.querySelector('.bg-space-panel-bg');
      expect(budgetProgressContainer).toBeInTheDocument();
    });
  });

  describe('cost calculations', () => {
    it('should display individual costs correctly', () => {
      const allocationWithCosts: InvestmentAllocation = {
        scouts: 2, // 200 credits
        productionUpgrades: 1, // 150 credits
        researchLabs: 0, // 0 credits
        communicationArray: 0,
        emergencyReserves: 0
      };

      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={allocationWithCosts}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      expect(screen.getByText('200 credits')).toBeInTheDocument(); // Scouts cost
      expect(screen.getByText('150 credits')).toBeInTheDocument(); // Production cost
      expect(screen.getByText('0 credits')).toBeInTheDocument(); // Research cost
    });

    it('should prevent investments when budget exceeded', () => {
      const { InvestmentService } = vi.mocked(await import('../../src/services/investmentService'));
      InvestmentService.validateInvestment.mockReturnValue({
        isValid: false,
        totalCost: 1200,
        remainingCredits: -200,
        errors: ['Budget exceeded'],
        warnings: []
      });

      render(
        <InvestmentPanel
          options={mockOptions}
          currentAllocation={mockAllocation}
          onAllocationChange={mockOnAllocationChange}
        />
      );

      // When budget is exceeded, investment cards should be disabled
      const cards = document.querySelectorAll('.card');
      cards.forEach(card => {
        expect(card).toHaveClass('opacity-60');
      });
    });
  });
});
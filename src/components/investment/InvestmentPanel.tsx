import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { HUDFrame } from '../ui/HUDFrame';
import type { 
  InvestmentOption, 
  InvestmentAllocation, 
  InvestmentValidation 
} from '../../types/investment.types';
import { InvestmentService } from '../../services/investmentService';
import { INVESTMENT_BUDGET } from '../../types/investment.types';

interface InvestmentPanelProps {
  options: InvestmentOption[];
  currentAllocation: InvestmentAllocation;
  onAllocationChange: (allocation: InvestmentAllocation) => void;
  className?: string;
}

interface InvestmentOptionCardProps {
  option: InvestmentOption;
  currentLevel: number;
  onLevelChange: (level: number) => void;
  maxAffordable: number;
  disabled?: boolean;
}

const InvestmentOptionCard: React.FC<InvestmentOptionCardProps> = ({
  option,
  currentLevel,
  onLevelChange,
  maxAffordable,
  disabled = false
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const canIncrease = currentLevel < option.maxLevel && currentLevel < maxAffordable;
  const canDecrease = currentLevel > 0;
  
  const totalCost = currentLevel * option.costPerLevel;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <Card
        variant="primary"
        hover={!disabled}
        className={cn(
          "h-full",
          disabled && "opacity-60"
        )}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-space-cyan">
                {option.name}
              </h3>
              <p className="text-sm text-space-text-muted mt-1">
                {option.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-space-text-muted">
                {option.costPerLevel} credits/level
              </div>
              <div className="text-lg font-bold text-space-cyan">
                Level {currentLevel}
              </div>
            </div>
          </div>

          {/* Level Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onLevelChange(Math.max(0, currentLevel - 1))}
                disabled={!canDecrease || disabled}
              >
                -
              </Button>
              
              <HUDFrame 
                color="cyan" 
                className="px-4 py-2 min-w-[60px] text-center"
              >
                <span className="text-space-cyan font-bold">
                  {currentLevel}
                </span>
              </HUDFrame>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onLevelChange(Math.min(option.maxLevel, maxAffordable, currentLevel + 1))}
                disabled={!canIncrease || disabled}
              >
                +
              </Button>
            </div>

            <div className="text-right">
              <div className="text-sm text-space-text-muted">
                Max: {option.maxLevel}
              </div>
              <div className="text-lg font-bold text-space-success">
                {totalCost} credits
              </div>
            </div>
          </div>

          {/* Level Bar */}
          <div className="w-full bg-space-panel-bg rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-space-cyan to-space-purple"
              initial={{ width: 0 }}
              animate={{ 
                width: `${(currentLevel / option.maxLevel) * 100}%` 
              }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Returns Display */}
          <div className="text-sm text-space-text-muted">
            <strong className="text-space-cyan">Returns:</strong> {option.returns.description}
          </div>
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2"
          >
            <div className="bg-space-black border border-space-cyan/50 rounded-lg p-3 max-w-xs shadow-xl">
              <p className="text-sm text-white">{option.tooltip}</p>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};

export const InvestmentPanel: React.FC<InvestmentPanelProps> = ({
  options,
  currentAllocation,
  onAllocationChange,
  className
}) => {
  const [validation, setValidation] = useState<InvestmentValidation>(
    () => InvestmentService.validateInvestment(currentAllocation)
  );

  // Calculate how much each option can be afforded
  const calculateMaxAffordable = (optionId: keyof InvestmentAllocation): number => {
    const option = options.find(opt => opt.id === optionId);
    if (!option) return 0;

    const currentCost = Object.entries(currentAllocation)
      .filter(([key]) => key !== optionId)
      .reduce((sum, [key, level]) => {
        const opt = options.find(o => o.id === key);
        return sum + (opt ? level * opt.costPerLevel : 0);
      }, 0);

    const availableCredits = INVESTMENT_BUDGET - currentCost;
    return Math.min(option.maxLevel, Math.floor(availableCredits / option.costPerLevel));
  };

  const handleLevelChange = (optionId: keyof InvestmentAllocation, newLevel: number) => {
    const newAllocation = {
      ...currentAllocation,
      [optionId]: Math.max(0, newLevel)
    };

    const newValidation = InvestmentService.validateInvestment(newAllocation);
    setValidation(newValidation);
    onAllocationChange(newAllocation);
  };

  const resetAllocation = () => {
    const resetAllocation = {
      scouts: 0,
      productionUpgrades: 0,
      researchLabs: 0,
      communicationArray: 0,
      emergencyReserves: 0
    };
    setValidation(InvestmentService.validateInvestment(resetAllocation));
    onAllocationChange(resetAllocation);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Budget Overview */}
      <Card variant="primary" className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-space-cyan">
              Investment Budget
            </h2>
            <p className="text-space-text-muted">
              Allocate your 1000 credits wisely
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-space-cyan">
              {validation.remainingCredits} / {INVESTMENT_BUDGET}
            </div>
            <div className="text-sm text-space-text-muted">
              Credits Remaining
            </div>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="mt-4 w-full bg-space-panel-bg rounded-full h-3 overflow-hidden">
          <motion.div
            className={cn(
              "h-full transition-colors duration-300",
              validation.remainingCredits < 0 
                ? "bg-space-danger" 
                : validation.remainingCredits < 100 
                ? "bg-space-warning" 
                : "bg-space-success"
            )}
            initial={{ width: 0 }}
            animate={{ 
              width: `${Math.min(100, (validation.totalCost / INVESTMENT_BUDGET) * 100)}%` 
            }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Reset Button */}
        <div className="mt-4 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={resetAllocation}
          >
            Reset All
          </Button>
        </div>
      </Card>

      {/* Validation Messages */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <Card variant="primary" className="mb-6">
          {validation.errors.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-bold text-space-danger mb-2">
                Errors
              </h3>
              <ul className="space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index} className="text-space-danger text-sm flex items-center">
                    <span className="mr-2">⚠</span>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-space-warning mb-2">
                Suggestions
              </h3>
              <ul className="space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index} className="text-space-warning text-sm flex items-center">
                    <span className="mr-2">💡</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Investment Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {options.map((option) => (
          <InvestmentOptionCard
            key={option.id}
            option={option}
            currentLevel={currentAllocation[option.id]}
            onLevelChange={(level) => handleLevelChange(option.id, level)}
            maxAffordable={calculateMaxAffordable(option.id)}
            disabled={!validation.isValid && validation.remainingCredits < 0}
          />
        ))}
      </div>
    </div>
  );
};
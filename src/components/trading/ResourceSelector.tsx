import React from 'react';
import type { Resources } from '../../types';

interface ResourceSelectorProps {
  resources: Resources;
  selectedResources: Partial<Resources>;
  onResourceChange: (resources: Partial<Resources>) => void;
  mode: 'offer' | 'request';
}

export const ResourceSelector: React.FC<ResourceSelectorProps> = ({
  resources,
  selectedResources,
  onResourceChange,
  mode
}) => {
  const resourceCategories = {
    basic: {
      name: 'Basic Resources',
      items: [
        { key: 'oxygen', name: 'Oxygen', icon: '🫁', consumedPerRound: 2 },
        { key: 'food', name: 'Food', icon: '🍎', consumedPerRound: 2 },
        { key: 'water', name: 'Water', icon: '💧', consumedPerRound: 1 },
        { key: 'energy', name: 'Energy', icon: '⚡', consumedPerRound: 3 },
      ]
    },
    advanced: {
      name: 'Advanced Materials',
      items: [
        { key: 'minerals', name: 'Minerals', icon: '💎' },
        { key: 'alloys', name: 'Alloys', icon: '🔩' },
        { key: 'techComponents', name: 'Tech Components', icon: '🔧' },
      ]
    },
    services: {
      name: 'Services & Technology',
      items: [
        { key: 'defenseContracts', name: 'Defense Contracts', icon: '🛡️' },
        { key: 'systemRepairs', name: 'System Repairs', icon: '🔧' },
        { key: 'transportRoutes', name: 'Transport Routes', icon: '🚀' },
        { key: 'techPatents', name: 'Tech Patents', icon: '📋' },
        { key: 'blueprints', name: 'Blueprints', icon: '📐' },
        { key: 'alienTech', name: 'Alien Tech', icon: '👽' },
      ]
    },
    currency: {
      name: 'Credits',
      items: [
        { key: 'credits', name: 'Credits', icon: '💰' },
      ]
    }
  };

  const updateResourceAmount = (resourceKey: string, amount: number) => {
    const newResources = { ...selectedResources };
    
    if (amount <= 0) {
      delete newResources[resourceKey as keyof Resources];
    } else {
      // Only update numeric resources
      const key = resourceKey as keyof Resources;
      const currentValue = resources[key];
      if (typeof currentValue === 'number') {
        newResources[key] = amount;
      }
    }
    
    onResourceChange(newResources);
  };

  const getCurrentAmount = (resourceKey: string): number => {
    const value = selectedResources[resourceKey as keyof Resources];
    return typeof value === 'number' ? value : 0;
  };

  const getAvailableAmount = (resourceKey: string): number => {
    const value = resources[resourceKey as keyof Resources];
    return typeof value === 'number' ? value : 0;
  };

  const ResourceInput: React.FC<{
    resourceKey: string;
    resourceName: string;
    icon: string;
    available: number;
    consumedPerRound?: number;
  }> = ({ resourceKey, resourceName, icon, available, consumedPerRound }) => {
    const current = getCurrentAmount(resourceKey);
    const maxAmount = mode === 'offer' ? available : 999;
    
    return (
      <div className="flex items-center justify-between p-3 bg-space-panel-bg rounded-lg border border-white/10">
        <div className="flex items-center space-x-3">
          <span className="text-lg">{icon}</span>
          <div>
            <div className="font-medium text-sm">{resourceName}</div>
            <div className="text-xs text-space-text-secondary">
              {mode === 'offer' ? `Available: ${available}` : `They have: ${available}`}
              {consumedPerRound && (
                <span className="text-space-warning ml-2">
                  (-{consumedPerRound}/round)
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => updateResourceAmount(resourceKey, Math.max(0, current - 1))}
            className="w-8 h-8 rounded bg-space-danger/20 border border-space-danger/50 text-space-danger hover:bg-space-danger/30 transition-colors"
            disabled={current <= 0}
          >
            -
          </button>
          
          <input
            type="number"
            min="0"
            max={maxAmount}
            value={current}
            onChange={(e) => {
              const value = Math.min(maxAmount, Math.max(0, parseInt(e.target.value) || 0));
              updateResourceAmount(resourceKey, value);
            }}
            className="w-16 h-8 text-center bg-space-panel-bg border border-white/20 rounded text-white font-mono text-sm focus:border-space-cyan focus:outline-none"
          />
          
          <button
            onClick={() => updateResourceAmount(resourceKey, Math.min(maxAmount, current + 1))}
            className="w-8 h-8 rounded bg-space-success/20 border border-space-success/50 text-space-success hover:bg-space-success/30 transition-colors"
            disabled={current >= maxAmount}
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {Object.entries(resourceCategories).map(([categoryKey, category]) => {
        const hasAvailableResources = category.items.some(item => 
          getAvailableAmount(item.key) > 0
        );
        
        if (!hasAvailableResources && mode === 'offer') {
          return null; // Don't show categories with no available resources for offering
        }

        return (
          <div key={categoryKey}>
            <h4 className="text-sm font-semibold text-space-text-secondary mb-2 uppercase tracking-wide">
              {category.name}
            </h4>
            <div className="space-y-2">
              {category.items.map((item) => {
                const available = getAvailableAmount(item.key);
                
                // Skip resources that aren't available for offering
                if (mode === 'offer' && available <= 0) {
                  return null;
                }

                return (
                  <ResourceInput
                    key={item.key}
                    resourceKey={item.key}
                    resourceName={item.name}
                    icon={item.icon}
                    available={available}
                    consumedPerRound={'consumedPerRound' in item ? item.consumedPerRound : undefined}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quick preset buttons for common trades */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-space-text-secondary mb-2 uppercase tracking-wide">
          Quick Presets
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (mode === 'offer') {
                onResourceChange({
                  oxygen: Math.min(5, getAvailableAmount('oxygen')),
                  food: Math.min(5, getAvailableAmount('food'))
                });
              } else {
                onResourceChange({
                  minerals: 10,
                  energy: 10
                });
              }
            }}
            className="p-2 text-xs bg-space-panel-bg border border-white/20 rounded hover:border-space-cyan/50 transition-colors"
          >
            {mode === 'offer' ? 'Basic Bundle' : 'Material Request'}
          </button>
          
          <button
            onClick={() => {
              if (mode === 'offer') {
                onResourceChange({
                  credits: Math.min(100, getAvailableAmount('credits'))
                });
              } else {
                onResourceChange({
                  techComponents: 5
                });
              }
            }}
            className="p-2 text-xs bg-space-panel-bg border border-white/20 rounded hover:border-space-cyan/50 transition-colors"
          >
            {mode === 'offer' ? 'Credits Only' : 'Tech Request'}
          </button>
        </div>
      </div>
    </div>
  );
};
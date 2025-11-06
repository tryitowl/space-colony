import React from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import type { Resources, ColonyType } from '../../types';
import { cn } from '../../utils/cn';

interface TradeTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  offer: Partial<Resources>;
  request: Partial<Resources>;
  category: 'survival' | 'production' | 'strategic' | 'emergency';
  suitableFor: ColonyType[];
}

interface QuickTradeTemplatesProps {
  currentResources: Resources;
  colonyType: ColonyType;
  onTemplateSelect: (template: TradeTemplate) => void;
  className?: string;
}

export const QuickTradeTemplates: React.FC<QuickTradeTemplatesProps> = ({
  currentResources,
  colonyType,
  onTemplateSelect,
  className
}) => {
  // Define trade templates based on common patterns
  const tradeTemplates: TradeTemplate[] = [
    // Survival Templates
    {
      id: 'basic_survival',
      name: 'Basic Survival',
      description: 'Trade surplus for essential life support',
      icon: '🆘',
      offer: { credits: 50 },
      request: { oxygen: 3, food: 3, water: 2 },
      category: 'survival',
      suitableFor: ['mining', 'manufacturing', 'military', 'research']
    },
    {
      id: 'energy_emergency',
      name: 'Energy Emergency',
      description: 'Trade resources for critical energy',
      icon: '⚡',
      offer: { minerals: 5, credits: 30 },
      request: { energy: 8 },
      category: 'emergency',
      suitableFor: ['mining', 'manufacturing']
    },
    {
      id: 'food_crisis',
      name: 'Food Crisis',
      description: 'Exchange tech/materials for food',
      icon: '🍎',
      offer: { techComponents: 3, credits: 40 },
      request: { food: 10, water: 5 },
      category: 'emergency',
      suitableFor: ['research', 'manufacturing', 'military']
    },

    // Production Templates
    {
      id: 'raw_to_advanced',
      name: 'Raw → Advanced',
      description: 'Trade raw materials for processed goods',
      icon: '🔧',
      offer: { minerals: 10, energy: 5 },
      request: { alloys: 4, techComponents: 2 },
      category: 'production',
      suitableFor: ['mining']
    },
    {
      id: 'food_surplus',
      name: 'Food Surplus',
      description: 'Trade excess food for materials',
      icon: '🌾',
      offer: { food: 8, water: 6 },
      request: { minerals: 6, credits: 60 },
      category: 'production',
      suitableFor: ['agricultural']
    },
    {
      id: 'tech_exchange',
      name: 'Tech Exchange',
      description: 'Trade research output for resources',
      icon: '🔬',
      offer: { techComponents: 5, blueprints: 1 },
      request: { minerals: 8, energy: 10 },
      category: 'production',
      suitableFor: ['research']
    },

    // Strategic Templates
    {
      id: 'defense_package',
      name: 'Defense Package',
      description: 'Trade security for resources',
      icon: '🛡️',
      offer: { defenseContracts: 3, systemRepairs: 2 },
      request: { food: 6, energy: 8, credits: 80 },
      category: 'strategic',
      suitableFor: ['military']
    },
    {
      id: 'transport_deal',
      name: 'Transport Deal',
      description: 'Trade logistics for resources',
      icon: '🚀',
      offer: { transportRoutes: 2, credits: 50 },
      request: { alloys: 5, techComponents: 3 },
      category: 'strategic',
      suitableFor: ['trade_hub']
    },
    {
      id: 'manufacturing_bulk',
      name: 'Manufacturing Bulk',
      description: 'Trade manufactured goods in bulk',
      icon: '🏭',
      offer: { alloys: 8, systemRepairs: 3 },
      request: { minerals: 15, energy: 12 },
      category: 'production',
      suitableFor: ['manufacturing']
    },

    // Balanced Templates
    {
      id: 'balanced_exchange',
      name: 'Balanced Exchange',
      description: 'Even trade of mixed resources',
      icon: '⚖️',
      offer: { oxygen: 3, food: 3, credits: 40 },
      request: { minerals: 4, energy: 6, techComponents: 1 },
      category: 'strategic',
      suitableFor: ['trade_hub', 'agricultural']
    },
    {
      id: 'credit_conversion',
      name: 'Credit Conversion',
      description: 'Convert credits to resources',
      icon: '💰',
      offer: { credits: 100 },
      request: { oxygen: 4, food: 4, water: 3, energy: 5 },
      category: 'survival',
      suitableFor: ['trade_hub']
    },

    // Advanced Templates
    {
      id: 'alien_tech_trade',
      name: 'Alien Tech Trade',
      description: 'High-value alien technology exchange',
      icon: '👽',
      offer: { alienTech: 1 },
      request: { credits: 200, techComponents: 10 },
      category: 'strategic',
      suitableFor: ['research', 'trade_hub']
    },
    {
      id: 'patent_licensing',
      name: 'Patent Licensing',
      description: 'License technology for ongoing benefits',
      icon: '📋',
      offer: { techPatents: 2 },
      request: { credits: 150, blueprints: 2 },
      category: 'strategic',
      suitableFor: ['research']
    }
  ];

  // Filter templates based on colony type and resource availability
  const availableTemplates = tradeTemplates.filter(template => {
    // Check if template is suitable for colony type
    if (!template.suitableFor.includes(colonyType)) return false;

    // Check if we have the resources to offer
    const canAfford = Object.entries(template.offer).every(([resource, amount]) => {
      const currentValue = currentResources[resource as keyof Resources];
      // Type guard: only compare if it's a number (not IntelItem[])
      if (typeof currentValue === 'number' && typeof amount === 'number') {
        return currentValue >= amount;
      }
      // For non-numeric resources (like intel), skip this check
      return true;
    });

    return canAfford;
  });

  // Group templates by category
  const templatesByCategory = availableTemplates.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, TradeTemplate[]>);

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'survival': return 'border-space-danger';
      case 'emergency': return 'border-space-warning';
      case 'production': return 'border-space-success';
      case 'strategic': return 'border-space-cyan';
      default: return 'border-space-text-secondary';
    }
  };

  const getCategoryTitle = (category: string): string => {
    switch (category) {
      case 'survival': return '🆘 Survival Trades';
      case 'emergency': return '⚠️ Emergency Trades';
      case 'production': return '🏭 Production Trades';
      case 'strategic': return '🎯 Strategic Trades';
      default: return category;
    }
  };

  const formatResources = (resources: Partial<Resources>): string => {
    return Object.entries(resources)
      .filter(([, amount]) => (amount as number) > 0)
      .map(([resource, amount]) => `${amount} ${resource}`)
      .join(', ');
  };

  return (
    <GlassPanel className={cn("p-4", className)}>
      <h3 className="text-lg font-semibold mb-4 text-space-cyan font-orbitron">
        ⚡ Quick Trade Templates
      </h3>

      {Object.keys(templatesByCategory).length === 0 ? (
        <div className="text-center text-space-text-secondary py-6">
          <p>No suitable trade templates available</p>
          <p className="text-sm mt-2">Generate more resources to unlock templates</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(templatesByCategory).map(([category, templates]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-space-text-secondary mb-3 uppercase tracking-wide">
                {getCategoryTitle(category)}
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((template) => (
                  <GlassPanel
                    key={template.id}
                    className={cn(
                      "p-3 border-l-4 hover:border-opacity-100 transition-all duration-200 cursor-pointer",
                      "hover:scale-105 hover:shadow-lg",
                      getCategoryColor(template.category)
                    )}
                    onClick={() => onTemplateSelect(template)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{template.icon}</div>
                      
                      <div className="flex-1">
                        <h5 className="font-semibold text-sm text-white mb-1">
                          {template.name}
                        </h5>
                        
                        <p className="text-xs text-space-text-secondary mb-2">
                          {template.description}
                        </p>
                        
                        <div className="space-y-1">
                          <div className="text-xs">
                            <span className="text-space-success">Offer:</span>
                            <span className="ml-2 font-mono">
                              {formatResources(template.offer)}
                            </span>
                          </div>
                          
                          <div className="text-xs">
                            <span className="text-space-warning">Request:</span>
                            <span className="ml-2 font-mono">
                              {formatResources(template.request)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassPanel>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-space-text-secondary">
        <p>💡 <strong>Tip:</strong> These templates are based on successful trade patterns</p>
        <p>📊 Templates adapt to your colony type and available resources</p>
        <p>🎯 Click any template to auto-fill the trade interface</p>
      </div>
    </GlassPanel>
  );
};
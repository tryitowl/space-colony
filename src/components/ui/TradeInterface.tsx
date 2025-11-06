import React, { useState } from 'react';
import type { TradeInterfaceProps, TradeItem } from '../../types/ui';
import type { ResourceType } from '../../types/game';
import { cn } from '../../utils/cn';
import { Modal } from './Modal';
import { Button } from './Button';
import { ResourceDisplay } from './ResourceDisplay';
import { Timer } from './Timer';
import { Badge } from './Badge';

/**
 * TradeInterface - Drag-and-drop trading component
 * 
 * Features:
 * - Split-screen resource view (yours vs theirs)
 * - Drag-and-drop resource selection
 * - Real-time trade value calculation
 * - Time limit countdown
 * - Trade offer validation
 * - Loading states
 * - Accessibility support
 * - Touch-friendly for mobile
 */
const TradeInterface: React.FC<TradeInterfaceProps> = ({
  playerResources,
  targetColonyId,
  targetResources = [],
  onTradeSubmit,
  onCancel,
  loading = false,
  timeLimit,
  className,
  testId,
}) => {
  const [offering, setOffering] = useState<TradeItem[]>([]);
  const [requesting, setRequesting] = useState<TradeItem[]>([]);
  const [message, setMessage] = useState('');
  const [draggedResource, setDraggedResource] = useState<{ type: ResourceType; source: 'player' | 'target' } | null>(null);

  // Calculate trade value (simplified scoring)
  const calculateTradeValue = () => {
    const offeringValue = offering.reduce((sum, item) => {
      const resource = playerResources.find(r => r.type === item.resourceType);
      return sum + (item.amount * (resource?.production || 1));
    }, 0);

    const requestingValue = requesting.reduce((sum, item) => {
      const resource = targetResources.find(r => r.type === item.resourceType);
      return sum + (item.amount * (resource?.production || 1));
    }, 0);

    return { offering: offeringValue, requesting: requestingValue };
  };

  // Add resource to trade list
  const addToTradeList = (
    resourceType: ResourceType,
    amount: number,
    listType: 'offering' | 'requesting'
  ) => {
    const setList = listType === 'offering' ? setOffering : setRequesting;
    
    setList(current => {
      const existing = current.find(item => item.resourceType === resourceType);
      if (existing) {
        return current.map(item =>
          item.resourceType === resourceType
            ? { ...item, amount: Math.min(item.amount + amount, item.maxAmount || 999) }
            : item
        );
      } else {
        const maxAmount = listType === 'offering' 
          ? playerResources.find(r => r.type === resourceType)?.amount || 0
          : targetResources.find(r => r.type === resourceType)?.amount || 999;
        
        return [...current, { resourceType, amount, maxAmount }];
      }
    });
  };

  // Remove resource from trade list
  const removeFromTradeList = (resourceType: ResourceType, listType: 'offering' | 'requesting') => {
    const setList = listType === 'offering' ? setOffering : setRequesting;
    setList(current => current.filter(item => item.resourceType !== resourceType));
  };

  // Update resource amount
  const updateResourceAmount = (
    resourceType: ResourceType,
    amount: number,
    listType: 'offering' | 'requesting'
  ) => {
    const setList = listType === 'offering' ? setOffering : setRequesting;
    setList(current =>
      current.map(item =>
        item.resourceType === resourceType
          ? { ...item, amount: Math.max(0, Math.min(amount, item.maxAmount || 999)) }
          : item
      ).filter(item => item.amount > 0)
    );
  };

  // Drag and drop handlers
  const handleDragStart = (resourceType: ResourceType, source: 'player' | 'target') => {
    setDraggedResource({ type: resourceType, source });
  };

  const handleDragEnd = () => {
    setDraggedResource(null);
  };

  const handleDrop = (listType: 'offering' | 'requesting') => {
    if (!draggedResource) return;

    // Validate drop
    if (listType === 'offering' && draggedResource.source !== 'player') return;
    if (listType === 'requesting' && draggedResource.source !== 'target') return;

    addToTradeList(draggedResource.type, 1, listType);
    setDraggedResource(null);
  };

  // Validate trade offer
  const isTradeValid = () => {
    return offering.length > 0 && requesting.length > 0 && !loading;
  };

  // Submit trade
  const handleSubmit = () => {
    if (!isTradeValid()) return;

    onTradeSubmit({
      fromColonyId: 'player', // This should be the actual player colony ID
      toColonyId: targetColonyId,
      offering,
      requesting,
      message: message || undefined,
    });
  };

  const tradeValue = calculateTradeValue();

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      size="xl"
      title="Trade Negotiation"
      className={className}
      data-testid={testId}
    >
      <div className="space-y-6">
        {/* Timer */}
        {timeLimit && (
          <div className="flex justify-center">
            <Timer
              duration={timeLimit}
              urgent={true}
              format="compact"
              onComplete={onCancel}
            />
          </div>
        )}

        {/* Trade interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Your resources */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-space font-semibold text-lg text-accent-primary">
                Your Resources
              </h3>
              <Badge variant="primary" size="sm">
                {playerResources.length} Types
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {playerResources.map(resource => (
                <div
                  key={String(resource.type)}
                  draggable
                  onDragStart={() => handleDragStart(resource.type, 'player')}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <div onClick={() => addToTradeList(resource.type, 1, 'offering')}>
                    <ResourceDisplay
                      resource={resource}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Target resources */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-space font-semibold text-lg text-accent-secondary">
                Their Resources
              </h3>
              <Badge variant="info" size="sm">
                {targetResources.length} Types
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {targetResources.map(resource => (
                <div
                  key={String(resource.type)}
                  draggable
                  onDragStart={() => handleDragStart(resource.type, 'target')}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <div onClick={() => addToTradeList(resource.type, 1, 'requesting')}>
                    <ResourceDisplay
                      resource={resource}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trade offer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Offering */}
          <div
            className={cn(
              'space-y-4 p-4 border-2 border-dashed rounded-lg transition-colors',
              draggedResource?.source === 'player' 
                ? 'border-accent-primary bg-accent-primary/10' 
                : 'border-panel-border'
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop('offering')}
          >
            <h4 className="font-space font-semibold text-accent-primary">
              You Offer ({tradeValue.offering} pts)
            </h4>
            
            {offering.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                Drag resources here or click to add
              </div>
            ) : (
              <div className="space-y-2">
                {offering.map(item => (
                  <div key={String(item.resourceType)} className="flex items-center gap-3 p-2 bg-panel-bg rounded">
                    <span className="text-lg">
                      {playerResources.find(r => r.type === item.resourceType)?.type === 'oxygen' ? '🔵' :
                       playerResources.find(r => r.type === item.resourceType)?.type === 'food' ? '🍎' :
                       playerResources.find(r => r.type === item.resourceType)?.type === 'water' ? '💧' :
                       playerResources.find(r => r.type === item.resourceType)?.type === 'energy' ? '⚡' :
                       playerResources.find(r => r.type === item.resourceType)?.type === 'minerals' ? '⛏️' :
                       playerResources.find(r => r.type === item.resourceType)?.type === 'techComponents' ? '🔬' :
                       playerResources.find(r => r.type === item.resourceType)?.type === 'marketIntel' ? '📡' : '🛡️'}
                    </span>
                    <span className="flex-1 capitalize">{String(item.resourceType)}</span>
                    <input
                      type="number"
                      min="1"
                      max={item.maxAmount}
                      value={item.amount}
                      onChange={(e) => updateResourceAmount(item.resourceType, parseInt(e.target.value) || 0, 'offering')}
                      className="w-16 px-2 py-1 bg-panel-bg border border-panel-border rounded text-center"
                    />
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => removeFromTradeList(item.resourceType, 'offering')}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Requesting */}
          <div
            className={cn(
              'space-y-4 p-4 border-2 border-dashed rounded-lg transition-colors',
              draggedResource?.source === 'target' 
                ? 'border-accent-secondary bg-accent-secondary/10' 
                : 'border-panel-border'
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop('requesting')}
          >
            <h4 className="font-space font-semibold text-accent-secondary">
              You Request ({tradeValue.requesting} pts)
            </h4>
            
            {requesting.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                Drag resources here or click to add
              </div>
            ) : (
              <div className="space-y-2">
                {requesting.map(item => (
                  <div key={String(item.resourceType)} className="flex items-center gap-3 p-2 bg-panel-bg rounded">
                    <span className="text-lg">
                      {item.resourceType === 'oxygen' ? '🔵' :
                       item.resourceType === 'food' ? '🍎' :
                       item.resourceType === 'water' ? '💧' :
                       item.resourceType === 'energy' ? '⚡' :
                       item.resourceType === 'minerals' ? '⛏️' :
                       item.resourceType === 'techComponents' ? '🔬' :
                       item.resourceType === 'credits' ? '💵' : '🛡️'}
                    </span>
                    <span className="flex-1 capitalize">{String(item.resourceType)}</span>
                    <input
                      type="number"
                      min="1"
                      max={item.maxAmount}
                      value={item.amount}
                      onChange={(e) => updateResourceAmount(item.resourceType, parseInt(e.target.value) || 0, 'requesting')}
                      className="w-16 px-2 py-1 bg-panel-bg border border-panel-border rounded text-center"
                    />
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => removeFromTradeList(item.resourceType, 'requesting')}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Trade Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message to your trade offer..."
            className="w-full px-3 py-2 bg-panel-bg border border-panel-border rounded-lg resize-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
            rows={2}
            maxLength={200}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-panel-border">
          <div className="text-sm text-text-secondary">
            Trade Balance: {tradeValue.offering === tradeValue.requesting ? 'Fair' : 
                          tradeValue.offering > tradeValue.requesting ? 'Favorable to them' : 'Favorable to you'}
          </div>
          
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!isTradeValid()}
              loading={loading}
            >
              {loading ? 'Submitting...' : 'Submit Trade Offer'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

TradeInterface.displayName = 'TradeInterface';

export { TradeInterface };
export type { TradeInterfaceProps };
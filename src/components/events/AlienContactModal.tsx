import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { GlassPanel } from '../ui/GlassPanel';
import { HUDFrame } from '../ui/HUDFrame';
import { ResourceDisplay } from '../ui/ResourceDisplay';
import { cn } from '../../utils/cn';
import type { 
  AlienContactEvent, 
  AlienCivilization, 
  AlienResourceOffer, 
  AlienTrade,
  Resources 
} from '../../types/game';

interface AlienContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  alienEvent: AlienContactEvent;
  playerResources: Resources;
  onTrade: (trade: Omit<AlienTrade, 'id' | 'timestamp'>) => void;
  teamId: string;
}

interface TradeCart {
  offering: Partial<Resources>;
  receiving: Partial<Resources>;
  totalCost: number;
}

export const AlienContactModal: React.FC<AlienContactModalProps> = ({
  isOpen,
  onClose,
  alienEvent,
  playerResources,
  onTrade,
  teamId
}) => {
  const [selectedOffer, setSelectedOffer] = useState<AlienResourceOffer | null>(null);
  const [tradeCart, setTradeCart] = useState<TradeCart>({
    offering: {},
    receiving: {},
    totalCost: 0
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'arrival' | 'communication' | 'trading'>('arrival');

  const { alienCivilization, availableResources } = alienEvent;

  useEffect(() => {
    if (isOpen) {
      setAnimationPhase('arrival');
      const timer1 = setTimeout(() => setAnimationPhase('communication'), 2000);
      const timer2 = setTimeout(() => setAnimationPhase('trading'), 4000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isOpen]);

  const handleOfferSelect = (offer: AlienResourceOffer) => {
    setSelectedOffer(offer);
    setTradeCart({
      offering: offer.cost,
      receiving: { [offer.resourceType]: offer.quantity },
      totalCost: calculateTotalCost(offer.cost)
    });
  };

  const calculateTotalCost = (cost: Partial<Resources>): number => {
    return Object.entries(cost).reduce((total, [resource, amount]) => {
      // Assign value weights to different resource types
      const weights: Record<string, number> = {
        oxygen: 10, food: 10, water: 15, energy: 8,
        minerals: 5, alloys: 20, techComponents: 50,
        credits: 1, techPatents: 100, blueprints: 75
      };
      return total + (amount || 0) * (weights[resource] || 1);
    }, 0);
  };

  const canAffordTrade = (cost: Partial<Resources>): boolean => {
    return Object.entries(cost).every(([resource, amount]) => {
      const playerAmount = playerResources[resource as keyof Resources] as number;
      return playerAmount >= (amount || 0);
    });
  };

  const handleConfirmTrade = () => {
    if (selectedOffer && canAffordTrade(selectedOffer.cost)) {
      onTrade({
        teamId,
        offeredResources: tradeCart.offering,
        receivedResources: tradeCart.receiving,
        alienCivilization: alienCivilization.name
      });
      setShowConfirmation(false);
      setSelectedOffer(null);
      setTradeCart({ offering: {}, receiving: {}, totalCost: 0 });
    }
  };

  const getDemeanorColor = (demeanor: AlienCivilization['demeanor']) => {
    switch (demeanor) {
      case 'peaceful': return 'text-green-400';
      case 'cautious': return 'text-yellow-400';
      case 'aggressive': return 'text-red-400';
      case 'curious': return 'text-blue-400';
      default: return 'text-white';
    }
  };

  const getRarityGlow = (rarity: AlienResourceOffer['rarity']) => {
    switch (rarity) {
      case 'common': return 'border-blue-400/30 shadow-blue-400/20';
      case 'rare': return 'border-purple-400/50 shadow-purple-400/30';
      case 'legendary': return 'border-yellow-400/70 shadow-yellow-400/40';
      default: return 'border-gray-400/30';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="relative overflow-hidden">
        {/* Animated background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-blue-900/20 to-green-900/20" />
        
        {/* Particle effects for alien arrival */}
        <AnimatePresence>
          {animationPhase === 'arrival' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                  initial={{
                    x: Math.random() * 600,
                    y: Math.random() * 400,
                    scale: 0,
                    opacity: 0
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                    y: [Math.random() * 400, Math.random() * 400 - 100]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 p-6 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center space-y-2"
          >
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              ALIEN CONTACT DETECTED
            </h2>
            <p className="text-cyan-300 text-sm uppercase tracking-wider">
              Round {alienEvent.round} • Milestone Event
            </p>
          </motion.div>

          {/* Alien Civilization Info */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <HUDFrame className="p-4 mb-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {alienCivilization.name}
                  </h3>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                    getDemeanorColor(alienCivilization.demeanor)
                  )}>
                    {alienCivilization.demeanor}
                  </span>
                </div>
                
                <p className="text-gray-300 text-sm leading-relaxed">
                  {alienCivilization.description}
                </p>
                
                <div className="bg-cyan-900/20 rounded-lg p-3 border border-cyan-400/30">
                  <p className="text-cyan-300 text-sm">
                    <span className="font-semibold">Technology:</span> {alienCivilization.technology}
                  </p>
                </div>
              </div>
            </HUDFrame>
          </motion.div>

          {/* Phase-based content */}
          <AnimatePresence mode="wait">
            {animationPhase === 'arrival' && (
              <motion.div
                key="arrival"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center py-8"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 mx-auto mb-4 border-2 border-cyan-400 rounded-full border-dashed"
                />
                <p className="text-cyan-300 text-lg">
                  Establishing communication protocols...
                </p>
              </motion.div>
            )}

            {animationPhase === 'communication' && (
              <motion.div
                key="communication"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="text-center py-8"
              >
                <div className="bg-green-900/20 rounded-lg p-4 border border-green-400/30">
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-green-300 text-lg mb-2"
                  >
                    "Greetings, star-travelers. We offer knowledge and resources."
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="text-green-200 text-sm"
                  >
                    Translation complete. Trade interface initializing...
                  </motion.p>
                </div>
              </motion.div>
            )}

            {animationPhase === 'trading' && (
              <motion.div
                key="trading"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  Available Alien Resources
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {availableResources.map((offer, index) => (
                    <motion.div
                      key={`${offer.resourceType}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <GlassPanel
                        className={cn(
                          "p-4 cursor-pointer transition-all duration-200 hover:scale-105",
                          getRarityGlow(offer.rarity),
                          selectedOffer === offer && "border-cyan-400 shadow-cyan-400/50"
                        )}
                        onClick={() => handleOfferSelect(offer)}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-white capitalize">
                              {offer.resourceType.replace(/([A-Z])/g, ' $1').trim()}
                            </h4>
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-bold uppercase",
                              offer.rarity === 'common' && "bg-blue-500/20 text-blue-300",
                              offer.rarity === 'rare' && "bg-purple-500/20 text-purple-300",
                              offer.rarity === 'legendary' && "bg-yellow-500/20 text-yellow-300"
                            )}>
                              {offer.rarity}
                            </span>
                          </div>
                          
                          <p className="text-gray-300 text-sm">
                            {offer.description}
                          </p>
                          
                          <div className="bg-gray-800/50 rounded p-2">
                            <p className="text-cyan-300 text-sm font-semibold mb-1">
                              Quantity: {offer.quantity}
                            </p>
                            <p className="text-yellow-300 text-xs font-semibold mb-2">
                              Cost:
                            </p>
                            <div className="space-y-1">
                              {Object.entries(offer.cost).map(([resource, amount]) => (
                                <div key={resource} className="flex justify-between text-xs">
                                  <span className="text-gray-300 capitalize">
                                    {resource.replace(/([A-Z])/g, ' $1').trim()}:
                                  </span>
                                  <span className={cn(
                                    "font-semibold",
                                    canAffordTrade({ [resource]: amount }) ? "text-green-300" : "text-red-300"
                                  )}>
                                    {amount}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </GlassPanel>
                    </motion.div>
                  ))}
                </div>

                {/* Trade confirmation */}
                {selectedOffer && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/50"
                  >
                    <h4 className="text-white font-semibold mb-3">Trade Summary</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-red-300 text-sm font-semibold mb-2">You Give:</p>
                        {Object.entries(tradeCart.offering).map(([resource, amount]) => (
                          <ResourceDisplay
                            key={resource}
                            type={resource as keyof Resources}
                            amount={amount as number}
                            className="mb-1"
                          />
                        ))}
                      </div>
                      <div>
                        <p className="text-green-300 text-sm font-semibold mb-2">You Receive:</p>
                        {Object.entries(tradeCart.receiving).map(([resource, amount]) => (
                          <ResourceDisplay
                            key={resource}
                            type={resource as keyof Resources}
                            amount={amount as number}
                            className="mb-1"
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-600/50">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedOffer(null)}
                        className="text-gray-300 border-gray-600"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => setShowConfirmation(true)}
                        disabled={!canAffordTrade(selectedOffer.cost)}
                        className={cn(
                          "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600",
                          !canAffordTrade(selectedOffer.cost) && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {canAffordTrade(selectedOffer.cost) ? "Confirm Trade" : "Insufficient Resources"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="flex justify-between items-center pt-4 border-t border-gray-600/50"
          >
            <p className="text-gray-400 text-sm">
              Contact expires in: {Math.ceil(alienEvent.duration / 60000)} minutes
            </p>
            <Button
              variant="outline"
              onClick={onClose}
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              Close Communication
            </Button>
          </motion.div>
        </div>

        {/* Confirmation Dialog */}
        <AnimatePresence>
          {showConfirmation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-gray-900 border border-cyan-400/50 rounded-lg p-6 max-w-md mx-4"
              >
                <h3 className="text-xl font-bold text-white mb-4">
                  Confirm Alien Trade
                </h3>
                <p className="text-gray-300 mb-6">
                  This trade cannot be undone. Are you sure you want to proceed with this exchange?
                </p>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmation(false)}
                    className="text-gray-300 border-gray-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmTrade}
                    className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                  >
                    Execute Trade
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
};
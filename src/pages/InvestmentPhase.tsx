import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { HUDFrame } from '../components/ui/HUDFrame';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { InvestmentPanel } from '../components/investment/InvestmentPanel';
import { GameService } from '../services/GameService';
import { InvestmentService } from '../services/investmentService';
import type { 
  GameSession, 
  Colony,
  Investments
} from '../types';
import type { 
  InvestmentAllocation, 
  InvestmentValidation,
  InvestmentEffects
} from '../types/investment.types';

interface InvestmentPhaseProps {
  className?: string;
}

export const InvestmentPhase: React.FC<InvestmentPhaseProps> = ({ className }) => {
  const { sessionId, teamId } = useParams<{ sessionId: string; teamId: string }>();
  const navigate = useNavigate();

  // State
  const [session, setSession] = useState<GameSession | null>(null);
  const [team, setTeam] = useState<Colony | null>(null);
  const [allocation, setAllocation] = useState<InvestmentAllocation>({
    scouts: 0,
    productionUpgrades: 0,
    researchLabs: 0,
    communicationArray: 0,
    emergencyReserves: 0
  });
  const [validation, setValidation] = useState<InvestmentValidation | null>(null);
  const [effects, setEffects] = useState<InvestmentEffects | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load session and team data
  useEffect(() => {
    if (!sessionId || !teamId) {
      setError('Missing session or team ID');
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const loadData = async () => {
      try {
        // Subscribe to session updates
        unsubscribe = GameService.subscribeToSession(
          sessionId,
          (sessionData) => {
            setSession(sessionData);
            
            // Find the team
            const teamData = sessionData.teams.find(t => t.id === teamId);
            if (teamData) {
              setTeam(teamData);
              
              // Initialize allocation with existing investments
              setAllocation(teamData.investments);
              
              // Calculate initial validation and effects
              const initialValidation = InvestmentService.validateInvestment(teamData.investments);
              setValidation(initialValidation);
              
              const initialEffects = InvestmentService.calculateInvestmentEffects(
                teamData.investments, 
                teamData.type
              );
              setEffects(initialEffects);
            } else {
              setError(`Team ${teamId} not found in session`);
            }
            
            setLoading(false);
          },
          (error) => {
            console.error('Error loading session:', error);
            setError(`Failed to load session: ${error.message}`);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error setting up subscription:', error);
        setError(`Failed to connect to session: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [sessionId, teamId]);

  // Update validation and effects when allocation changes
  useEffect(() => {
    if (team) {
      const newValidation = InvestmentService.validateInvestment(allocation);
      setValidation(newValidation);
      
      const newEffects = InvestmentService.calculateInvestmentEffects(allocation, team.type);
      setEffects(newEffects);
    }
  }, [allocation, team]);

  const handleAllocationChange = (newAllocation: InvestmentAllocation) => {
    setAllocation(newAllocation);
  };

  const handleSaveInvestments = async () => {
    if (!sessionId || !teamId || !validation?.isValid) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await InvestmentService.saveTeamInvestments(sessionId, teamId, allocation);
      
      // Navigate to the dashboard or next phase
      navigate(`/dashboard/${sessionId}/${teamId}`);
    } catch (error) {
      console.error('Error saving investments:', error);
      setError(`Failed to save investments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipInvestments = async () => {
    if (!sessionId || !teamId) return;

    setSaving(true);
    setError(null);

    try {
      // Save empty investments (all zeros)
      const emptyAllocation: InvestmentAllocation = {
        scouts: 0,
        productionUpgrades: 0,
        researchLabs: 0,
        communicationArray: 0,
        emergencyReserves: 0
      };

      await InvestmentService.saveTeamInvestments(sessionId, teamId, emptyAllocation);
      navigate(`/dashboard/${sessionId}/${teamId}`);
    } catch (error) {
      console.error('Error skipping investments:', error);
      setError(`Failed to skip investments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-space-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !session || !team) {
    return (
      <div className="min-h-screen bg-space-black flex items-center justify-center p-4">
        <Card variant="primary" className="max-w-md">
          <div className="text-center">
            <h2 className="text-xl font-bold text-space-danger mb-4">
              Error Loading Investment Phase
            </h2>
            <p className="text-space-text-muted mb-6">
              {error || 'Failed to load session or team data'}
            </p>
            <Button
              variant="secondary"
              onClick={() => navigate('/')}
            >
              Return Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const investmentOptions = InvestmentService.generateInvestmentOptions(allocation);

  return (
    <div className={cn("min-h-screen bg-space-black p-4 lg:p-8", className)}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <HUDFrame color="cyan" className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-space-cyan mb-2">
                  Investment Phase
                </h1>
                <p className="text-space-text-muted text-lg">
                  {team.name} - Allocate your 1000 credits for maximum advantage
                </p>
              </div>
              
              <div className="mt-4 lg:mt-0 text-right">
                <div className="text-sm text-space-text-muted">Colony Type</div>
                <div className="text-xl font-bold text-space-cyan">
                  {team.type.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            </div>
          </HUDFrame>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Investment Panel - Takes up 3 columns */}
          <div className="xl:col-span-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <InvestmentPanel
                options={investmentOptions}
                currentAllocation={allocation}
                onAllocationChange={handleAllocationChange}
              />
            </motion.div>
          </div>

          {/* Sidebar - Takes up 1 column */}
          <div className="xl:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Investment Summary */}
              {effects && (
                <Card variant="primary">
                  <h3 className="text-lg font-bold text-space-cyan mb-4">
                    Investment Effects
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-space-text-muted">Intel/Round:</span>
                      <span className="text-space-cyan font-bold">
                        {effects.intelGenerationPerRound}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-space-text-muted">Tech Patents/Round:</span>
                      <span className="text-space-cyan font-bold">
                        {effects.techPatentsPerRound}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-space-text-muted">Intel Multiplier:</span>
                      <span className="text-space-cyan font-bold">
                        {effects.communicationMultiplier}x
                      </span>
                    </div>
                    
                    {Object.entries(effects.specialtyResourcesPerRound).length > 0 && (
                      <div>
                        <div className="text-space-text-muted mb-2">Resources/Round:</div>
                        {Object.entries(effects.specialtyResourcesPerRound).map(([resource, amount]) => (
                          <div key={resource} className="flex justify-between text-sm">
                            <span className="text-space-text-muted capitalize">
                              {resource}:
                            </span>
                            <span className="text-space-success font-bold">
                              +{amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {effects.emergencyResourcesAvailable > 0 && (
                      <div className="flex justify-between">
                        <span className="text-space-text-muted">Emergency Resources:</span>
                        <span className="text-space-warning font-bold">
                          {effects.emergencyResourcesAvailable}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Action Buttons */}
              <Card variant="primary">
                <div className="space-y-4">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={handleSaveInvestments}
                    disabled={!validation?.isValid || saving}
                    loading={saving}
                  >
                    {saving ? 'Saving...' : 'Confirm Investments'}
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full"
                    onClick={handleSkipInvestments}
                    disabled={saving}
                  >
                    Skip Investments
                  </Button>
                  
                  <div className="text-xs text-space-text-muted text-center">
                    You can skip investments to proceed with default starting resources only.
                  </div>
                </div>
              </Card>

              {/* Help Section */}
              <Card variant="secondary">
                <h3 className="text-lg font-bold text-space-purple mb-4">
                  Investment Tips
                </h3>
                <div className="space-y-2 text-sm text-space-text-muted">
                  <p>• Scouts generate intel each round</p>
                  <p>• Communication arrays multiply intel generation</p>
                  <p>• Production upgrades generate specialty resources</p>
                  <p>• Research labs create valuable tech patents</p>
                  <p>• Emergency reserves are safe but low-return</p>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
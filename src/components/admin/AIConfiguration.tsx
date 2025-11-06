import React, { useState, useEffect } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { AIStrategyService } from '../../services/aiStrategyService';
import type { AIColonyConfig, AIDifficulty } from '../../types/ai.types';
import type { ColonyType } from '../../types';

interface AIConfigurationProps {
  onConfigChange: (configs: AIColonyConfig[]) => void;
  initialConfigs?: AIColonyConfig[];
  galaxyId?: string;
  totalTeams?: number;
  isMultiGalaxy?: boolean;
}

interface ColonyConfigState {
  colonyType: ColonyType;
  isAI: boolean;
  difficulty: AIDifficulty;
  teamName: string;
}

const AIConfiguration: React.FC<AIConfigurationProps> = ({
  onConfigChange,
  initialConfigs = [],
  galaxyId,
  totalTeams = 12,
  isMultiGalaxy = false
}) => {
  const [singlePlayerMode, setSinglePlayerMode] = useState(false);
  const [globalDifficulty, setGlobalDifficulty] = useState<AIDifficulty>('medium');
  const [colonyConfigs, setColonyConfigs] = useState<ColonyConfigState[]>([]);
  const [strategyService] = useState(() => new AIStrategyService());
  const [showAdvanced, setShowAdvanced] = useState(false);

  const colonyTypes: ColonyType[] = ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'];

  useEffect(() => {
    // Initialize colony configurations
    const initialStates: ColonyConfigState[] = [];
    
    // Create 2 teams for each colony type (12 total)
    for (const colonyType of colonyTypes) {
      for (let i = 1; i <= 2; i++) {
        const colonyName = `${colonyType.charAt(0).toUpperCase() + colonyType.slice(1).replace('_', ' ')} ${i}`;
        
        // Check if there's an existing config for this combination
        const existingConfig = initialConfigs.find(c => 
          c.colonyId.includes(colonyType) && c.colonyId.includes(i.toString())
        );
        
        initialStates.push({
          colonyType,
          isAI: existingConfig?.isAIControlled || false,
          difficulty: existingConfig?.difficulty || 'medium',
          teamName: colonyName
        });
      }
    }
    
    setColonyConfigs(initialStates);
  }, [initialConfigs]);

  useEffect(() => {
    // Generate AI configs and notify parent
    const aiConfigs: AIColonyConfig[] = colonyConfigs
      .filter(config => config.isAI)
      .map((config, index) => ({
        colonyId: `${config.colonyType}_${Math.floor(index / 2) + 1}`, // Generate consistent ID
        difficulty: config.difficulty,
        isAIControlled: true,
        galaxyId: galaxyId,
        personality: getPersonalityForGalaxySize(totalTeams),
        adaptiveStrategy: totalTeams > 6,
        cooperationBias: getCooperationBias(totalTeams)
      }));

    onConfigChange(aiConfigs);
  }, [colonyConfigs, onConfigChange, galaxyId, totalTeams]);

  const handleSinglePlayerToggle = (enabled: boolean) => {
    setSinglePlayerMode(enabled);
    
    if (enabled) {
      // Enable AI for all teams except one (randomly chosen human team)
      const humanTeamIndex = Math.floor(Math.random() * colonyConfigs.length);
      
      setColonyConfigs(configs => 
        configs.map((config, index) => ({
          ...config,
          isAI: index !== humanTeamIndex,
          difficulty: globalDifficulty
        }))
      );
    } else {
      // Disable AI for all teams
      setColonyConfigs(configs => 
        configs.map(config => ({
          ...config,
          isAI: false
        }))
      );
    }
  };

  const handleGlobalDifficultyChange = (difficulty: AIDifficulty) => {
    setGlobalDifficulty(difficulty);
    
    // Update all AI-controlled colonies
    setColonyConfigs(configs => 
      configs.map(config => ({
        ...config,
        difficulty: config.isAI ? difficulty : config.difficulty
      }))
    );
  };

  const handleColonyAIToggle = (index: number, isAI: boolean) => {
    if (singlePlayerMode) return; // Prevent changes in single player mode
    
    setColonyConfigs(configs => 
      configs.map((config, i) => 
        i === index 
          ? { ...config, isAI, difficulty: isAI ? globalDifficulty : config.difficulty }
          : config
      )
    );
  };

  const handleColonyDifficultyChange = (index: number, difficulty: AIDifficulty) => {
    setColonyConfigs(configs => 
      configs.map((config, i) => 
        i === index ? { ...config, difficulty } : config
      )
    );
  };

  const getStrategyDescription = (colonyType: ColonyType): string => {
    return strategyService.getStrategyDescription(colonyType);
  };

  const getDifficultyDescription = (difficulty: AIDifficulty): string => {
    switch (difficulty) {
      case 'easy':
        return 'Slower decisions, more predictable, makes occasional mistakes';
      case 'medium':
        return 'Balanced gameplay, moderate challenge';
      case 'hard':
        return 'Quick decisions, optimized strategies, challenging opponent';
      default:
        return '';
    }
  };

  const getPersonalityForGalaxySize = (size: number): import('../../types/ai.types').AIPersonalityType => {
    if (size <= 3) return 'cooperative';
    if (size <= 6) return 'balanced_player';
    if (size <= 10) return 'opportunistic';
    if (size <= 15) return 'competitive';
    return 'aggressive_trader';
  };

  const getCooperationBias = (size: number): number => {
    if (size <= 3) return 0.8;
    if (size <= 6) return 0.6;
    if (size <= 10) return 0.4;
    return 0.2;
  };

  const getAIStatistics = () => {
    const totalTeams = colonyConfigs.length;
    const aiTeams = colonyConfigs.filter(c => c.isAI).length;
    const humanTeams = totalTeams - aiTeams;
    
    const difficultyBreakdown = {
      easy: colonyConfigs.filter(c => c.isAI && c.difficulty === 'easy').length,
      medium: colonyConfigs.filter(c => c.isAI && c.difficulty === 'medium').length,
      hard: colonyConfigs.filter(c => c.isAI && c.difficulty === 'hard').length
    };

    return { totalTeams, aiTeams, humanTeams, difficultyBreakdown };
  };

  const stats = getAIStatistics();

  return (
    <GlassPanel className="p-6">
      <div className="mb-6" style={{ padding: '1.5rem' }}>
        <h2 className="text-xl font-bold mb-2 font-orbitron text-space-cyan">
          🤖 AI Colony Configuration {isMultiGalaxy && galaxyId && `- ${galaxyId}`}
        </h2>
        <p className="text-space-text-secondary text-sm">
          Configure which colonies are controlled by AI and their difficulty levels
          {totalTeams !== 12 && ` (${totalTeams} teams in this galaxy)`}
        </p>
      </div>

      {/* AI Statistics Summary */}
      <div className="mb-6 p-4 bg-space-panel-bg/50 rounded-lg border border-white/10" style={{ padding: '1.5rem' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-space-cyan">{stats.humanTeams}</div>
            <div className="text-xs text-space-text-secondary">Human Teams</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-space-purple">{stats.aiTeams}</div>
            <div className="text-xs text-space-text-secondary">AI Teams</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-space-success">{stats.difficultyBreakdown.easy}</div>
            <div className="text-xs text-space-text-secondary">Easy AI</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-space-warning">{stats.difficultyBreakdown.hard}</div>
            <div className="text-xs text-space-text-secondary">Hard AI</div>
          </div>
        </div>
      </div>

      {/* Quick Setup Options */}
      <div className="space-y-4 mb-6" style={{ padding: '0 1.5rem' }}>
        <div className="flex items-center justify-between p-4 bg-blue-900/20 border border-space-cyan/30 rounded-lg">
          <div>
            <h3 className="font-semibold text-space-cyan">Single Player Mode</h3>
            <p className="text-sm text-space-text-secondary">
              1 human player vs 11 AI colonies for solo practice
            </p>
          </div>
          <Switch
            checked={singlePlayerMode}
            onChange={handleSinglePlayerToggle}
            size="lg"
          />
        </div>

        {/* Global Difficulty Control */}
        <div className="flex items-center justify-between p-4 bg-space-panel-bg/30 rounded-lg border border-white/10">
          <div>
            <h3 className="font-semibold">Global AI Difficulty</h3>
            <p className="text-sm text-space-text-secondary">
              Set difficulty for all AI colonies
            </p>
          </div>
          <div className="flex space-x-2">
            {(['easy', 'medium', 'hard'] as AIDifficulty[]).map(difficulty => (
              <button
                key={difficulty}
                onClick={() => handleGlobalDifficultyChange(difficulty)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors cursor-pointer relative z-10 ${
                  globalDifficulty === difficulty
                    ? 'bg-space-cyan text-black'
                    : 'bg-white/10 text-space-text-secondary hover:bg-white/20'
                }`}
                style={{ pointerEvents: 'auto' }}
              >
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Configuration Toggle */}
        <div className="text-center">
          <Button
            variant="glass"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Configuration
          </Button>
        </div>
      </div>

      {/* Individual Colony Configuration */}
      {showAdvanced && (
        <div className="space-y-3" style={{ padding: '0 1.5rem' }}>
          <h3 className="text-lg font-semibold text-space-cyan mb-4">Individual Colony Settings</h3>
          
          {colonyTypes.map(colonyType => (
            <div key={colonyType} className="space-y-2">
              <h4 className="text-md font-medium text-space-purple capitalize">
                {colonyType.replace('_', ' ')} Colonies
              </h4>
              <div className="text-xs text-space-text-secondary mb-2">
                {getStrategyDescription(colonyType)}
              </div>
              
              {colonyConfigs
                .filter(config => config.colonyType === colonyType)
                .map((config, localIndex) => {
                  const globalIndex = colonyConfigs.findIndex(c => 
                    c.colonyType === colonyType && 
                    c.teamName === config.teamName
                  );
                  
                  return (
                    <div
                      key={`${colonyType}-${localIndex}`}
                      className="flex items-center justify-between p-3 bg-space-panel-bg/30 rounded border border-white/10"
                      style={{ padding: '1rem' }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          config.isAI ? 'bg-space-purple' : 'bg-space-success'
                        }`} />
                        <div>
                          <div className="font-medium">{config.teamName}</div>
                          <div className="text-xs text-space-text-secondary">
                            {config.isAI ? `AI - ${config.difficulty}` : 'Human Controlled'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {/* AI Toggle */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-space-text-secondary">AI</span>
                          <Switch
                            checked={config.isAI}
                            onChange={(checked) => handleColonyAIToggle(globalIndex, checked)}
                            disabled={singlePlayerMode}
                            size="sm"
                          />
                        </div>
                        
                        {/* Difficulty Selector */}
                        {config.isAI && (
                          <select
                            value={config.difficulty}
                            onChange={(e) => handleColonyDifficultyChange(globalIndex, e.target.value as AIDifficulty)}
                            className="px-2 py-1 bg-space-panel-bg border border-white/20 rounded text-sm text-white"
                            style={{ 
                              pointerEvents: 'auto',
                              zIndex: 10,
                              position: 'relative',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      )}

      {/* Difficulty Descriptions */}
      <div className="mt-6 space-y-3" style={{ padding: '0 1.5rem' }}>
        <h3 className="text-sm font-semibold text-space-text-secondary">Difficulty Levels:</h3>
        {(['easy', 'medium', 'hard'] as AIDifficulty[]).map(difficulty => (
          <div key={difficulty} className="flex items-start space-x-3 text-sm">
            <span className={`font-medium min-w-0 w-16 ${
              difficulty === 'easy' ? 'text-space-success' :
              difficulty === 'medium' ? 'text-space-warning' :
              'text-space-danger'
            }`}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}:
            </span>
            <span className="text-space-text-secondary">
              {getDifficultyDescription(difficulty)}
            </span>
          </div>
        ))}
      </div>

      {/* Galaxy-Specific Recommendations */}
      {totalTeams !== 12 && (
        <div className="mt-6 p-4 bg-blue-900/20 border border-space-cyan/30 rounded-lg" style={{ padding: '1.5rem', margin: '0 1.5rem' }}>
          <h3 className="font-semibold text-space-cyan mb-2">🌌 Galaxy Size Recommendations</h3>
          <div className="text-sm text-space-text-secondary">
            {totalTeams <= 3 && (
              <>
                <p className="mb-2">Small Galaxy ({totalTeams} teams):</p>
                <ul className="space-y-1 ml-4">
                  <li>• AI will be more cooperative and focus on survival</li>
                  <li>• Recommended: 1-2 AI teams maximum</li>
                  <li>• Best personalities: Cooperative, Balanced</li>
                </ul>
              </>
            )}
            {totalTeams > 3 && totalTeams <= 6 && (
              <>
                <p className="mb-2">Medium Galaxy ({totalTeams} teams):</p>
                <ul className="space-y-1 ml-4">
                  <li>• AI will balance cooperation with competition</li>
                  <li>• Recommended: 2-3 AI teams</li>
                  <li>• Mix of personalities works well</li>
                </ul>
              </>
            )}
            {totalTeams > 6 && totalTeams <= 12 && (
              <>
                <p className="mb-2">Large Galaxy ({totalTeams} teams):</p>
                <ul className="space-y-1 ml-4">
                  <li>• AI will be more competitive and aggressive</li>
                  <li>• Recommended: 3-5 AI teams</li>
                  <li>• Competitive personalities excel here</li>
                </ul>
              </>
            )}
            {totalTeams > 12 && (
              <>
                <p className="mb-2">Mega Galaxy ({totalTeams} teams):</p>
                <ul className="space-y-1 ml-4">
                  <li>• AI will use highly competitive strategies</li>
                  <li>• Recommended: 30-40% AI teams</li>
                  <li>• Aggressive and specialist personalities thrive</li>
                  <li>• Enable faster decision making for better flow</li>
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 p-4 bg-yellow-900/20 border border-space-warning/30 rounded-lg" style={{ padding: '1.5rem', margin: '0 1.5rem' }}>
        <h3 className="font-semibold text-space-warning mb-2">💡 AI Tips</h3>
        <ul className="text-sm text-space-text-secondary space-y-1">
          <li>• Single Player Mode is great for learning game mechanics</li>
          <li>• Mix difficulty levels to create interesting dynamics</li>
          <li>• Each colony type has unique trading strategies</li>
          <li>• AI colonies learn from interactions and adapt over time</li>
          {totalTeams >= 10 && <li>• In large galaxies, AI makes faster decisions to keep game flowing</li>}
          {totalTeams <= 5 && <li>• In small galaxies, AI prioritizes cooperation for survival</li>}
        </ul>
      </div>
    </GlassPanel>
  );
};

export { AIConfiguration };
export default AIConfiguration;
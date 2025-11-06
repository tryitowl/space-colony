import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { galaxyConfigurationService, type GalaxyTemplate } from '../../services/galaxyConfigurationService';
import type { GalaxyConfiguration } from '../../types/galaxy.types';
import type { ColonyType } from '../../types/base.types';
import { HUDFrame } from '../ui/HUDFrame';
import { CircularGauge } from '../ui/CircularGauge';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { GlassPanel } from '../ui/GlassPanel';
import { AIConfiguration } from './AIConfiguration';
import type { AIColonyConfig } from '../../types/ai.types';
import { VictoryConditionSelector } from './VictoryConditionSelector';
import { VICTORY_CONDITIONS, DEFAULT_VICTORY_CONDITIONS } from '../../constants/victoryConditions';

interface GalaxyConfigurationFormProps {
  onConfigChange: (config: GalaxyConfiguration) => void;
  onValidationChange: (isValid: boolean, issues: string[]) => void;
  participantCount?: number;
  onAIConfigChange?: (configs: AIColonyConfig[]) => void;
}

interface GalaxyFormData {
  id: string;
  name: string;
  teamCount: number;
  playersPerTeam: number;
  aiTeams: number;
  colonyTypes: ColonyType[];
  teamStructureMode: 'standard' | 'balanced' | 'custom';
}

const COLONY_TYPE_INFO: Record<ColonyType, { color: string; icon: string; description: string }> = {
  mining: { color: '#ff9500', icon: '⛏️', description: 'Resource extraction specialists' },
  agricultural: { color: '#00ff88', icon: '🌾', description: 'Food production experts' },
  research: { color: '#00d4ff', icon: '🔬', description: 'Technology innovators' },
  trade_hub: { color: '#ff6500', icon: '🏪', description: 'Commerce facilitators' },
  military: { color: '#ff4757', icon: '⚔️', description: 'Defense and security' },
  manufacturing: { color: '#9c88ff', icon: '🏭', description: 'Industrial production' }
};

const ALL_COLONY_TYPES: ColonyType[] = ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'];

export const GalaxyConfigurationForm: React.FC<GalaxyConfigurationFormProps> = ({
  onConfigChange,
  onValidationChange,
  participantCount = 24,
  onAIConfigChange
}) => {
  const [galaxies, setGalaxies] = useState<GalaxyFormData[]>([{
    id: 'galaxy_0',
    name: 'Main Galaxy',
    teamCount: 6,
    playersPerTeam: 4,
    aiTeams: 0,
    colonyTypes: ALL_COLONY_TYPES.slice(0, 6),
    teamStructureMode: 'standard'
  }]);

  const [templates, setTemplates] = useState<GalaxyTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [crossGalaxyTrading, setCrossGalaxyTrading] = useState(false);
  const [globalEvents, setGlobalEvents] = useState(true);
  const [sharedMarketIntel, setSharedMarketIntel] = useState(true);
  const [competitionMode, setCompetitionMode] = useState<'individual' | 'galaxy' | 'hybrid'>('individual');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [aiConfigs, setAiConfigs] = useState<AIColonyConfig[]>([]);
  const [selectedVictoryConditions, setSelectedVictoryConditions] = useState<string[]>(DEFAULT_VICTORY_CONDITIONS);

  // Load templates on mount
  useEffect(() => {
    galaxyConfigurationService.getTemplates().then(setTemplates);
  }, []);

  // Calculate totals
  const totalTeams = galaxies.reduce((sum, g) => sum + g.teamCount, 0);
  const totalHumanTeams = galaxies.reduce((sum, g) => sum + (g.teamCount - g.aiTeams), 0);
  const totalAITeams = galaxies.reduce((sum, g) => sum + g.aiTeams, 0);
  const totalPlayers = galaxies.reduce((sum, g) => sum + ((g.teamCount - g.aiTeams) * g.playersPerTeam), 0);
  const playersPerParticipant = participantCount > 0 ? totalPlayers / participantCount : 0;

  // Update configuration when form changes
  useEffect(() => {
    const config: GalaxyConfiguration = {
      galaxies: galaxies.map(g => ({
        id: g.id,
        name: g.name,
        description: `${g.teamCount} teams configuration`,
        totalTeams: g.teamCount,
        colonyTypes: g.colonyTypes,
        teamStructure: { mode: g.teamStructureMode },
        aiEnabled: g.aiTeams > 0,
        aiDifficulty: g.aiTeams > 0 ? 'medium' : undefined
      })),
      crossGalaxyTrading,
      globalEvents,
      sharedMarketIntel,
      competitionMode,
      victoryConditions: selectedVictoryConditions
        .map(id => VICTORY_CONDITIONS[id])
        .filter(vc => vc !== undefined)
    };

    onConfigChange(config);

    // Validate configuration
    const validation = galaxyConfigurationService.validateConfigurationForParticipants(config, participantCount);
    setValidationIssues(validation.issues);
    onValidationChange(validation.valid, validation.issues);
  }, [galaxies, crossGalaxyTrading, globalEvents, sharedMarketIntel, competitionMode, participantCount]);

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = await galaxyConfigurationService.getTemplate(templateId);
    
    if (template) {
      // Apply template configuration
      const config = template.configuration;
      setGalaxies((config.galaxies || []).map((g) => ({
        id: g.id,
        name: g.name,
        teamCount: g.totalTeams || 4,
        playersPerTeam: Math.max(1, Math.floor(participantCount / (g.totalTeams || 4))),
        aiTeams: g.aiEnabled ? Math.floor((g.totalTeams || 4) * 0.2) : 0,
        colonyTypes: g.colonyTypes,
        teamStructureMode: (g.teamStructure || { mode: 'balanced' }).mode
      })));
      
      setCrossGalaxyTrading(config.crossGalaxyTrading);
      setGlobalEvents(config.globalEvents);
      setSharedMarketIntel(config.sharedMarketIntel);
      setCompetitionMode(config.competitionMode);
      
      // Set victory conditions from template
      if (config.victoryConditions && config.victoryConditions.length > 0) {
        setSelectedVictoryConditions(config.victoryConditions.map(vc => vc.id));
      }
    }
  };

  const addGalaxy = () => {
    if (galaxies.length < 10) {
      const newGalaxy: GalaxyFormData = {
        id: `galaxy_${galaxies.length}`,
        name: `Galaxy ${String.fromCharCode(65 + galaxies.length)}`,
        teamCount: 6,
        playersPerTeam: 4,
        aiTeams: 0,
        colonyTypes: ALL_COLONY_TYPES.slice(0, 6),
        teamStructureMode: 'standard'
      };
      setGalaxies([...galaxies, newGalaxy]);
    }
  };

  const removeGalaxy = (index: number) => {
    if (galaxies.length > 1) {
      setGalaxies(galaxies.filter((_, i) => i !== index));
    }
  };

  const updateGalaxy = (index: number, updates: Partial<GalaxyFormData>) => {
    const updated = [...galaxies];
    updated[index] = { ...updated[index], ...updates };
    
    // Auto-adjust colony types based on team count
    if (updates.teamCount !== undefined) {
      const teamCount = updates.teamCount;
      if (updated[index].teamStructureMode === 'standard') {
        updated[index].colonyTypes = ALL_COLONY_TYPES.slice(0, Math.min(teamCount, 6));
      }
    }
    
    setGalaxies(updated);
  };

  const generateDynamicConfig = () => {
    const config = galaxyConfigurationService.generateDynamicConfiguration(participantCount, {
      preferredGalaxySize: 6,
      enableAI: true,
      aiRatio: 0.2,
      competitionMode,
      difficulty: 'intermediate'
    });

    // Convert to form data
    setGalaxies((config.galaxies || []).map((g) => ({
      id: g.id,
      name: g.name,
      teamCount: g.totalTeams || 4,
      playersPerTeam: Math.max(1, Math.floor(participantCount / (g.totalTeams || 4))),
      aiTeams: g.aiEnabled ? Math.floor((g.totalTeams || 4) * 0.2) : 0,
      colonyTypes: g.colonyTypes,
      teamStructureMode: (g.teamStructure || { mode: 'balanced' }).mode
    })));

    setCrossGalaxyTrading(config.crossGalaxyTrading);
    setGlobalEvents(config.globalEvents);
    setSharedMarketIntel(config.sharedMarketIntel);
  };

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <GlassPanel className="p-4">
        <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Orbitron, monospace', color: '#00d4ff' }}>
          Configuration Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {templates.map(template => (
            <motion.button
              key={template.id}
              onClick={() => handleTemplateSelect(template.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedTemplate === template.id 
                  ? 'border-cyan-400 bg-cyan-400/10' 
                  : 'border-gray-600 hover:border-gray-400'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <h4 className="font-semibold text-sm" style={{ color: '#00d4ff' }}>{template.name}</h4>
              <p className="text-xs text-gray-400 mt-1">{template.description}</p>
              <div className="flex justify-between mt-2 text-xs">
                <span style={{ color: '#00ff88' }}>{template.recommendedPlayers.min}-{template.recommendedPlayers.max} players</span>
                <span style={{ color: '#ff9500' }}>{template.duration}min</span>
              </div>
            </motion.button>
          ))}
        </div>
        
        <motion.button
          onClick={generateDynamicConfig}
          className="mt-4 px-4 py-2 rounded-lg border-2 border-orange-500 hover:bg-orange-500/10 transition-all"
          style={{ fontFamily: 'Orbitron, monospace', color: '#ff9500' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Auto-Generate for {participantCount} Participants
        </motion.button>
      </GlassPanel>

      {/* Galaxy Configuration */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold" style={{ fontFamily: 'Orbitron, monospace', color: '#00d4ff' }}>
            Galaxy Configuration ({galaxies.length}/10)
          </h3>
          <Button onClick={addGalaxy} disabled={galaxies.length >= 10}>
            Add Galaxy
          </Button>
        </div>

        <AnimatePresence>
          {galaxies.map((galaxy, index) => (
            <motion.div
              key={galaxy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <HUDFrame className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <input
                    type="text"
                    value={galaxy.name}
                    onChange={(e) => updateGalaxy(index, { name: e.target.value })}
                    className="text-lg font-bold bg-transparent border-b border-cyan-400 focus:border-orange-500 outline-none"
                    style={{ fontFamily: 'Orbitron, monospace', color: '#00d4ff' }}
                  />
                  {galaxies.length > 1 && (
                    <motion.button
                      onClick={() => removeGalaxy(index)}
                      className="text-red-500 hover:text-red-400"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      ✕
                    </motion.button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Team Count */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#a0a0a0' }}>
                      Total Teams: <span style={{ color: '#00d4ff' }}>{galaxy.teamCount}</span>
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="20"
                      value={galaxy.teamCount}
                      onChange={(e) => updateGalaxy(index, { teamCount: parseInt(e.target.value) })}
                      className="w-full"
                      style={{
                        background: `linear-gradient(to right, #00d4ff 0%, #00d4ff ${
                          (galaxy.teamCount - 2) / 18 * 100
                        }%, rgba(0, 212, 255, 0.2) ${
                          (galaxy.teamCount - 2) / 18 * 100
                        }%, rgba(0, 212, 255, 0.2) 100%)`
                      }}
                    />
                  </div>

                  {/* Players per Team */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#a0a0a0' }}>
                      Players/Team: <span style={{ color: '#00ff88' }}>{galaxy.playersPerTeam}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="9"
                      value={galaxy.playersPerTeam}
                      onChange={(e) => updateGalaxy(index, { playersPerTeam: parseInt(e.target.value) })}
                      className="w-full"
                      style={{
                        background: `linear-gradient(to right, #00ff88 0%, #00ff88 ${
                          (galaxy.playersPerTeam - 1) / 8 * 100
                        }%, rgba(0, 255, 136, 0.2) ${
                          (galaxy.playersPerTeam - 1) / 8 * 100
                        }%, rgba(0, 255, 136, 0.2) 100%)`
                      }}
                    />
                  </div>

                  {/* AI Teams - Simplified Display */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: '#a0a0a0' }}>
                      AI Teams: <span style={{ color: '#ff9500' }}>{galaxy.aiTeams}</span>
                    </label>
                    <div className="p-3 rounded-lg border border-orange-400/30 bg-orange-400/5 text-center">
                      <div className="text-sm" style={{ color: '#ff9500' }}>Configured in AI Settings</div>
                    </div>
                  </div>
                </div>

                {/* Team Structure Mode */}
                <div className="mt-4">
                  <label className="block text-sm mb-2" style={{ color: '#a0a0a0' }}>
                    Colony Type Distribution
                  </label>
                  <div className="flex gap-2">
                    {(['standard', 'balanced', 'custom'] as const).map(mode => (
                      <motion.button
                        key={mode}
                        onClick={() => updateGalaxy(index, { teamStructureMode: mode })}
                        className={`px-3 py-1 rounded-lg border ${
                          galaxy.teamStructureMode === mode
                            ? 'border-cyan-400 bg-cyan-400/10'
                            : 'border-gray-600 hover:border-gray-400'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Colony Types Selection */}
                <div className="mt-4">
                  <label className="block text-sm mb-2" style={{ color: '#a0a0a0' }}>
                    Available Colony Types
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ALL_COLONY_TYPES.map(type => {
                      const info = COLONY_TYPE_INFO[type];
                      const isSelected = galaxy.colonyTypes.includes(type);
                      const isDisabled = galaxy.teamStructureMode === 'standard' && 
                                       !isSelected && 
                                       galaxy.colonyTypes.length >= galaxy.teamCount;

                      return (
                        <motion.button
                          key={type}
                          onClick={() => {
                            if (!isDisabled) {
                              const newTypes = isSelected
                                ? galaxy.colonyTypes.filter(t => t !== type)
                                : [...galaxy.colonyTypes, type];
                              updateGalaxy(index, { colonyTypes: newTypes });
                            }
                          }}
                          disabled={isDisabled}
                          className={`p-2 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-current bg-current/10'
                              : isDisabled
                              ? 'border-gray-700 opacity-50 cursor-not-allowed'
                              : 'border-gray-600 hover:border-current'
                          }`}
                          style={{ 
                            borderColor: isSelected ? info.color : undefined,
                            backgroundColor: isSelected ? `${info.color}20` : undefined
                          }}
                          whileHover={!isDisabled ? { scale: 1.05 } : {}}
                          whileTap={!isDisabled ? { scale: 0.95 } : {}}
                        >
                          <div className="flex items-center gap-2">
                            <span>{info.icon}</span>
                            <span className="text-xs" style={{ color: isSelected ? info.color : '#a0a0a0' }}>
                              {type.replace('_', ' ')}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Visual Team Distribution */}
                <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.05)' }}>
                  <div className="grid grid-cols-10 gap-1">
                    {Array.from({ length: galaxy.teamCount }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="aspect-square rounded"
                        style={{
                          background: i < galaxy.teamCount - galaxy.aiTeams ? '#00d4ff' : '#ff9500',
                          boxShadow: i < galaxy.teamCount - galaxy.aiTeams
                            ? '0 0 10px rgba(0, 212, 255, 0.5)'
                            : '0 0 10px rgba(255, 149, 0, 0.5)'
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.02 }}
                        whileHover={{ scale: 1.2 }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span style={{ color: '#00d4ff' }}>
                      {galaxy.teamCount - galaxy.aiTeams} Human Teams
                    </span>
                    <span style={{ color: '#ff9500' }}>
                      {galaxy.aiTeams} AI Teams
                    </span>
                  </div>
                </div>
              </HUDFrame>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Global Settings */}
      <GlassPanel className="p-4">
        <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Orbitron, monospace', color: '#00d4ff' }}>
          Global Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <label style={{ color: '#a0a0a0' }}>Cross-Galaxy Trading</label>
            <Switch
              checked={crossGalaxyTrading}
              onChange={setCrossGalaxyTrading}
              disabled={galaxies.length < 2}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label style={{ color: '#a0a0a0' }}>Global Events</label>
            <Switch checked={globalEvents} onChange={setGlobalEvents} />
          </div>
          
          <div className="flex items-center justify-between">
            <label style={{ color: '#a0a0a0' }}>Shared Market Intel</label>
            <Switch checked={sharedMarketIntel} onChange={setSharedMarketIntel} />
          </div>
          
          <div>
            <label className="block text-sm mb-2" style={{ color: '#a0a0a0' }}>
              Competition Mode
            </label>
            <select
              value={competitionMode}
              onChange={(e) => setCompetitionMode(e.target.value as typeof competitionMode)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 focus:border-cyan-400 outline-none"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <option value="individual">Individual Teams</option>
              <option value="galaxy">Galaxy vs Galaxy</option>
              <option value="hybrid">Hybrid Competition</option>
            </select>
          </div>
        </div>
      </GlassPanel>

      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          className="text-center p-4 rounded-lg border border-cyan-400/30 bg-cyan-400/5"
          whileHover={{ scale: 1.05 }}
        >
          <CircularGauge
            value={totalTeams}
            maxValue={100}
            label="Total Teams"
            size="lg"
            variant="primary"
            showValue={true}
          />
          <p className="mt-2 text-sm" style={{ color: '#a0a0a0' }}>Total Teams</p>
        </motion.div>

        <motion.div
          className="text-center p-4 rounded-lg border border-green-400/30 bg-green-400/5"
          whileHover={{ scale: 1.05 }}
        >
          <CircularGauge
            value={totalHumanTeams}
            maxValue={totalTeams}
            label="Human Teams"
            size="lg"
            variant="success"
            showValue={true}
          />
          <p className="mt-2 text-sm" style={{ color: '#a0a0a0' }}>Human Teams</p>
        </motion.div>

        <motion.div
          className="text-center p-4 rounded-lg border border-orange-400/30 bg-orange-400/5"
          whileHover={{ scale: 1.05 }}
        >
          <CircularGauge
            value={totalAITeams}
            maxValue={totalTeams}
            label="AI Teams"
            size="lg"
            variant="warning"
            showValue={true}
          />
          <p className="mt-2 text-sm" style={{ color: '#a0a0a0' }}>AI Teams</p>
        </motion.div>

        <motion.div
          className="text-center p-4 rounded-lg border border-purple-400/30 bg-purple-400/5"
          whileHover={{ scale: 1.05 }}
        >
          <CircularGauge
            value={Math.min(100, playersPerParticipant * 20)}
            maxValue={100}
            label="Efficiency"
            size="lg"
            variant="secondary"
            showValue={false}
          />
          <p className="mt-2 text-lg font-bold" style={{ color: '#9c88ff' }}>
            {playersPerParticipant.toFixed(1)}
          </p>
          <p className="text-sm" style={{ color: '#a0a0a0' }}>Players/Participant</p>
        </motion.div>
      </div>

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg border border-red-500/50 bg-red-500/10"
        >
          <h4 className="font-semibold mb-2" style={{ color: '#ff4757' }}>
            Configuration Issues:
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {validationIssues.map((issue, index) => (
              <li key={index} className="text-sm" style={{ color: '#ff6b6b' }}>
                {issue}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Victory Conditions */}
      <VictoryConditionSelector
        selectedConditions={selectedVictoryConditions}
        onChange={setSelectedVictoryConditions}
        minConditions={1}
        maxConditions={5}
      />

      {/* AI Configuration Button */}
      <motion.button
        onClick={() => setShowAIConfig(!showAIConfig)}
        className="w-full p-3 rounded-lg border border-orange-600 hover:border-orange-400 bg-orange-600/10 transition-all flex items-center justify-center gap-2 mb-4"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span style={{ color: '#ff9500' }}>🤖 Configure AI Colonies</span>
        <motion.span
          animate={{ rotate: showAIConfig ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          ▼
        </motion.span>
      </motion.button>

      {/* AI Configuration Panel */}
      <AnimatePresence>
        {showAIConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mb-4"
          >
            <AIConfiguration
              onConfigChange={(configs) => {
                setAiConfigs(configs);
                
                // Update galaxy AI team counts based on configs
                const aiTeamsByGalaxy = configs.reduce((acc, config) => {
                  const galaxyId = config.galaxyId || 'galaxy_0';
                  acc[galaxyId] = (acc[galaxyId] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                
                setGalaxies(prevGalaxies => 
                  prevGalaxies.map(galaxy => ({
                    ...galaxy,
                    aiTeams: aiTeamsByGalaxy[galaxy.id] || 0
                  }))
                );
                
                // Notify parent if handler provided
                if (onAIConfigChange) {
                  onAIConfigChange(configs);
                }
              }}
              initialConfigs={aiConfigs}
              galaxyId={galaxies.length === 1 ? galaxies[0].id : undefined}
              totalTeams={totalTeams}
              isMultiGalaxy={galaxies.length > 1}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Options */}
      <motion.button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full p-3 rounded-lg border border-gray-600 hover:border-gray-400 transition-all flex items-center justify-center gap-2"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span style={{ color: '#a0a0a0' }}>Advanced Options</span>
        <motion.span
          animate={{ rotate: showAdvanced ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          ▼
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <GlassPanel className="p-4 mt-4">
              <p className="text-sm text-gray-400">
                Advanced configuration options coming soon...
              </p>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
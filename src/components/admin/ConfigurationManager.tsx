import React, { useState, useEffect } from 'react';
import { GameConfig, GameConfigType, mergeConfig } from '../../config/gameConfig';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import HUDFrame from '../ui/HUDFrame';
import { Save, RefreshCw, Download, Upload, AlertTriangle } from 'lucide-react';

interface ConfigurationManagerProps {
  onClose?: () => void;
}

type ConfigSection = 
  | 'resources' 
  | 'investments' 
  | 'rounds' 
  | 'achievements' 
  | 'trading' 
  | 'victory' 
  | 'crisis' 
  | 'ui';

export const ConfigurationManager: React.FC<ConfigurationManagerProps> = ({ onClose }) => {
  const [config, setConfig] = useState<GameConfigType>(GameConfig);
  const [activeSection, setActiveSection] = useState<ConfigSection>('resources');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load saved configuration on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('gameConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(mergeConfig(GameConfig, parsed));
      } catch (error) {
        console.error('Failed to load saved config:', error);
      }
    }
  }, []);

  const handleValueChange = (path: string, value: any) => {
    const keys = path.split('.');
    const newConfig = { ...config };
    let current: any = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      // Save to localStorage for now
      localStorage.setItem('gameConfig', JSON.stringify(config));
      
      // In production, this would save to Firestore
      // await saveConfigToFirestore(config);
      
      setSaveStatus('saved');
      setHasChanges(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setSaveStatus('error');
    }
  };

  const handleReset = () => {
    if (confirm('Reset all configurations to default values?')) {
      setConfig(GameConfig);
      setHasChanges(true);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-config-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setConfig(mergeConfig(GameConfig, imported));
        setHasChanges(true);
      } catch (error) {
        alert('Failed to import configuration file');
      }
    };
    reader.readAsText(file);
  };

  const renderResourcesSection = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-orbitron font-bold text-cyan-primary mb-4">Resource Values</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(config.resources.values).map(([resource, value]) => (
            <div key={resource} className="space-y-1">
              <label className="text-sm text-text-secondary capitalize">
                {resource.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => handleValueChange(`resources.values.${resource}`, parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-space-blue-10 border border-white/20 rounded-lg text-white focus:border-cyan-primary focus:outline-none"
                min="0"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-lg font-orbitron font-bold text-cyan-primary mb-4">Critical Thresholds</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(config.resources.criticalThresholds).map(([resource, threshold]) => (
            <div key={resource} className="space-y-1">
              <label className="text-sm text-text-secondary capitalize">{resource}</label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => handleValueChange(`resources.criticalThresholds.${resource}`, parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-space-blue-10 border border-white/20 rounded-lg text-white focus:border-cyan-primary focus:outline-none"
                min="0"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTradingSection = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-orbitron font-bold text-cyan-primary mb-4">Trade Limits</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-text-secondary">Max Active Trades</label>
            <input
              type="number"
              value={config.trading.limits.maxActiveTrades}
              onChange={(e) => handleValueChange('trading.limits.maxActiveTrades', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-space-blue-10 border border-white/20 rounded-lg text-white focus:border-cyan-primary focus:outline-none"
              min="1"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-text-secondary">Trade Expiry (minutes)</label>
            <input
              type="number"
              value={config.trading.limits.tradeExpiryMinutes}
              onChange={(e) => handleValueChange('trading.limits.tradeExpiryMinutes', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-space-blue-10 border border-white/20 rounded-lg text-white focus:border-cyan-primary focus:outline-none"
              min="1"
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-orbitron font-bold text-cyan-primary mb-4">AI Trading Parameters</h4>
        <div className="space-y-4">
          {(['easy', 'medium', 'hard'] as const).map(difficulty => (
            <div key={difficulty} className="space-y-2">
              <h5 className="text-sm font-medium text-purple-secondary capitalize">{difficulty} Difficulty</h5>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Acceptance Threshold</label>
                  <input
                    type="number"
                    value={config.trading.ai.acceptanceThresholds[difficulty]}
                    onChange={(e) => handleValueChange(`trading.ai.acceptanceThresholds.${difficulty}`, parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-space-blue-10 border border-white/20 rounded-lg text-white focus:border-cyan-primary focus:outline-none"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Counter Offer Chance</label>
                  <input
                    type="number"
                    value={config.trading.ai.counterOfferChance[difficulty]}
                    onChange={(e) => handleValueChange(`trading.ai.counterOfferChance.${difficulty}`, parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-space-blue-10 border border-white/20 rounded-lg text-white focus:border-cyan-primary focus:outline-none"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRoundsSection = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-orbitron font-bold text-cyan-primary mb-4">Round Durations (seconds)</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(config.rounds.durations).map(([phase, duration]) => (
            <div key={phase} className="space-y-1">
              <label className="text-sm text-text-secondary capitalize">{phase.replace('_', ' ')}</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => handleValueChange(`rounds.durations.${phase}`, parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-space-blue-10 border border-white/20 rounded-lg text-white focus:border-cyan-primary focus:outline-none"
                min="0"
                disabled={phase === 'completed'}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-lg font-orbitron font-bold text-cyan-primary mb-4">Resource Consumption</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(config.rounds.consumption.base).map(([resource, amount]) => (
            <div key={resource} className="space-y-1">
              <label className="text-sm text-text-secondary capitalize">{resource}</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => handleValueChange(`rounds.consumption.base.${resource}`, parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-space-blue-10 border border-white/20 rounded-lg text-white focus:border-cyan-primary focus:outline-none"
                min="0"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const sections: { id: ConfigSection; label: string; icon: string }[] = [
    { id: 'resources', label: 'Resources', icon: '💎' },
    { id: 'trading', label: 'Trading', icon: '💱' },
    { id: 'rounds', label: 'Rounds', icon: '⏱️' },
    { id: 'investments', label: 'Investments', icon: '📈' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' },
    { id: 'victory', label: 'Victory', icon: '🎯' },
    { id: 'crisis', label: 'Crisis', icon: '🚨' },
    { id: 'ui', label: 'UI Settings', icon: '🎨' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <GlassPanel className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-primary to-purple-secondary">
            Game Configuration Manager
          </h2>
          <div className="flex items-center space-x-4">
            {hasChanges && (
              <span className="text-warning-orange text-sm flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Unsaved changes
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-success-green text-sm">✓ Saved</span>
            )}
            {onClose && (
              <Button onClick={onClose} variant="glass" size="sm">
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeSection === section.id
                  ? 'bg-cyan-primary text-space-black'
                  : 'bg-space-blue-10 text-text-secondary hover:bg-space-blue-20'
              }`}
            >
              <span className="mr-2">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>
      </GlassPanel>

      {/* Section Content */}
      <HUDFrame variant="panel" color="cyan" className="p-6">
        <div className="min-h-[400px]">
          {activeSection === 'resources' && renderResourcesSection()}
          {activeSection === 'trading' && renderTradingSection()}
          {activeSection === 'rounds' && renderRoundsSection()}
          {/* Add other sections as needed */}
        </div>
      </HUDFrame>

      {/* Action Buttons */}
      <GlassPanel className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex space-x-3">
            <Button
              onClick={handleReset}
              variant="glass"
              size="sm"
              className="flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="application/json"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                as="span"
                variant="glass"
                size="sm"
                className="flex items-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Config
              </Button>
            </label>
            <Button
              onClick={handleExport}
              variant="glass"
              size="sm"
              className="flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Config
            </Button>
          </div>
          <Button
            onClick={handleSave}
            variant="primary"
            disabled={!hasChanges || saveStatus === 'saving'}
            className="flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </GlassPanel>
    </div>
  );
};

export default ConfigurationManager;
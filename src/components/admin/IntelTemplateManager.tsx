import React, { useState, useEffect } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { Select } from '../ui/Select';
import type { IntelTemplate } from '../../types/intel.types';
import { IntelTemplateLoader } from '../../utils/intelTemplateLoader';

interface IntelTemplateManagerProps {
  onClose?: () => void;
}

export const IntelTemplateManager: React.FC<IntelTemplateManagerProps> = ({ onClose }) => {
  const [templates, setTemplates] = useState<Record<string, IntelTemplate[]>>({});
  const [selectedRound, setSelectedRound] = useState<string>('1');
  const [selectedTemplate, setSelectedTemplate] = useState<IntelTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<IntelTemplate>>({
    type: 'market_intel',
    title: '',
    content: '',
    baseValue: 100,
    applicableRounds: [],
    exclusivity: 'shared'
  });

  const templateLoader = IntelTemplateLoader.getInstance();

  useEffect(() => {
    // Load current templates
    const config = templateLoader.exportConfiguration();
    setTemplates(config.templates);
  }, []);

  const handleSaveTemplate = () => {
    if (!newTemplate.title || !newTemplate.content) {
      alert('Please fill in all required fields');
      return;
    }

    const template: IntelTemplate = {
      type: newTemplate.type || 'market_intel',
      title: newTemplate.title,
      content: newTemplate.content,
      baseValue: newTemplate.baseValue || 100,
      applicableRounds: newTemplate.applicableRounds || [],
      exclusivity: newTemplate.exclusivity || 'shared',
      minScoutLevel: newTemplate.minScoutLevel
    };

    templateLoader.addTemplate(parseInt(selectedRound), template);
    
    // Update local state
    const updatedTemplates = { ...templates };
    if (!updatedTemplates[selectedRound]) {
      updatedTemplates[selectedRound] = [];
    }
    updatedTemplates[selectedRound].push(template);
    setTemplates(updatedTemplates);
    
    // Reset form
    setNewTemplate({
      type: 'market_intel',
      title: '',
      content: '',
      baseValue: 100,
      applicableRounds: [],
      exclusivity: 'shared'
    });
    setIsEditing(false);
  };

  const handleExport = () => {
    const config = templateLoader.exportConfiguration();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'intel-templates-custom.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        templateLoader.loadCustomTemplates(config);
        setTemplates(config.templates);
        alert('Templates imported successfully');
      } catch (error) {
        alert('Failed to import templates: ' + error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <GlassPanel className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-orbitron font-bold text-space-cyan">
              Intel Template Manager
            </h2>
            <div className="flex gap-4">
              <Button variant="glass" size="sm" onClick={handleExport}>
                Export Templates
              </Button>
              <label className="cursor-pointer">
                <Button variant="glass" size="sm">
                  Import Templates
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
              {onClose && (
                <Button variant="glass" onClick={onClose}>
                  ✕
                </Button>
              )}
            </div>
          </div>

          {/* Round Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Select Round</label>
            <Select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              options={[
                { value: '1', label: 'Round 1' },
                { value: '2', label: 'Round 2' },
                { value: '3', label: 'Round 3' },
                { value: '4', label: 'Round 4' },
                { value: '5', label: 'Round 5' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Templates for Round {selectedRound}
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {templates[selectedRound]?.map((template, index) => (
                  <GlassPanel
                    key={index}
                    className="p-3 cursor-pointer hover:border-space-cyan/50"
                    onClick={() => setSelectedTemplate(template)}
                    variant={selectedTemplate === template ? 'primary' : 'default'}
                  >
                    <div className="font-semibold">{template.title}</div>
                    <div className="text-sm text-space-text-secondary">
                      Type: {template.type} | Value: {template.baseValue} | 
                      Exclusivity: {template.exclusivity}
                    </div>
                  </GlassPanel>
                ))}
                {(!templates[selectedRound] || templates[selectedRound].length === 0) && (
                  <div className="text-space-text-secondary text-center py-8">
                    No templates for this round
                  </div>
                )}
              </div>
              <Button
                className="mt-4 w-full"
                variant="primary"
                onClick={() => setIsEditing(true)}
              >
                + Add New Template
              </Button>
            </div>

            {/* Template Editor/Viewer */}
            <div>
              {(selectedTemplate || isEditing) && (
                <GlassPanel className="p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    {isEditing ? 'New Template' : 'Template Details'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Type</label>
                      <Select
                        value={isEditing ? newTemplate.type : selectedTemplate?.type}
                        onChange={(e) => isEditing && setNewTemplate({ ...newTemplate, type: e.target.value as any })}
                        disabled={!isEditing}
                        options={[
                          { value: 'market_intel', label: 'Market Intel' },
                          { value: 'survey_report', label: 'Survey Report' },
                          { value: 'crisis_warning', label: 'Crisis Warning' },
                          { value: 'discovery', label: 'Discovery' },
                          { value: 'competitive', label: 'Competitive' },
                          { value: 'alien', label: 'Alien' },
                          { value: 'prediction', label: 'Prediction' },
                          { value: 'strategy', label: 'Strategy' },
                          { value: 'endgame', label: 'Endgame' },
                          { value: 'urgent', label: 'Urgent' }
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Title</label>
                      <Input
                        value={isEditing ? newTemplate.title : selectedTemplate?.title}
                        onChange={(e) => isEditing && setNewTemplate({ ...newTemplate, title: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Content</label>
                      <TextArea
                        value={isEditing ? newTemplate.content : selectedTemplate?.content}
                        onChange={(e) => isEditing && setNewTemplate({ ...newTemplate, content: e.target.value })}
                        disabled={!isEditing}
                        rows={4}
                        placeholder="Use {placeholders} for dynamic content"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Base Value</label>
                        <Input
                          type="number"
                          value={isEditing ? newTemplate.baseValue : selectedTemplate?.baseValue}
                          onChange={(e) => isEditing && setNewTemplate({ ...newTemplate, baseValue: parseInt(e.target.value) })}
                          disabled={!isEditing}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Min Scout Level</label>
                        <Input
                          type="number"
                          value={isEditing ? newTemplate.minScoutLevel || '' : selectedTemplate?.minScoutLevel || ''}
                          onChange={(e) => isEditing && setNewTemplate({ ...newTemplate, minScoutLevel: e.target.value ? parseInt(e.target.value) : undefined })}
                          disabled={!isEditing}
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Exclusivity</label>
                      <Select
                        value={isEditing ? newTemplate.exclusivity : selectedTemplate?.exclusivity}
                        onChange={(e) => isEditing && setNewTemplate({ ...newTemplate, exclusivity: e.target.value as any })}
                        disabled={!isEditing}
                        options={[
                          { value: 'exclusive', label: 'Exclusive (One team only)' },
                          { value: 'shared', label: 'Shared (Multiple teams)' },
                          { value: 'public', label: 'Public (All teams)' }
                        ]}
                      />
                    </div>

                    {isEditing && (
                      <div className="flex gap-4">
                        <Button
                          variant="primary"
                          onClick={handleSaveTemplate}
                        >
                          Save Template
                        </Button>
                        <Button
                          variant="glass"
                          onClick={() => {
                            setIsEditing(false);
                            setNewTemplate({
                              type: 'market_intel',
                              title: '',
                              content: '',
                              baseValue: 100,
                              applicableRounds: [],
                              exclusivity: 'shared'
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </GlassPanel>
              )}

              {/* Placeholder Reference */}
              <GlassPanel className="p-4 mt-4">
                <h4 className="font-semibold mb-2">Available Placeholders</h4>
                <div className="text-xs text-space-text-secondary space-y-1">
                  <div>• {'{colony_a}'}, {'{colony_b}'}, {'{target_colony}'} - Colony names</div>
                  <div>• {'{resource_type}'}, {'{mineral_type}'} - Resource types</div>
                  <div>• {'{amount}'}, {'{percentage}'} - Numeric values</div>
                  <div>• {'{grid_location}'}, {'{coordinates}'} - Locations</div>
                  <div>• {'{crisis_type}'}, {'{threat}'} - Event types</div>
                  <div>• {'{time_remaining}'}, {'{target_round}'} - Time references</div>
                </div>
              </GlassPanel>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};
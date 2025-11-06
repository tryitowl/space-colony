import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Save, X, MessageSquare, Info } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import type { IntelItem } from '../../types/base.types';

export interface CustomIntelTemplate {
  id: string;
  title: string;
  content: string;
  value: number;
  availableInRound: number;
}

interface IntelItemCreatorProps {
  customIntelTemplates: CustomIntelTemplate[];
  onChange: (templates: CustomIntelTemplate[]) => void;
  maxRounds?: number;
}

export const IntelItemCreator: React.FC<IntelItemCreatorProps> = ({
  customIntelTemplates,
  onChange,
  maxRounds = 5
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CustomIntelTemplate>>({
    title: '',
    content: '',
    value: 10,
    availableInRound: 1
  });

  const handleCreate = () => {
    if (formData.title && formData.content) {
      const newTemplate: CustomIntelTemplate = {
        id: `custom_intel_${Date.now()}`,
        title: formData.title,
        content: formData.content,
        value: formData.value || 10,
        availableInRound: formData.availableInRound || 1
      };
      onChange([...customIntelTemplates, newTemplate]);
      setFormData({
        title: '',
        content: '',
        value: 10,
        availableInRound: 1
      });
      setIsCreating(false);
    }
  };

  const handleUpdate = (id: string) => {
    const updated = customIntelTemplates.map(template =>
      template.id === id
        ? { ...template, ...formData }
        : template
    );
    onChange(updated);
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      value: 10,
      availableInRound: 1
    });
  };

  const handleDelete = (id: string) => {
    onChange(customIntelTemplates.filter(template => template.id !== id));
  };

  const startEdit = (template: CustomIntelTemplate) => {
    setEditingId(template.id);
    setFormData({
      title: template.title,
      content: template.content,
      value: template.value,
      availableInRound: template.availableInRound
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      value: 10,
      availableInRound: 1
    });
  };

  const getValueColor = (value: number): string => {
    if (value >= 30) return 'text-space-purple';
    if (value >= 20) return 'text-space-warning';
    if (value >= 10) return 'text-space-cyan';
    return 'text-space-success';
  };

  const getValueDescription = (value: number): string => {
    if (value >= 30) return 'Critical Intel';
    if (value >= 20) return 'Valuable Intel';
    if (value >= 10) return 'Useful Intel';
    return 'Basic Intel';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-space-cyan" />
          <h4 className="text-lg font-semibold text-space-cyan">Custom Intel Items</h4>
        </div>
        {!isCreating && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreating(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Create Intel
          </Button>
        )}
      </div>

      <p className="text-sm text-space-text-secondary mb-4">
        Create custom intelligence items that will be available during specific rounds of the game.
        These can provide strategic advantages or critical information to teams.
      </p>

      {/* Creation Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <GlassPanel className="p-4 mb-4">
              <h5 className="font-semibold text-space-purple mb-3">Create New Intel Item</h5>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-space-text-secondary mb-1">
                    Intel Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-space-panel-bg border border-white/20 rounded-lg 
                             text-white placeholder-gray-500 focus:border-space-cyan focus:outline-none"
                    placeholder="e.g., Mining Colony Resource Shortage"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm text-space-text-secondary mb-1">
                    Intel Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 bg-space-panel-bg border border-white/20 rounded-lg 
                             text-white placeholder-gray-500 focus:border-space-cyan focus:outline-none 
                             resize-none"
                    placeholder="e.g., Mining colonies are experiencing severe water shortages. They will pay premium prices for water resources."
                    rows={3}
                    maxLength={500}
                  />
                  <div className="text-xs text-space-text-secondary mt-1">
                    {formData.content?.length || 0}/500 characters
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-space-text-secondary mb-1">
                      Intel Value
                    </label>
                    <div className="relative">
                      <input
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-space-text-secondary mt-1">
                        <span>5</span>
                        <span className={`font-semibold ${getValueColor(formData.value || 10)}`}>
                          {formData.value} - {getValueDescription(formData.value || 10)}
                        </span>
                        <span>50</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-space-text-secondary mb-1">
                      Available in Round
                    </label>
                    <select
                      value={formData.availableInRound}
                      onChange={(e) => setFormData({ ...formData, availableInRound: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-space-panel-bg border border-white/20 rounded-lg 
                               text-white focus:border-space-cyan focus:outline-none"
                    >
                      {Array.from({ length: maxRounds }, (_, i) => i + 1).map(round => (
                        <option key={round} value={round}>Round {round}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => {
                      setIsCreating(false);
                      setFormData({
                        title: '',
                        content: '',
                        value: 10,
                        availableInRound: 1
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCreate}
                    disabled={!formData.title || !formData.content}
                  >
                    Create Intel
                  </Button>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intel Items List */}
      {customIntelTemplates.length > 0 ? (
        <div className="space-y-2">
          {customIntelTemplates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              {editingId === template.id ? (
                <GlassPanel className="p-4">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 bg-space-panel-bg border border-white/20 rounded-lg 
                               text-white focus:border-space-cyan focus:outline-none"
                    />
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full px-3 py-2 bg-space-panel-bg border border-white/20 rounded-lg 
                               text-white focus:border-space-cyan focus:outline-none resize-none"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-space-text-secondary">Value: {formData.value}</label>
                        <input
                          type="range"
                          min="5"
                          max="50"
                          step="5"
                          value={formData.value}
                          onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-space-text-secondary">Round</label>
                        <select
                          value={formData.availableInRound}
                          onChange={(e) => setFormData({ ...formData, availableInRound: parseInt(e.target.value) })}
                          className="w-full px-2 py-1 bg-space-panel-bg border border-white/20 rounded 
                                   text-white text-sm focus:border-space-cyan focus:outline-none"
                        >
                          {Array.from({ length: maxRounds }, (_, i) => i + 1).map(round => (
                            <option key={round} value={round}>Round {round}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="glass" size="sm" onClick={cancelEdit}>
                        <X className="w-4 h-4" />
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => handleUpdate(template.id)}>
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </GlassPanel>
              ) : (
                <GlassPanel className="p-4 hover:border-space-cyan/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-semibold text-white mb-1">{template.title}</h5>
                      <p className="text-sm text-space-text-secondary mb-2">{template.content}</p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className={`font-medium ${getValueColor(template.value)}`}>
                          Value: {template.value}
                        </span>
                        <span className="text-space-text-secondary">
                          Round {template.availableInRound}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <motion.button
                        className="p-1 text-space-text-secondary hover:text-space-cyan transition-colors"
                        onClick={() => startEdit(template)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        className="p-1 text-space-text-secondary hover:text-space-danger transition-colors"
                        onClick={() => handleDelete(template.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </GlassPanel>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-space-text-secondary">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No custom intel items created yet</p>
          <p className="text-sm mt-1">Click "Create Intel" to add strategic information</p>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-space-text-secondary">
            <p className="mb-2">
              <strong className="text-blue-400">Intel System Tips:</strong>
            </p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Higher value intel provides more strategic advantage</li>
              <li>Intel can reveal market changes, resource locations, or crisis warnings</li>
              <li>Teams can trade intel items for resources or credits</li>
              <li>Consider timing intel releases to create strategic tension</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntelItemCreator;
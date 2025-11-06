import React from 'react';
import { motion } from 'framer-motion';

interface PlayerDataFormProps {
  onSubmit: (data: {
    name: string;
    department: string;
    email?: string;
    yearsExperience?: number;
  }) => void;
  isLoading?: boolean;
}

export const PlayerDataForm: React.FC<PlayerDataFormProps> = ({ 
  onSubmit, 
  isLoading = false 
}) => {
  const [formData, setFormData] = React.useState({
    name: '',
    department: '',
    email: '',
    yearsExperience: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      department: formData.department,
      email: formData.email || undefined,
      yearsExperience: formData.yearsExperience ? parseInt(formData.yearsExperience) : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs mb-2 tracking-wider uppercase text-cyan-400">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-4 py-3 bg-black/50 border border-cyan-400/30 text-white focus:border-cyan-400 focus:outline-none"
          placeholder="Enter your full name"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-xs mb-2 tracking-wider uppercase text-cyan-400">
          Department <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.department}
          onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
          className="w-full px-4 py-3 bg-black/50 border border-cyan-400/30 text-white focus:border-cyan-400 focus:outline-none"
          placeholder="e.g., Engineering, Sales, HR"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-xs mb-2 tracking-wider uppercase text-cyan-400">
          Email (Optional)
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-4 py-3 bg-black/50 border border-cyan-400/30 text-white focus:border-cyan-400 focus:outline-none"
          placeholder="your.email@company.com"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-xs mb-2 tracking-wider uppercase text-cyan-400">
          Years of Experience (Optional)
        </label>
        <input
          type="number"
          min="0"
          max="50"
          value={formData.yearsExperience}
          onChange={(e) => setFormData(prev => ({ ...prev, yearsExperience: e.target.value }))}
          className="w-full px-4 py-3 bg-black/50 border border-cyan-400/30 text-white focus:border-cyan-400 focus:outline-none"
          placeholder="0"
          disabled={isLoading}
        />
      </div>

      <motion.button
        type="submit"
        disabled={isLoading || !formData.name || !formData.department}
        className="w-full px-6 py-3 font-semibold bg-cyan-400/10 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400/20 disabled:opacity-50"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? 'Processing...' : 'Continue'}
      </motion.button>
    </form>
  );
};
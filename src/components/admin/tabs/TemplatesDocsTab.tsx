import React from 'react';
import { motion } from 'framer-motion';

interface TemplatesDocsTabProps {
  onTemplateSelect: (name: string, duration: string) => void;
}

export const TemplatesDocsTab: React.FC<TemplatesDocsTabProps> = ({ onTemplateSelect }) => {
  const templates = [
    { name: 'Standard Workshop', duration: '60', description: 'Perfect for regular team sessions', participants: '10-50' },
    { name: 'Extended Session', duration: '75', description: 'Deep dive into strategic planning', participants: '20-100' },
    { name: 'Quick Demo', duration: '45', description: 'Introduction for new teams', participants: '5-30' },
    { name: 'Competition Mode', duration: '90', description: 'High-stakes tournament style', participants: '50-200' },
    { name: 'Training Session', duration: '60', description: 'Educational focus with tutorials', participants: '15-60' },
    { name: 'Executive Briefing', duration: '30', description: 'Condensed experience for leadership', participants: '5-20' }
  ];

  const documents = [
    { title: 'Facilitator Guide', icon: '📖', pages: 24, format: 'PDF' },
    { title: 'Quick Start Tutorial', icon: '🚀', pages: 8, format: 'PDF' },
    { title: 'Game Rules Reference', icon: '📋', pages: 12, format: 'PDF' },
    { title: 'Technical Setup Guide', icon: '⚙️', pages: 16, format: 'PDF' },
    { title: 'Debrief Templates', icon: '💬', pages: 6, format: 'DOCX' },
    { title: 'ROI Calculator', icon: '📊', pages: 4, format: 'XLSX' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Event Templates */}
      <div>
        <h3 
          className="text-base sm:text-lg font-semibold text-white uppercase tracking-wider mb-4 lg:mb-6"
          style={{ fontFamily: 'Orbitron, monospace' }}
        >
          Event Templates
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {templates.map((template, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-3 sm:p-4 border rounded-lg cursor-pointer transition-all group min-h-[80px]"
              style={{
                background: 'rgba(108, 92, 231, 0.1)',
                borderColor: '#6c5ce7'
              }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTemplateSelect(template.name, template.duration)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ff9500';
                e.currentTarget.style.background = 'rgba(255, 149, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#6c5ce7';
                e.currentTarget.style.background = 'rgba(108, 92, 231, 0.1)';
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-white">{template.name}</h4>
                <span 
                  className="text-sm px-2 py-1 rounded"
                  style={{ 
                    background: 'rgba(0, 212, 255, 0.2)',
                    color: '#00d4ff',
                    fontFamily: 'Orbitron, monospace'
                  }}
                >
                  {template.duration} MIN
                </span>
              </div>
              <p className="text-sm mb-2" style={{ color: '#a0a0a0' }}>
                {template.description}
              </p>
              <div className="flex items-center gap-4 text-xs">
                <span style={{ color: '#6c5ce7' }}>👥 {template.participants}</span>
                <motion.span 
                  className="ml-auto opacity-0 group-hover:opacity-100"
                  style={{ color: '#ff9500' }}
                  initial={{ x: -10 }}
                  whileHover={{ x: 0 }}
                >
                  Click to use →
                </motion.span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Documentation & Resources */}
      <div>
        <h3 
          className="text-base sm:text-lg font-semibold text-white uppercase tracking-wider mb-4 lg:mb-6"
          style={{ fontFamily: 'Orbitron, monospace' }}
        >
          Documentation & Resources
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {documents.map((doc, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-3 sm:p-4 border rounded-lg cursor-pointer transition-all group min-h-[80px]"
              style={{
                background: 'rgba(0, 212, 255, 0.05)',
                borderColor: '#00d4ff'
              }}
              whileHover={{ x: -4 }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ff9500';
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#00d4ff';
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.05)';
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{doc.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{doc.title}</h4>
                  <div className="flex items-center gap-3 text-xs mt-1">
                    <span style={{ color: '#a0a0a0' }}>{doc.pages} pages</span>
                    <span 
                      className="px-2 py-0.5 rounded"
                      style={{ 
                        background: 'rgba(255, 149, 0, 0.2)',
                        color: '#ff9500'
                      }}
                    >
                      {doc.format}
                    </span>
                  </div>
                </div>
                <motion.div
                  className="opacity-0 group-hover:opacity-100"
                  initial={{ rotate: 0 }}
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 20 20" 
                    fill="none"
                  >
                    <path 
                      d="M10 3L10 17M10 17L17 10M10 17L3 10" 
                      stroke="#00d4ff" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 p-4 border rounded-lg" style={{
          background: 'rgba(255, 149, 0, 0.05)',
          borderColor: '#ff9500'
        }}>
          <h4 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{
            fontFamily: 'Orbitron, monospace',
            color: '#ff9500'
          }}>
            Quick Actions
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              className="px-4 py-2 text-sm rounded-md border transition-all"
              style={{
                fontFamily: 'Orbitron, monospace',
                border: '1px solid #00d4ff',
                background: 'rgba(0, 212, 255, 0.1)',
                color: '#00d4ff'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Export All Docs
            </motion.button>
            <motion.button
              className="px-4 py-2 text-sm rounded-md border transition-all"
              style={{
                fontFamily: 'Orbitron, monospace',
                border: '1px solid #00d4ff',
                background: 'rgba(0, 212, 255, 0.1)',
                color: '#00d4ff'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Video Tutorials
            </motion.button>
            <motion.button
              className="px-4 py-2 text-sm rounded-md border transition-all"
              style={{
                fontFamily: 'Orbitron, monospace',
                border: '1px solid #00d4ff',
                background: 'rgba(0, 212, 255, 0.1)',
                color: '#00d4ff'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Support Portal
            </motion.button>
            <motion.button
              className="px-4 py-2 text-sm rounded-md border transition-all"
              style={{
                fontFamily: 'Orbitron, monospace',
                border: '1px solid #00d4ff',
                background: 'rgba(0, 212, 255, 0.1)',
                color: '#00d4ff'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Contact Team
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
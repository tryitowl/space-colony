import React from 'react';

interface Tab {
  id: string;
  label: string;
  badge?: string;
}

interface TabSelectorProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export const TabSelector: React.FC<TabSelectorProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'primary',
  className = ''
}) => {
  const variantStyles = {
    primary: {
      active: 'bg-cyan-primary/20 border-cyan-primary text-cyan-primary',
      inactive: 'bg-space-blue-10 border-white/10 text-text-secondary hover:border-white/20'
    },
    secondary: {
      active: 'bg-purple-secondary/20 border-purple-secondary text-purple-secondary',
      inactive: 'bg-space-blue-10 border-white/10 text-text-secondary hover:border-white/20'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={`flex space-x-2 ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-2 rounded-lg border font-space text-sm transition-all
            ${activeTab === tab.id ? styles.active : styles.inactive}
          `}
        >
          <span>{tab.label}</span>
          {tab.badge && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-white/10 rounded-full">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default TabSelector;
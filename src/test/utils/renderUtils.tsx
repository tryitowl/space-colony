import React from 'react';
import { render, RenderOptions, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    img: ({ children, ...props }: any) => <img {...props}>{children}</img>,
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
  useInView: () => true,
}));

// Test wrapper component that provides necessary context
interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  return (
    <BrowserRouter>
      <div data-testid="test-wrapper">
        {children}
      </div>
    </BrowserRouter>
  );
};

// Custom render function that includes providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const user = userEvent.setup();
  
  const renderResult = render(ui, { 
    wrapper: AllTheProviders, 
    ...options 
  });

  return {
    user,
    ...renderResult,
  };
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Export additional test utilities
export const waitForLoadingToFinish = async () => {
  await waitFor(() => {
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  }, { timeout: 5000 });
};

export const expectElementToHaveAccessibleName = (element: HTMLElement, name: string) => {
  expect(element).toHaveAccessibleName(name);
};

export const expectElementToBeVisible = (element: HTMLElement) => {
  expect(element).toBeVisible();
  expect(element).toBeInTheDocument();
};

export const expectElementToBeHidden = (element: HTMLElement) => {
  expect(element).not.toBeVisible();
};

// Mock game context provider for components that need it
export const MockGameContextProvider: React.FC<{ 
  children: React.ReactNode; 
  value?: any 
}> = ({ children, value = {} }) => {
  const defaultValue = {
    session: null,
    team: null,
    teams: [],
    gameState: 'setup',
    currentRound: 1,
    timeRemaining: 300000,
    isConnected: true,
    ...value
  };

  return (
    <div data-testid="mock-game-context" data-context={JSON.stringify(defaultValue)}>
      {children}
    </div>
  );
};

// Helper to create mock props with defaults
export const createMockProps = <T extends Record<string, any>>(
  overrides: Partial<T> = {}
): T => {
  const defaults = {
    className: '',
    disabled: false,
    loading: false,
    onClick: vi.fn(),
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides
  };
  
  return defaults as T;
};

// Helper for testing component accessibility
export const testComponentAccessibility = async (component: React.ReactElement) => {
  const { container } = customRender(component);
  
  // Check for common accessibility issues
  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    expect(button).toHaveAccessibleName();
  });

  const inputs = container.querySelectorAll('input');
  inputs.forEach(input => {
    if (input.type !== 'hidden') {
      expect(input).toHaveAccessibleName();
    }
  });

  const images = container.querySelectorAll('img');
  images.forEach(img => {
    expect(img).toHaveAttribute('alt');
  });
};

// Helper for testing responsive behavior
export const testResponsiveBreakpoints = (component: React.ReactElement) => {
  const breakpoints = [
    { width: 320, height: 568 }, // Mobile
    { width: 768, height: 1024 }, // Tablet
    { width: 1024, height: 768 }, // Landscape tablet
    { width: 1280, height: 720 }, // Desktop
    { width: 1920, height: 1080 }, // Large desktop
  ];

  breakpoints.forEach(({ width, height }) => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    // Render component and check it doesn't break
    const { container } = customRender(component);
    expect(container.firstChild).toBeInTheDocument();
  });
};

// Helper for testing error boundaries
export const TestErrorBoundary: React.FC<{ 
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}> = ({ children, onError }) => {
  return (
    <div data-testid="error-boundary">
      {children}
    </div>
  );
};

// Mock data generators for tests
export const generateMockInvestmentOptions = () => [
  {
    id: 'scouts' as const,
    name: 'Scout Network',
    description: 'Deploy scouts to gather intelligence',
    costPerLevel: 100,
    maxLevel: 5,
    currentLevel: 0,
    returns: {
      description: 'Generates 1 intel per round per level'
    },
    tooltip: 'Scouts provide valuable intelligence about other colonies and resources'
  },
  {
    id: 'productionUpgrades' as const,
    name: 'Production Upgrades',
    description: 'Improve resource production efficiency',
    costPerLevel: 150,
    maxLevel: 4,
    currentLevel: 0,
    returns: {
      description: 'Increases specialty resource production by 2 per level'
    },
    tooltip: 'Upgrades increase your colony\'s specialized resource output'
  },
  {
    id: 'researchLabs' as const,
    name: 'Research Labs',
    description: 'Develop new technologies',
    costPerLevel: 200,
    maxLevel: 3,
    currentLevel: 0,
    returns: {
      description: 'Generates 1 tech patent per round per level'
    },
    tooltip: 'Research labs unlock new technologies and patents'
  }
];

export const generateMockIntelItems = () => [
  {
    id: 'intel-1',
    title: 'Market Analysis Report',
    content: 'Colony B is experiencing high demand for water resources. Trade opportunity detected.',
    value: 150,
    distributionCount: 0,
    roundGenerated: 1,
    source: 'scout' as const
  },
  {
    id: 'intel-2',
    title: 'Crisis Warning: Solar Storm',
    content: 'A massive solar storm is approaching. Colonies should prepare for energy disruptions.',
    value: 200,
    distributionCount: 1,
    roundGenerated: 2,
    source: 'communication' as const
  },
  {
    id: 'intel-3',
    title: 'Technology Breakthrough',
    content: 'Research Colony has developed a new water purification method. Patent available for trade.',
    value: 300,
    distributionCount: 2,
    roundGenerated: 1,
    source: 'research' as const
  }
];

export const generateMockTradeOffers = () => [
  {
    id: 'trade-1',
    initiatorId: 'colony-1',
    targetId: 'colony-2',
    offerResources: { oxygen: 10, minerals: 5 },
    requestResources: { food: 8, water: 4 },
    status: 'pending' as const,
    timestamp: Date.now(),
    expiresAt: Date.now() + 180000,
    negotiationHistory: []
  },
  {
    id: 'trade-2',
    initiatorId: 'colony-3',
    targetId: 'colony-1',
    offerResources: { techComponents: 3 },
    requestResources: { energy: 12 },
    status: 'accepted' as const,
    timestamp: Date.now() - 1800000,
    expiresAt: Date.now() + 180000,
    negotiationHistory: []
  }
];
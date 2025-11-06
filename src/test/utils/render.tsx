import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GameProvider } from '@/contexts/GameContext';
import { vi } from 'vitest';
import type { User } from 'firebase/auth';
import { mockUser, mockAuth } from './firebase';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  user?: User | null;
  gameState?: any;
}

interface ProvidersProps {
  children: React.ReactNode;
  gameState?: any;
}

const AllTheProviders: React.FC<ProvidersProps> = ({ 
  children, 
  gameState = {} 
}) => {
  return (
    <BrowserRouter>
      <GameProvider>
        {children}
      </GameProvider>
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult => {
  const { initialRoute = '/', gameState, ...renderOptions } = options || {};

  // Set initial route if provided
  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders gameState={gameState}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Utility functions for common test scenarios

export const renderWithGame = (ui: ReactElement, gameState: any) => {
  return customRender(ui, { gameState });
};

// Helper to test responsive behavior
export const renderAtBreakpoint = (
  ui: ReactElement,
  width: number,
  options?: CustomRenderOptions
) => {
  // Mock window dimensions
  window.innerWidth = width;
  window.innerHeight = width < 768 ? 400 : 800; // Landscape on mobile
  window.dispatchEvent(new Event('resize'));

  return customRender(ui, options);
};

// Common breakpoint render helpers
export const renderMobile = (ui: ReactElement, options?: CustomRenderOptions) => 
  renderAtBreakpoint(ui, 375, options);

export const renderTablet = (ui: ReactElement, options?: CustomRenderOptions) => 
  renderAtBreakpoint(ui, 768, options);

export const renderDesktop = (ui: ReactElement, options?: CustomRenderOptions) => 
  renderAtBreakpoint(ui, 1024, options);
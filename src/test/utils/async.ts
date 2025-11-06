import { waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Wait for async Firebase operations
export const waitForFirebaseUpdate = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
};

// Wait for multiple Firebase updates
export const waitForFirebaseUpdates = async (count: number = 3) => {
  for (let i = 0; i < count; i++) {
    await waitForFirebaseUpdate();
  }
};

// Wait for a condition with custom timeout
export const waitForCondition = async (
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
};

// Wait for mock to be called with specific arguments
export const waitForMockCall = async (
  mock: ReturnType<typeof vi.fn>,
  expectedArgs?: any[],
  timeout: number = 5000
) => {
  await waitFor(
    () => {
      if (expectedArgs) {
        expect(mock).toHaveBeenCalledWith(...expectedArgs);
      } else {
        expect(mock).toHaveBeenCalled();
      }
    },
    { timeout }
  );
};

// Advance timers and wait for updates
export const advanceTimersAndWait = async (time: number) => {
  vi.advanceTimersByTime(time);
  await waitForFirebaseUpdate();
};

// Helper to test loading states
export const expectLoadingState = async (
  getElement: () => HTMLElement | null,
  expectedState: boolean = true
) => {
  if (expectedState) {
    await waitFor(() => {
      expect(getElement()).toBeInTheDocument();
    });
  } else {
    await waitFor(() => {
      expect(getElement()).not.toBeInTheDocument();
    });
  }
};

// Helper to test error states
export const expectErrorState = async (
  getByText: (text: string) => HTMLElement,
  errorMessage: string | RegExp
) => {
  await waitFor(() => {
    if (typeof errorMessage === 'string') {
      expect(getByText(errorMessage)).toBeInTheDocument();
    } else {
      expect(getByText(errorMessage)).toBeInTheDocument();
    }
  });
};

// Helper for testing real-time updates
export const simulateRealtimeUpdate = async (
  updateFn: () => void,
  waitTime: number = 100
) => {
  updateFn();
  await waitForFirebaseUpdate();
  await new Promise(resolve => setTimeout(resolve, waitTime));
};

// Helper for testing debounced functions
export const testDebouncedFunction = async (
  triggerFn: () => void,
  checkFn: () => void,
  debounceTime: number = 300
) => {
  // Trigger multiple times
  triggerFn();
  triggerFn();
  triggerFn();
  
  // Wait less than debounce time
  await advanceTimersAndWait(debounceTime - 50);
  
  // Function should not have been called yet
  expect(checkFn).not.toThrow();
  
  // Wait for full debounce time
  await advanceTimersAndWait(100);
  
  // Function should have been called once
  checkFn();
};

// Helper for testing throttled functions
export const testThrottledFunction = async (
  triggerFn: () => void,
  mock: ReturnType<typeof vi.fn>,
  throttleTime: number = 300
) => {
  // First call should go through immediately
  triggerFn();
  expect(mock).toHaveBeenCalledTimes(1);
  
  // Subsequent calls within throttle time should be ignored
  triggerFn();
  triggerFn();
  expect(mock).toHaveBeenCalledTimes(1);
  
  // After throttle time, next call should go through
  await advanceTimersAndWait(throttleTime);
  triggerFn();
  expect(mock).toHaveBeenCalledTimes(2);
};
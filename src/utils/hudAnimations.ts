/**
 * HUD Animation Utilities
 * 
 * This file contains utility functions and constants for HUD-style animations
 * used throughout the Space Colony Trade application.
 */

// Animation timing constants (in ms)
export const ANIMATION_TIMINGS = {
  SCAN: 3000,
  PULSE: 2000,
  BLINK: 1000,
  GLITCH: 200,
  FADE: 500,
};

/**
 * Creates a scanning line effect animation
 * @param element - DOM element to apply the animation to
 * @param direction - Direction of the scan ('top-to-bottom', 'left-to-right', etc.)
 * @param color - Color of the scanning line (hex or rgba)
 * @param duration - Duration of the animation in ms
 */
export const createScanAnimation = (
  _element: HTMLElement,
  direction: 'top-to-bottom' | 'left-to-right' | 'radial',
  color: string = 'rgba(0, 212, 255, 0.5)',
  duration: number = ANIMATION_TIMINGS.SCAN
) => {
  // Implementation would use Web Animations API or CSS animations
  // This is a placeholder for the actual implementation
  console.log(`Creating scan animation: ${direction} with ${color} for ${duration}ms`);
};

/**
 * Creates a pulsing glow effect
 * @param element - DOM element to apply the animation to
 * @param color - Color of the glow (hex or rgba)
 * @param intensity - Intensity of the glow (0-1)
 * @param duration - Duration of the animation in ms
 */
export const createPulseGlow = (
  _element: HTMLElement,
  color: string = 'rgba(0, 212, 255, 0.7)',
  intensity: number = 0.5,
  duration: number = ANIMATION_TIMINGS.PULSE
) => {
  // Implementation would use Web Animations API or CSS animations
  // This is a placeholder for the actual implementation
  console.log(`Creating pulse glow: ${color} with intensity ${intensity} for ${duration}ms`);
};

/**
 * Creates a digital glitch effect
 * @param element - DOM element to apply the animation to
 * @param intensity - Intensity of the glitch (0-1)
 * @param duration - Duration of the animation in ms
 */
export const createGlitchEffect = (
  _element: HTMLElement,
  intensity: number = 0.3,
  duration: number = ANIMATION_TIMINGS.GLITCH
) => {
  // Implementation would use Web Animations API or CSS animations
  // This is a placeholder for the actual implementation
  console.log(`Creating glitch effect with intensity ${intensity} for ${duration}ms`);
};

/**
 * Creates a holographic projection effect
 * @param element - DOM element to apply the animation to
 * @param color - Base color of the hologram (hex or rgba)
 * @param opacity - Base opacity of the hologram (0-1)
 */
export const createHolographicEffect = (
  _element: HTMLElement,
  color: string = 'rgba(108, 92, 231, 0.7)',
  opacity: number = 0.8
) => {
  // Implementation would use Web Animations API or CSS animations
  // This is a placeholder for the actual implementation
  console.log(`Creating holographic effect with ${color} at opacity ${opacity}`);
};

export default {
  ANIMATION_TIMINGS,
  createScanAnimation,
  createPulseGlow,
  createGlitchEffect,
  createHolographicEffect,
};

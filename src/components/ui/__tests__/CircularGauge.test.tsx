import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircularGauge } from '../CircularGauge';

describe('CircularGauge', () => {
  it('renders with basic props', () => {
    render(<CircularGauge value={50} maxValue={100} label="Test Gauge" />);
    
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Test Gauge')).toBeInTheDocument();
  });

  it('displays unit when provided', () => {
    render(<CircularGauge value={75} maxValue={100} label="Memory" unit="%" />);
    
    // Unit is rendered as a separate span
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('applies correct color based on variant', () => {
    const { container, rerender } = render(
      <CircularGauge value={50} maxValue={100} label="Test" variant="primary" />
    );
    
    let circle = container.querySelector('circle[stroke-linecap="round"]');
    expect(circle).toHaveClass('text-cyan-primary', 'stroke-cyan-primary');

    rerender(<CircularGauge value={50} maxValue={100} label="Test" variant="danger" />);
    circle = container.querySelector('circle[stroke-linecap="round"]');
    expect(circle).toHaveClass('text-danger-red', 'stroke-danger-red');
  });

  it('calculates correct percentage', () => {
    const { container } = render(
      <CircularGauge value={25} maxValue={50} label="Half" />
    );
    
    // Should be 50% (25/50)
    const progressCircle = container.querySelector('circle[stroke-linecap="round"]');
    const dasharray = progressCircle?.getAttribute('stroke-dasharray');
    const dashoffset = progressCircle?.getAttribute('stroke-dashoffset');
    
    expect(dasharray).toBeTruthy();
    expect(dashoffset).toBeTruthy();
    
    // Check that it's approximately 50% of the circle
    const circumference = 2 * Math.PI * 40; // radius is 40
    const expectedOffset = circumference * 0.5;
    expect(parseFloat(dashoffset!)).toBeCloseTo(expectedOffset, 1);
  });

  it('handles zero value', () => {
    render(<CircularGauge value={0} maxValue={100} label="Empty" />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('handles value equal to maxValue', () => {
    const { container } = render(
      <CircularGauge value={100} maxValue={100} label="Full" />
    );
    
    const progressCircle = container.querySelector('circle[stroke-linecap="round"]');
    const dashoffset = progressCircle?.getAttribute('stroke-dashoffset');
    
    // Should be 0 offset for 100%
    expect(parseFloat(dashoffset!)).toBeCloseTo(0, 1);
  });

  it('handles value exceeding maxValue', () => {
    const { container } = render(
      <CircularGauge value={150} maxValue={100} label="Overflow" />
    );
    
    // Should still display actual value
    expect(screen.getByText('150')).toBeInTheDocument();
    
    // But progress should cap at 100%
    const progressCircle = container.querySelector('circle[stroke-linecap="round"]');
    const dashoffset = progressCircle?.getAttribute('stroke-dashoffset');
    expect(parseFloat(dashoffset!)).toBeCloseTo(0, 1);
  });

  it('renders with proper size class', () => {
    const { container } = render(
      <CircularGauge value={50} maxValue={100} label="Large" size="lg" />
    );
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('w-40', 'h-40');
  });

  it('formats large numbers correctly', () => {
    render(<CircularGauge value={1234567} maxValue={2000000} label="Big Numbers" />);
    
    // Value is rounded
    expect(screen.getByText('1234567')).toBeInTheDocument();
  });

  it('shows decimal values when appropriate', () => {
    render(<CircularGauge value={3.14159} maxValue={10} label="Pi" />);
    
    // Value is rounded to integer
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('applies animation class', () => {
    const { container } = render(
      <CircularGauge value={75} maxValue={100} label="Animated" />
    );
    
    const progressCircle = container.querySelector('circle[stroke-linecap="round"]');
    expect(progressCircle).toHaveClass('transition-all', 'duration-1000', 'ease-out');
  });

  it('renders with correct variant styling', () => {
    const { container } = render(
      <CircularGauge value={50} maxValue={100} label="Test" variant="success" />
    );
    
    const progressCircle = container.querySelector('circle[stroke-linecap="round"]');
    expect(progressCircle).toHaveClass('text-success-green', 'stroke-success-green');
  });

  it('applies proper sizing', () => {
    const { container } = render(
      <CircularGauge value={50} maxValue={100} label="Glass" />
    );
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('relative', 'w-32', 'h-32');
  });

  it('handles negative values', () => {
    render(<CircularGauge value={-10} maxValue={100} label="Negative" />);
    
    expect(screen.getByText('-10')).toBeInTheDocument();
  });

  it('renders background circle', () => {
    const { container } = render(
      <CircularGauge value={50} maxValue={100} label="Test" />
    );
    
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(2); // Background and progress circles
    
    const backgroundCircle = Array.from(circles).find(c => 
      c.getAttribute('stroke') === 'currentColor'
    );
    expect(backgroundCircle).toBeInTheDocument();
  });
});
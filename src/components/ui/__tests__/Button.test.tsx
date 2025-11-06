import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with text content', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText('Primary')).toHaveClass('bg-gradient-to-r', 'from-space-cyan', 'to-space-cyan/80');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByText('Secondary')).toHaveClass('bg-gradient-to-r', 'from-space-purple', 'to-space-purple/80');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByText('Danger')).toHaveClass('bg-gradient-to-r', 'from-space-danger', 'to-space-danger/80');

    rerender(<Button variant="glass">Glass</Button>);
    expect(screen.getByText('Glass')).toHaveClass('bg-space-panel-bg', 'backdrop-blur-glass');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByText('Small')).toHaveClass('px-3', 'py-1.5', 'text-sm');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByText('Medium')).toHaveClass('px-4', 'py-2', 'text-base');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByText('Large')).toHaveClass('px-6', 'py-3', 'text-lg');
  });

  it('handles disabled state', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    const button = screen.getByText('Disabled');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders as button element', () => {
    const { container } = render(<Button>Button</Button>);
    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();
  });

  it('forwards additional props', () => {
    render(<Button data-testid="custom-button" aria-label="Custom">Button</Button>);
    
    const button = screen.getByTestId('custom-button');
    expect(button).toHaveAttribute('aria-label', 'Custom');
  });

  it('renders children content', () => {
    const Icon = () => <svg data-testid="icon" />;
    render(<Button><Icon /> With Icon</Button>);
    
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<Button className="w-full">Full Width</Button>);
    expect(screen.getByText('Full Width')).toHaveClass('w-full');
  });

  it('merges custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByText('Custom');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('inline-flex'); // Default class still applied
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByText('Loading');
    expect(button).toHaveClass('cursor-wait');
    expect(button).toBeDisabled();
  });
});
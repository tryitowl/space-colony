import type { ReactNode, ButtonHTMLAttributes, HTMLAttributes } from 'react';
import type { ResourceType, ColonyType } from './game';

// Base UI Props
export interface BaseUIProps {
  className?: string;
  children?: ReactNode;
  testId?: string;
}

// Glass Panel Variants
export type GlassPanelVariant = 'base' | 'modal' | 'card' | 'active';

export interface GlassPanelProps extends BaseUIProps, HTMLAttributes<HTMLDivElement> {
  variant?: GlassPanelVariant;
  blur?: 'light' | 'heavy';
  glow?: boolean;
  animated?: boolean;
}

// Button Variants
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends BaseUIProps, ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  glow?: boolean;
}

// Modal Props
export interface ModalProps extends BaseUIProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

// Badge Props
export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends BaseUIProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  pulse?: boolean;
  dot?: boolean;
  count?: number;
  maxCount?: number;
}

// Card Props
export type CardVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';

export interface CardProps extends BaseUIProps, HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hover?: boolean;
  clickable?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
}

// Loader Props
export type LoaderVariant = 'spinner' | 'dots' | 'pulse' | 'orbit' | 'warp';
export type LoaderSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LoaderProps extends BaseUIProps {
  variant?: LoaderVariant;
  size?: LoaderSize;
  color?: string;
  text?: string;
}

// Colony Types - Imported from game.ts

export interface ColonyAvatarProps extends BaseUIProps {
  colonyType: ColonyType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  name?: string;
  health?: number;
  status?: 'active' | 'inactive' | 'critical' | 'trading';
  animated?: boolean;
  onClick?: () => void;
}

// Resource Types

export interface ResourceInfo {
  type: ResourceType;
  amount: number;
  capacity?: number;
  production?: number;
  consumption?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface ResourceDisplayProps extends BaseUIProps {
  resource: ResourceInfo;
  showTrend?: boolean;
  showProduction?: boolean;
  critical?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

// Timer Props
export interface TimerProps extends BaseUIProps {
  duration?: number; // in seconds
  endTime?: Date;
  onComplete?: () => void;
  urgent?: boolean;
  showMilliseconds?: boolean;
  format?: 'full' | 'compact' | 'minimal';
  variant?: 'default' | 'warning' | 'danger';
}

// Leaderboard Props
export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  score: number;
  colonyType: ColonyType;
  teamId: string;
  change?: number; // rank change from previous
  eliminated?: boolean;
}

export interface LeaderboardProps extends BaseUIProps {
  entries: LeaderboardEntry[];
  currentPlayerId?: string;
  maxHeight?: number;
  showTeams?: boolean;
  showRankChange?: boolean;
  updateInterval?: number;
}

// Trade Interface Props
export interface TradeItem {
  resourceType: ResourceType;
  amount: number;
  maxAmount?: number;
}

export interface TradeOffer {
  id: string;
  fromColonyId: string;
  toColonyId: string;
  offering: TradeItem[];
  requesting: TradeItem[];
  message?: string;
  timestamp: Date;
  expiresAt?: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export interface TradeInterfaceProps extends BaseUIProps {
  playerResources: ResourceInfo[];
  targetColonyId: string;
  targetResources?: ResourceInfo[];
  onTradeSubmit: (offer: Omit<TradeOffer, 'id' | 'timestamp' | 'status'>) => void;
  onCancel: () => void;
  loading?: boolean;
  timeLimit?: number;
}

// Notification Props
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'trade' | 'intel';

export interface NotificationProps extends BaseUIProps {
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  onClose?: () => void;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: ButtonVariant;
  }>;
}

// Animation Props
export interface AnimationProps {
  duration?: number;
  delay?: number;
  easing?: string;
  infinite?: boolean;
  direction?: 'normal' | 'reverse' | 'alternate';
}

// Particle System Props
export interface ParticleSystemProps extends BaseUIProps {
  particleCount?: number;
  particleSize?: number;
  speed?: number;
  color?: string;
  opacity?: number;
  interactive?: boolean;
}

// Accessibility Props
export interface AccessibilityProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  role?: string;
  tabIndex?: number;
}

// Common Event Handlers
export interface CommonEventHandlers {
  onFocus?: () => void;
  onBlur?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

// Theme Props
export interface ThemeProps {
  theme?: 'light' | 'dark' | 'auto';
  reducedMotion?: boolean;
  highContrast?: boolean;
}

// Responsive Props
export interface ResponsiveProps {
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  hideOnDesktop?: boolean;
  mobileOnly?: boolean;
  tabletOnly?: boolean;
  desktopOnly?: boolean;
}

// Combined Props Interface
export interface UIComponentProps extends 
  BaseUIProps, 
  AccessibilityProps, 
  CommonEventHandlers, 
  ThemeProps, 
  ResponsiveProps {
}
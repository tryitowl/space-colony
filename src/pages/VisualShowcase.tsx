import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Colony3D,
  TradeParticleEffect,
  GalacticNewsFeed,
  IntelPanel,
  AnimatedLeaderboard,
  ParallaxBackground,
  AchievementCelebration,
  SwipeablePanel,
  HUDFrame,
  Button,
} from '../components/ui';
import type { IntelItem, ColonyType } from '../types/game';

/**
 * VisualShowcase - Demo page for all advanced visual features
 */
export const VisualShowcase: React.FC = () => {
  const [_activeEffect, setActiveEffect] = useState<string | null>(null);
  const [showAchievement, setShowAchievement] = useState(false);
  const [tradeParticles, setTradeParticles] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState<'space' | 'nebula' | 'asteroid' | 'warp'>('space');

  // Demo data
  const newsItems = [
    {
      id: '1',
      type: 'trade' as const,
      title: 'Major Trade Deal',
      content: 'Mining Colony A trades 500 minerals for advanced tech components with Research Station B',
      timestamp: new Date(Date.now() - 60000),
      priority: 'high' as const,
    },
    {
      id: '2',
      type: 'event' as const,
      title: 'Solar Storm Approaching',
      content: 'All colonies advised to increase energy reserves. Storm expected in 3 rounds.',
      timestamp: new Date(Date.now() - 180000),
      priority: 'critical' as const,
    },
    {
      id: '3',
      type: 'intel' as const,
      title: 'New Resource Discovered',
      content: 'Alien technology fragments found in sector 7. High value for research colonies.',
      timestamp: new Date(Date.now() - 300000),
      priority: 'medium' as const,
    },
  ];

  const intelItems: IntelItem[] = [
    {
      id: '1',
      title: 'Resource Shortage Alert',
      content: 'Military bases running low on oxygen. Premium prices expected.',
      value: 1000,
      distributionCount: 2,
      roundGenerated: 3,
      source: 'scout',
    },
    {
      id: '2',
      title: 'Trade Route Efficiency',
      content: 'New hyperspace lane reduces transport costs by 30%.',
      value: 500,
      distributionCount: 4,
      roundGenerated: 2,
      source: 'communication',
    },
    {
      id: '3',
      title: 'Alien Tech Location',
      content: 'Coordinates to abandoned alien station in asteroid belt.',
      value: 2000,
      distributionCount: 1,
      roundGenerated: 4,
      source: 'traded',
    },
  ];

  const leaderboardData = [
    {
      id: '1',
      rank: 1,
      previousRank: 2,
      name: 'Alpha Mining Corp',
      score: 12500,
      scoreChange: 1200,
      colonyType: 'mining' as ColonyType,
      teamId: 'A1',
    },
    {
      id: '2',
      rank: 2,
      previousRank: 1,
      name: 'Stellar Research Lab',
      score: 11800,
      scoreChange: -200,
      colonyType: 'research' as ColonyType,
      teamId: 'C1',
    },
    {
      id: '3',
      rank: 3,
      previousRank: 3,
      name: 'Galactic Trade Hub',
      score: 10200,
      scoreChange: 500,
      colonyType: 'trade_hub' as ColonyType,
      teamId: 'D1',
      isCurrentPlayer: true,
    },
  ];

  const achievement = {
    id: 'first_trade',
    title: 'Master Trader',
    description: 'Complete 10 successful trades in a single round',
    icon: '🏆',
    rarity: 'legendary' as const,
    points: 1000,
  };

  const colonyTypes: ColonyType[] = ['mining', 'agricultural', 'research', 'trade_hub', 'military', 'manufacturing'];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dynamic Background */}
      <ParallaxBackground variant={selectedBackground} enableInteraction={true} />

      {/* Main Content */}
      <div className="relative z-10 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          <HUDFrame color="cyan" variant="panel" className="mb-8 p-6">
            <h1 className="text-3xl font-bold font-space text-cyan-400 mb-4">
              Advanced Visual Features Showcase
            </h1>
            <p className="text-gray-300">
              Explore the immersive 3D elements and animations of Space Colony Exchange
            </p>
          </HUDFrame>

          {/* Background Selector */}
          <HUDFrame color="purple" variant="panel" className="mb-8 p-4">
            <h2 className="text-xl font-bold mb-4">Background Effects</h2>
            <div className="flex gap-4">
              {(['space', 'nebula', 'asteroid', 'warp'] as const).map((bg) => (
                <Button
                  key={bg}
                  variant={selectedBackground === bg ? 'primary' : 'secondary'}
                  onClick={() => setSelectedBackground(bg)}
                >
                  {bg.charAt(0).toUpperCase() + bg.slice(1)}
                </Button>
              ))}
            </div>
          </HUDFrame>

          {/* 3D Colonies Grid */}
          <HUDFrame color="amber" variant="panel" className="mb-8 p-6">
            <h2 className="text-2xl font-bold mb-6">3D Colony Representations</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {colonyTypes.map((type) => (
                <motion.div
                  key={type}
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center"
                >
                  <Colony3D
                    colonyType={type}
                    size="md"
                    rotation={true}
                    glow={true}
                    particles={true}
                    onClick={() => setActiveEffect(type)}
                  />
                  <p className="mt-4 text-sm font-semibold capitalize">
                    {type.replace('_', ' ')}
                  </p>
                </motion.div>
              ))}
            </div>
          </HUDFrame>

          {/* Interactive Effects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Trade Particle Effect Demo */}
            <HUDFrame color="cyan" variant="panel" className="p-6">
              <h3 className="text-xl font-bold mb-4">Trade Particle Effects</h3>
              <div className="relative h-64">
                <Button
                  variant="primary"
                  onClick={() => {
                    setTradeParticles(true);
                    setTimeout(() => setTradeParticles(false), 2000);
                  }}
                  className="absolute top-1/2 left-1/4 -translate-y-1/2"
                >
                  Initiate Trade
                </Button>
                <div className="absolute top-1/2 right-1/4 -translate-y-1/2">
                  <Colony3D colonyType="trade_hub" size="sm" rotation={false} particles={false} />
                </div>
                <TradeParticleEffect
                  isActive={tradeParticles}
                  fromPosition={{ x: 200, y: 150 }}
                  toPosition={{ x: 400, y: 150 }}
                  color="#00d4ff"
                />
              </div>
            </HUDFrame>

            {/* Achievement Demo */}
            <HUDFrame color="amber" variant="panel" className="p-6">
              <h3 className="text-xl font-bold mb-4">Achievement Celebrations</h3>
              <Button
                variant="success"
                onClick={() => setShowAchievement(true)}
                className="mb-4"
              >
                Unlock Achievement
              </Button>
              <p className="text-sm text-gray-400">
                Click to see legendary achievement animation
              </p>
            </HUDFrame>
          </div>

          {/* Information Displays */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* News Feed */}
            <div>
              <GalacticNewsFeed
                items={newsItems}
                variant="feed"
                showTimestamps={true}
              />
            </div>

            {/* Intel Panel */}
            <div>
              <IntelPanel
                intelItems={intelItems}
                variant="grid"
                showValue={true}
              />
            </div>

            {/* Leaderboard */}
            <div>
              <AnimatedLeaderboard
                entries={leaderboardData}
                variant="compact"
                showTrends={true}
                show3DColonies={false}
              />
            </div>
          </div>

          {/* Swipeable Panel Demo */}
          <HUDFrame color="green" variant="panel" className="p-6">
            <h3 className="text-xl font-bold mb-4">Mobile Swipe Navigation</h3>
            <SwipeablePanel
              panels={[
                <div className="p-4 text-center">Panel 1: Game Status</div>,
                <div className="p-4 text-center">Panel 2: Resources</div>,
                <div className="p-4 text-center">Panel 3: Trading</div>,
              ]}
              showIndicators={true}
              className="h-32"
            >
              <div className="p-4 text-center">
                <p className="mb-2">Swipe left/right to navigate panels</p>
                <p className="text-sm text-gray-400">(Or use arrow keys)</p>
              </div>
            </SwipeablePanel>
          </HUDFrame>

          {/* Ticker Demo */}
          <div className="mt-8">
            <GalacticNewsFeed
              items={newsItems}
              variant="ticker"
              showTimestamps={false}
            />
          </div>
        </motion.div>
      </div>

      {/* Achievement Celebration Overlay */}
      <AchievementCelebration
        achievement={showAchievement ? achievement : null}
        onComplete={() => setShowAchievement(false)}
      />
    </div>
  );
};

export default VisualShowcase;
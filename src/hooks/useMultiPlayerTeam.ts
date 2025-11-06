/**
 * Hook for managing multi-player team functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
import { PlayerPresenceService } from '../services/playerPresenceService';
import { TeamDecisionService } from '../services/teamDecisionService';
import { TeamSyncService } from '../services/teamSyncService';
import { TeamChatService } from '../services/teamChatService';
import { MultiPlayerTradingService } from '../services/multiPlayerTradingService';
import type {
  TeamPlayer,
  TeamPresence,
  TradeDecision,
  TeamChatMessage,
  TeamActivityLog,
  TeamDecisionConfig,
  PlayerPermissions,
  TeamPlayerRole
} from '../types/player.types';
import type { TradeOffer, Resources } from '../types';
import { getDefaultPermissions } from '../types/player.types';

interface UseMultiPlayerTeamProps {
  sessionId: string;
  teamId: string;
  playerId: string;
  userId: string;
}

interface UseMultiPlayerTeamReturn {
  // Team state
  teamPlayers: TeamPlayer[];
  currentPlayer: TeamPlayer | null;
  teamPresence: TeamPresence | null;
  isTeamOnline: boolean;
  
  // Permissions
  permissions: PlayerPermissions;
  canInitiateTrade: boolean;
  canAcceptTrade: boolean;
  canMakeDecisions: boolean;
  
  // Trading
  pendingDecisions: TradeDecision[];
  createTrade: (
    targetTeamId: string,
    offer: Partial<Resources>,
    request: Partial<Resources>
  ) => Promise<string>;
  acceptTrade: (tradeId: string) => Promise<boolean>;
  rejectTrade: (tradeId: string) => Promise<void>;
  voteOnTrade: (
    tradeId: string,
    vote: 'accept' | 'reject' | 'abstain'
  ) => Promise<void>;
  
  // Chat
  messages: TeamChatMessage[];
  activities: TeamActivityLog[];
  sendMessage: (message: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  typingPlayers: string[];
  
  // Team management
  updatePlayerRole: (playerId: string, newRole: TeamPlayerRole) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  updateDecisionConfig: (config: Partial<TeamDecisionConfig>) => Promise<void>;
  
  // Sync status
  isSynced: boolean;
  syncError: string | null;
  forceSync: () => Promise<void>;
}

export function useMultiPlayerTeam({
  sessionId,
  teamId,
  playerId,
  userId
}: UseMultiPlayerTeamProps): UseMultiPlayerTeamReturn {
  const { state } = useGame();
  
  // State
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<TeamPlayer | null>(null);
  const [teamPresence, setTeamPresence] = useState<TeamPresence | null>(null);
  const [pendingDecisions, setPendingDecisions] = useState<TradeDecision[]>([]);
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [activities, setActivities] = useState<TeamActivityLog[]>([]);
  const [typingPlayers, setTypingPlayers] = useState<string[]>([]);
  const [isSynced, setIsSynced] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // Service refs
  const presenceServiceRef = useRef<PlayerPresenceService | null>(null);
  const decisionServiceRef = useRef<TeamDecisionService | null>(null);
  const syncServiceRef = useRef<TeamSyncService | null>(null);
  const chatServiceRef = useRef<TeamChatService | null>(null);
  
  // Initialize services
  useEffect(() => {
    if (!sessionId || !teamId || !playerId || !userId) return;
    
    const initializeServices = async () => {
      try {
        // Get current player info from team
        const team = state.session?.teams.find(t => t.id === teamId);
        const player = team?.players.find(p => p.id === playerId);
        
        if (!player) return;
        
        // Create TeamPlayer object
        const teamPlayer: TeamPlayer = {
          id: player.id,
          userId: player.userId || userId,
          name: player.name,
          teamId,
          role: player.role || 'member',
          status: {
            isOnline: true,
            isActive: true,
            lastSeen: Date.now(),
            connectionStrength: 'strong',
            device: 'desktop'
          },
          joinedAt: player.joinedAt || Date.now(),
          lastActiveAt: Date.now(),
          permissions: getDefaultPermissions(player.role || 'member'),
          statistics: {
            tradesInitiated: 0,
            tradesCompleted: 0,
            decisionsParticipated: 0,
            resourcesGained: 0,
            resourcesLost: 0,
            activityScore: 100
          }
        };
        
        setCurrentPlayer(teamPlayer);
        
        // Initialize presence service
        presenceServiceRef.current = PlayerPresenceService.getInstance(
          sessionId,
          teamId,
          playerId,
          userId,
          {
            onPresenceUpdate: (presence) => setTeamPresence(presence),
            onConnectionChange: (connected) => {
              if (!connected) {
                setSyncError('Connection lost');
              }
            }
          }
        );
        
        await presenceServiceRef.current.initialize(player.name, player.role || 'member');
        
        // Initialize decision service
        const decisionConfig: TeamDecisionConfig = {
          mode: state.session?.settings?.decisionMode || 'consensus',
          votingTimeout: state.session?.settings?.decisionVotingTimeout || 60000,
          requireQuorum: true,
          quorumPercentage: 51,
          captainOverride: true
        };
        
        decisionServiceRef.current = TeamDecisionService.getInstance(
          sessionId,
          teamId,
          decisionConfig,
          {
            onDecisionCreated: (decision) => {
              setPendingDecisions(prev => [...prev, decision]);
            },
            onDecisionResolved: (decision) => {
              setPendingDecisions(prev => 
                prev.filter(d => d.tradeId !== decision.tradeId)
              );
            }
          }
        );
        
        await decisionServiceRef.current.initialize();
        
        // Initialize sync service
        syncServiceRef.current = TeamSyncService.getInstance(
          sessionId,
          teamId,
          playerId,
          {
            onSyncStateChange: (state) => {
              setIsSynced(state.syncStatus === 'synced');
              setSyncError(state.syncStatus === 'error' ? 'Sync error' : null);
            },
            onError: (error) => setSyncError(error.message)
          }
        );
        
        await syncServiceRef.current.initialize();
        
        // Initialize chat service
        chatServiceRef.current = TeamChatService.getInstance(
          sessionId,
          teamId,
          {
            onMessageReceived: (message) => {
              setMessages(prev => [...prev, message]);
            },
            onActivityLogged: (activity) => {
              setActivities(prev => [...prev, activity]);
            },
            onTypingStatusChange: (typing) => {
              setTypingPlayers(typing);
            }
          }
        );
        
        await chatServiceRef.current.initialize();
        
        // Load history
        const messageHistory = await chatServiceRef.current.getChatHistory();
        setMessages(messageHistory);
        
        const activityHistory = await chatServiceRef.current.getActivityHistory();
        setActivities(activityHistory);
        
        const decisionHistory = await decisionServiceRef.current.getDecisionHistory();
        setPendingDecisions(decisionHistory.filter(d => 
          d.status === 'pending' || d.status === 'voting'
        ));
        
      } catch (error) {
        console.error('Error initializing multi-player services:', error);
        setSyncError('Failed to initialize team services');
      }
    };
    
    initializeServices();
    
    // Cleanup
    return () => {
      presenceServiceRef.current?.destroy();
      decisionServiceRef.current?.destroy();
      syncServiceRef.current?.destroy();
      chatServiceRef.current?.destroy();
    };
  }, [sessionId, teamId, playerId, userId, state.session]);
  
  // Update team players from presence
  useEffect(() => {
    if (!teamPresence || !state.session) return;
    
    const team = state.session.teams.find(t => t.id === teamId);
    if (!team) return;
    
    const players: TeamPlayer[] = team.players.map(p => {
      const presence = teamPresence.players.find(pr => pr.playerId === p.id);
      
      return {
        id: p.id,
        userId: p.userId || '',
        name: p.name,
        teamId,
        role: p.role || 'member',
        status: {
          isOnline: presence?.isOnline || false,
          isActive: presence?.isActive || false,
          lastSeen: presence?.lastActiveAt || p.lastSeen,
          connectionStrength: presence?.isOnline ? 'strong' : 'offline',
          device: 'desktop'
        },
        joinedAt: p.joinedAt || Date.now(),
        lastActiveAt: presence?.lastActiveAt || Date.now(),
        permissions: getDefaultPermissions(p.role || 'member'),
        statistics: {
          tradesInitiated: 0,
          tradesCompleted: 0,
          decisionsParticipated: 0,
          resourcesGained: 0,
          resourcesLost: 0,
          activityScore: 100
        }
      };
    });
    
    setTeamPlayers(players);
  }, [teamPresence, state.session, teamId]);
  
  // Trading functions
  const createTrade = useCallback(async (
    targetTeamId: string,
    offer: Partial<Resources>,
    request: Partial<Resources>
  ): Promise<string> => {
    if (!currentPlayer) throw new Error('Player not initialized');
    
    return MultiPlayerTradingService.createTradeOfferWithApproval(
      sessionId,
      teamId,
      targetTeamId,
      offer,
      request,
      currentPlayer
    );
  }, [sessionId, teamId, currentPlayer]);
  
  const acceptTrade = useCallback(async (tradeId: string): Promise<boolean> => {
    if (!currentPlayer) throw new Error('Player not initialized');
    
    return MultiPlayerTradingService.acceptTradeOfferWithApproval(
      sessionId,
      tradeId,
      teamId,
      currentPlayer
    );
  }, [sessionId, teamId, currentPlayer]);
  
  const rejectTrade = useCallback(async (tradeId: string): Promise<void> => {
    if (!currentPlayer) throw new Error('Player not initialized');
    
    return MultiPlayerTradingService.rejectTradeOfferWithLogging(
      sessionId,
      tradeId,
      teamId,
      currentPlayer
    );
  }, [sessionId, teamId, currentPlayer]);
  
  const voteOnTrade = useCallback(async (
    tradeId: string,
    vote: 'accept' | 'reject' | 'abstain'
  ): Promise<void> => {
    if (!currentPlayer || !decisionServiceRef.current) {
      throw new Error('Services not initialized');
    }
    
    await decisionServiceRef.current.voteOnDecision(
      tradeId,
      currentPlayer,
      vote
    );
  }, [currentPlayer]);
  
  // Chat functions
  const sendMessage = useCallback(async (message: string): Promise<void> => {
    if (!currentPlayer || !chatServiceRef.current) return;
    
    await chatServiceRef.current.sendMessage(
      currentPlayer.id,
      currentPlayer.name,
      message
    );
  }, [currentPlayer]);
  
  const setTyping = useCallback((isTyping: boolean): void => {
    if (!chatServiceRef.current || !currentPlayer) return;
    
    chatServiceRef.current.setTypingStatus(currentPlayer.id, isTyping);
  }, [currentPlayer]);
  
  // Team management
  const updatePlayerRole = useCallback(async (
    targetPlayerId: string,
    newRole: TeamPlayerRole
  ): Promise<void> => {
    if (!currentPlayer || currentPlayer.role !== 'captain') {
      throw new Error('Only captain can update roles');
    }
    
    const { GameService } = await import('../services/gameService');
    await GameService.updatePlayerRole(
      sessionId,
      teamId,
      targetPlayerId,
      newRole,
      currentPlayer.id
    );
  }, [sessionId, teamId, currentPlayer]);
  
  const removePlayer = useCallback(async (targetPlayerId: string): Promise<void> => {
    if (!currentPlayer || currentPlayer.role !== 'captain') {
      throw new Error('Only captain can remove players');
    }
    
    const { GameService } = await import('../services/gameService');
    await GameService.removePlayerFromTeam(
      sessionId,
      teamId,
      targetPlayerId,
      currentPlayer.id
    );
  }, [sessionId, teamId, currentPlayer]);
  
  const updateDecisionConfig = useCallback(async (
    config: Partial<TeamDecisionConfig>
  ): Promise<void> => {
    if (!decisionServiceRef.current) return;
    
    await decisionServiceRef.current.updateConfig(config);
  }, []);
  
  const forceSync = useCallback(async (): Promise<void> => {
    if (!syncServiceRef.current) return;
    
    await syncServiceRef.current.forceSync();
  }, []);
  
  // Calculate permissions and capabilities
  const permissions = currentPlayer?.permissions || getDefaultPermissions('member');
  const canInitiateTrade = permissions.canInitiateTrades;
  const canAcceptTrade = permissions.canAcceptTrades;
  const canMakeDecisions = permissions.canInitiateTrades || 
                          permissions.canAcceptTrades || 
                          permissions.canMakeInvestments;
  
  const isTeamOnline = teamPresence?.onlinePlayerCount ? teamPresence.onlinePlayerCount > 0 : false;
  
  return {
    // Team state
    teamPlayers,
    currentPlayer,
    teamPresence,
    isTeamOnline,
    
    // Permissions
    permissions,
    canInitiateTrade,
    canAcceptTrade,
    canMakeDecisions,
    
    // Trading
    pendingDecisions,
    createTrade,
    acceptTrade,
    rejectTrade,
    voteOnTrade,
    
    // Chat
    messages,
    activities,
    sendMessage,
    setTyping,
    typingPlayers,
    
    // Team management
    updatePlayerRole,
    removePlayer,
    updateDecisionConfig,
    
    // Sync status
    isSynced,
    syncError,
    forceSync
  };
}
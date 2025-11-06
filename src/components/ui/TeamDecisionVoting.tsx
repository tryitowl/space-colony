/**
 * Team Decision Voting - Interface for voting on team decisions
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TradeDecision, PlayerVote } from '../../types/player.types';
import type { TradeOffer } from '../../types';

interface TeamDecisionVotingProps {
  decision: TradeDecision;
  currentPlayerId: string;
  teamPlayers: Array<{ id: string; name: string; role: string }>;
  onVote: (vote: 'accept' | 'reject' | 'abstain') => Promise<void>;
  trade?: TradeOffer;
}

export const TeamDecisionVoting: React.FC<TeamDecisionVotingProps> = ({
  decision,
  currentPlayerId,
  teamPlayers,
  onVote,
  trade
}) => {
  const [voting, setVoting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedVote, setSelectedVote] = useState<'accept' | 'reject' | 'abstain' | null>(null);

  // Calculate time remaining
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, decision.expiresAt - Date.now());
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [decision.expiresAt]);

  // Check if current player has voted
  const currentPlayerVote = decision.votes.find(v => v.playerId === currentPlayerId);
  const hasVoted = !!currentPlayerVote;

  // Calculate vote counts
  const voteCount = {
    accept: decision.votes.filter(v => v.vote === 'accept').length,
    reject: decision.votes.filter(v => v.vote === 'reject').length,
    abstain: decision.votes.filter(v => v.vote === 'abstain').length
  };

  const totalVotes = decision.votes.length;
  const totalPlayers = teamPlayers.length;

  const handleVote = async (vote: 'accept' | 'reject' | 'abstain') => {
    if (voting || hasVoted) return;
    
    setVoting(true);
    setSelectedVote(vote);
    
    try {
      await onVote(vote);
    } catch (error) {
      console.error('Failed to vote:', error);
    } finally {
      setVoting(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getVoteIcon = (vote: string) => {
    switch (vote) {
      case 'accept':
        return '✅';
      case 'reject':
        return '❌';
      case 'abstain':
        return '🤷';
      default:
        return '❓';
    }
  };

  const getStatusColor = () => {
    switch (decision.status) {
      case 'approved':
        return 'text-green-400';
      case 'rejected':
        return 'text-red-400';
      case 'expired':
        return 'text-gray-400';
      case 'overridden':
        return 'text-yellow-400';
      default:
        return 'text-cyan-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glassmorphic-depth rounded-lg p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cyan-300">Team Decision Required</h3>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {decision.status.toUpperCase()}
          </span>
          {decision.status === 'voting' && (
            <span className={`text-sm ${timeRemaining < 30000 ? 'text-red-400' : 'text-gray-400'}`}>
              {formatTime(timeRemaining)}
            </span>
          )}
        </div>
      </div>

      {/* Trade details */}
      {trade && (
        <div className="glassmorphic p-3 rounded space-y-2 text-sm">
          <div className="text-gray-400">Trade Proposal</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-cyan-400 font-medium">We Give:</div>
              {Object.entries(trade.offerResources).map(([resource, amount]) => (
                <div key={resource} className="text-gray-300">
                  {resource}: {typeof amount === 'number' ? amount : `${amount.length} items`}
                </div>
              ))}
            </div>
            <div>
              <div className="text-green-400 font-medium">We Receive:</div>
              {Object.entries(trade.requestResources).map(([resource, amount]) => (
                <div key={resource} className="text-gray-300">
                  {resource}: {typeof amount === 'number' ? amount : `${amount.length} items`}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Voting progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Votes: {totalVotes}/{totalPlayers}</span>
          <div className="flex items-center space-x-3">
            <span className="text-green-400">{getVoteIcon('accept')} {voteCount.accept}</span>
            <span className="text-red-400">{getVoteIcon('reject')} {voteCount.reject}</span>
            <span className="text-gray-400">{getVoteIcon('abstain')} {voteCount.abstain}</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="flex h-full">
            {voteCount.accept > 0 && (
              <div 
                className="bg-green-500 transition-all duration-300"
                style={{ width: `${(voteCount.accept / totalPlayers) * 100}%` }}
              />
            )}
            {voteCount.reject > 0 && (
              <div 
                className="bg-red-500 transition-all duration-300"
                style={{ width: `${(voteCount.reject / totalPlayers) * 100}%` }}
              />
            )}
            {voteCount.abstain > 0 && (
              <div 
                className="bg-gray-500 transition-all duration-300"
                style={{ width: `${(voteCount.abstain / totalPlayers) * 100}%` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Vote buttons */}
      {decision.status === 'voting' && !hasVoted && (
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={() => handleVote('accept')}
            disabled={voting}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              selectedVote === 'accept' 
                ? 'bg-green-500 text-white' 
                : 'glassmorphic hover:bg-green-500/20 text-green-400'
            } ${voting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {voting && selectedVote === 'accept' ? 'Voting...' : 'Accept'}
          </button>
          
          <button
            onClick={() => handleVote('reject')}
            disabled={voting}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              selectedVote === 'reject' 
                ? 'bg-red-500 text-white' 
                : 'glassmorphic hover:bg-red-500/20 text-red-400'
            } ${voting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {voting && selectedVote === 'reject' ? 'Voting...' : 'Reject'}
          </button>
          
          <button
            onClick={() => handleVote('abstain')}
            disabled={voting}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              selectedVote === 'abstain' 
                ? 'bg-gray-500 text-white' 
                : 'glassmorphic hover:bg-gray-500/20 text-gray-400'
            } ${voting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {voting && selectedVote === 'abstain' ? 'Voting...' : 'Abstain'}
          </button>
        </div>
      )}

      {/* Current player vote */}
      {hasVoted && (
        <div className="text-center text-sm text-gray-400">
          You voted: <span className={`font-medium ${
            currentPlayerVote?.vote === 'accept' ? 'text-green-400' :
            currentPlayerVote?.vote === 'reject' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {getVoteIcon(currentPlayerVote?.vote || '')} {currentPlayerVote?.vote}
          </span>
        </div>
      )}

      {/* Vote details */}
      <div className="space-y-1 text-xs">
        <AnimatePresence>
          {decision.votes.map((vote) => {
            const player = teamPlayers.find(p => p.id === vote.playerId);
            return (
              <motion.div
                key={vote.playerId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between text-gray-400"
              >
                <span>{player?.name || 'Unknown'}</span>
                <span className={
                  vote.vote === 'accept' ? 'text-green-400' :
                  vote.vote === 'reject' ? 'text-red-400' :
                  'text-gray-400'
                }>
                  {getVoteIcon(vote.vote)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Decision reason */}
      {decision.decisionReason && (
        <div className="text-sm text-gray-400 text-center italic">
          "{decision.decisionReason}"
        </div>
      )}
    </motion.div>
  );
};
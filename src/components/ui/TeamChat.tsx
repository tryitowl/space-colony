/**
 * Team Chat - Real-time chat interface for team communication
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TeamChatMessage } from '../../types/player.types';

interface TeamChatProps {
  messages: TeamChatMessage[];
  currentPlayerId: string;
  currentPlayerName: string;
  typingPlayers: string[];
  onSendMessage: (message: string) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  teamPlayers: Array<{ id: string; name: string }>;
}

export const TeamChat: React.FC<TeamChatProps> = ({
  messages,
  currentPlayerId,
  typingPlayers,
  onSendMessage,
  onTyping,
  teamPlayers
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    onTyping(false);
    
    try {
      await onSendMessage(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing status
    if (value.trim()) {
      onTyping(true);
      
      // Clear typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    } else {
      onTyping(false);
    }
  };

  const getMessageColor = (type: TeamChatMessage['type']) => {
    switch (type) {
      case 'system':
        return 'text-gray-400';
      case 'trade':
        return 'text-cyan-400';
      case 'alert':
        return 'text-red-400';
      default:
        return 'text-gray-200';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPlayerName = (playerId: string) => {
    if (playerId === 'system') return 'System';
    const player = teamPlayers.find(p => p.id === playerId);
    return player?.name || 'Unknown';
  };

  return (
    <div className="glassmorphic-depth rounded-lg flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-cyan-300">Team Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`${
                msg.playerId === currentPlayerId ? 'text-right' : 'text-left'
              }`}
            >
              <div className={`inline-block max-w-[80%] ${
                msg.playerId === currentPlayerId ? 'ml-auto' : 'mr-auto'
              }`}>
                {/* Player name and time */}
                <div className="flex items-center space-x-2 mb-1 text-xs text-gray-500">
                  {msg.playerId !== currentPlayerId && (
                    <span className="font-medium">
                      {getPlayerName(msg.playerId)}
                    </span>
                  )}
                  <span>{formatTime(msg.timestamp)}</span>
                </div>
                
                {/* Message bubble */}
                <div className={`p-3 rounded-lg ${
                  msg.playerId === currentPlayerId
                    ? 'glassmorphic bg-cyan-500/10'
                    : msg.type === 'system'
                    ? 'glassmorphic bg-gray-700/30'
                    : 'glassmorphic'
                }`}>
                  <p className={`text-sm ${getMessageColor(msg.type)}`}>
                    {msg.message}
                  </p>
                  
                  {/* Trade metadata */}
                  {msg.type === 'trade' && msg.metadata?.targetTeam && (
                    <div className="mt-1 text-xs text-gray-500">
                      with {msg.metadata.targetTeam}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Typing indicator */}
        {typingPlayers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-gray-500 italic"
          >
            {typingPlayers.map(p => getPlayerName(p)).join(', ')} 
            {typingPlayers.length === 1 ? ' is' : ' are'} typing...
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 glassmorphic px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              message.trim() && !sending
                ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                : 'glassmorphic text-gray-500 cursor-not-allowed'
            }`}
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};
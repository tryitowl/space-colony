import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { ModernLayout } from '../components/ui/ModernLayout';
import { AdminAuthService } from '../services/adminAuthService';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const success = await AdminAuthService.adminLogin(email, password);
      
      if (success) {
        navigate('/admin');
      } else {
        setError('Invalid admin credentials');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillTestCredentials = () => {
    const creds = AdminAuthService.getHardcodedCredentials();
    setEmail(creds.email);
    setPassword(creds.password);
  };

  return (
    <ModernLayout className="p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-space-gold to-space-cyan mb-2">
            ADMIN ACCESS
          </h1>
          <p className="text-space-text-secondary">
            Space Colony Exchange Administration
          </p>
        </div>

        <GlassPanel className="p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-space-gold/5 to-transparent" />
          <div className="relative z-10">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-space-gold/20 to-space-gold/10 rounded-2xl flex items-center justify-center animate-pulse">
                <span className="text-4xl">🛡️</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-space-text-secondary mb-2 font-orbitron">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@spacecolony.test"
                  className="w-full px-4 py-3 bg-space-black/50 border border-white/20 rounded-xl text-white placeholder-space-text-secondary/60 focus:border-space-gold focus:outline-none focus:ring-2 focus:ring-space-gold/30 transition-all duration-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-space-text-secondary mb-2 font-orbitron">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-3 bg-space-black/50 border border-white/20 rounded-xl text-white placeholder-space-text-secondary/60 focus:border-space-gold focus:outline-none focus:ring-2 focus:ring-space-gold/30 transition-all duration-300"
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-red-900/30 border border-red-500/40 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-red-400">⚠️</span>
                    <p className="text-sm text-red-300 font-medium">{error}</p>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  loading={isLoading}
                  size="lg"
                  variant="secondary"
                  className="w-full"
                >
                  🔐 Admin Login
                </Button>
              </div>
            </form>
          </div>

          {/* Test Credentials Helper */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowCredentials(!showCredentials)}
                className="text-xs text-space-text-secondary hover:text-space-gold transition-colors font-orbitron inline-flex items-center space-x-1"
              >
                <span>{showCredentials ? '▲' : '▼'}</span>
                <span>{showCredentials ? 'Hide' : 'Show'} Test Credentials</span>
              </button>
            </div>
            
            {showCredentials && (
              <div className="mt-3 p-4 bg-blue-900/20 border border-space-cyan/30 rounded-xl backdrop-blur-sm">
                <p className="text-xs text-space-text-secondary mb-3 text-center">
                  For testing purposes:
                </p>
                <div className="bg-space-black/40 rounded-lg p-3 mb-3">
                  <div className="text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-space-text-secondary">Email:</span>
                      <span className="text-space-cyan">admin@spacecolony.test</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-space-text-secondary">Password:</span>
                      <span className="text-space-cyan">admin123</span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="glass"
                  onClick={fillTestCredentials}
                  className="w-full text-xs"
                >
                  📝 Auto-Fill Credentials
                </Button>
              </div>
            )}
          </div>
        </GlassPanel>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm text-space-text-secondary hover:text-space-cyan transition-colors font-orbitron inline-flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back to Game</span>
          </button>
        </div>
      </div>
    </ModernLayout>
  );
};
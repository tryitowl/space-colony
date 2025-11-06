// Audio alert system for trading notifications
export class AudioAlerts {
  private static audioContext: AudioContext | null = null;
  private static isEnabled: boolean = true;
  private static volume: number = 0.3;

  // Initialize audio context
  private static getAudioContext(): AudioContext | null {
    if (!this.audioContext && typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        this.audioContext = new AudioContext();
      } catch (error) {
        console.warn('Failed to initialize AudioContext:', error);
      }
    }
    return this.audioContext;
  }

  // Generate tone for notifications
  private static createTone(
    frequency: number, 
    duration: number, 
    type: OscillatorType = 'sine'
  ): void {
    if (!this.isEnabled) return;
    
    const audioContext = this.getAudioContext();
    if (!audioContext) return;

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Failed to play audio alert:', error);
    }
  }

  // Play sequence of tones
  private static playSequence(tones: Array<{frequency: number, duration: number, delay?: number}>): void {
    if (!this.isEnabled) return;

    let currentTime = 0;
    tones.forEach(tone => {
      setTimeout(() => {
        this.createTone(tone.frequency, tone.duration);
      }, currentTime);
      currentTime += (tone.delay || tone.duration * 1000);
    });
  }

  // Specific alert sounds
  static playIncomingTradeAlert(): void {
    this.playSequence([
      { frequency: 800, duration: 0.2 },
      { frequency: 1000, duration: 0.2, delay: 250 },
      { frequency: 1200, duration: 0.3, delay: 250 }
    ]);
  }

  static playTradeAcceptedAlert(): void {
    this.playSequence([
      { frequency: 600, duration: 0.15 },
      { frequency: 800, duration: 0.15, delay: 150 },
      { frequency: 1000, duration: 0.15, delay: 150 },
      { frequency: 1200, duration: 0.4, delay: 150 }
    ]);
  }

  static playTradeRejectedAlert(): void {
    this.playSequence([
      { frequency: 400, duration: 0.3 },
      { frequency: 350, duration: 0.3, delay: 100 },
      { frequency: 300, duration: 0.5, delay: 100 }
    ]);
  }

  static playCounterOfferAlert(): void {
    this.playSequence([
      { frequency: 700, duration: 0.2 },
      { frequency: 900, duration: 0.2, delay: 200 },
      { frequency: 700, duration: 0.2, delay: 200 }
    ]);
  }

  static playUrgentTimerAlert(): void {
    this.playSequence([
      { frequency: 1500, duration: 0.1 },
      { frequency: 1500, duration: 0.1, delay: 150 },
      { frequency: 1500, duration: 0.1, delay: 150 },
      { frequency: 1800, duration: 0.3, delay: 150 }
    ]);
  }

  static playWarningTimerAlert(): void {
    this.playSequence([
      { frequency: 1000, duration: 0.2 },
      { frequency: 1200, duration: 0.2, delay: 250 }
    ]);
  }

  static playIntelAlert(): void {
    this.playSequence([
      { frequency: 500, duration: 0.1 },
      { frequency: 750, duration: 0.1, delay: 100 },
      { frequency: 1000, duration: 0.1, delay: 100 },
      { frequency: 1250, duration: 0.2, delay: 100 }
    ]);
  }

  static playTradeCompletedAlert(): void {
    this.playSequence([
      { frequency: 523, duration: 0.2 }, // C
      { frequency: 659, duration: 0.2, delay: 200 }, // E
      { frequency: 784, duration: 0.2, delay: 200 }, // G
      { frequency: 1047, duration: 0.4, delay: 200 } // C (octave)
    ]);
  }

  // Settings management
  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('audioAlertsEnabled', enabled.toString());
  }

  static getEnabled(): boolean {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audioAlertsEnabled');
      if (saved !== null) {
        this.isEnabled = saved === 'true';
      }
    }
    return this.isEnabled;
  }

  static setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('audioAlertsVolume', this.volume.toString());
  }

  static getVolume(): number {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audioAlertsVolume');
      if (saved !== null) {
        this.volume = parseFloat(saved);
      }
    }
    return this.volume;
  }

  // Initialize settings from localStorage
  static init(): void {
    this.getEnabled();
    this.getVolume();
  }

  // Request permission for audio (some browsers require user interaction)
  static async requestAudioPermission(): Promise<boolean> {
    try {
      const audioContext = this.getAudioContext();
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      return true;
    } catch (error) {
      console.warn('Failed to request audio permission:', error);
      return false;
    }
  }
}
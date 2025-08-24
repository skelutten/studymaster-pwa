import { EnvironmentalContext, SessionContext } from '../../../../shared/types/enhanced-types';

export interface DetectedContext extends EnvironmentalContext {
  confidence: number; // 0-1 confidence in detection accuracy
  detectionMethod: string; // How the context was detected
  timestamp: string;
}

export interface ContextualInsights {
  optimalStudyConditions: EnvironmentalContext;
  currentConditionScore: number; // 0-1 how optimal current conditions are
  improvementSuggestions: string[];
  historicalPerformance: PerformanceByContext[];
}

export interface PerformanceByContext {
  context: Partial<EnvironmentalContext>;
  averageAccuracy: number;
  averageResponseTime: number;
  sessionCount: number;
  confidenceInterval: [number, number];
}

export interface EnvironmentalAdaptation {
  difficultyAdjustment: number; // Adjustment based on environment (-3 to +3)
  recommendedBreakFrequency: number; // Minutes between suggested breaks
  visualOptimizations: {
    contrastAdjustment: number; // -1 to +1
    fontSizeAdjustment: number; // -1 to +1 (relative)
    colorScheme: 'light' | 'dark' | 'auto';
  };
  audioOptimizations: {
    enableSoundEffects: boolean;
    volumeAdjustment: number; // 0-1
  };
}

export class EnvironmentalContextService {
  private contextHistory: DetectedContext[] = [];
  private performanceCache: Map<string, PerformanceByContext> = new Map();

  /**
   * Get comprehensive current environmental context
   */
  async getCurrentContext(): Promise<DetectedContext> {
    const context: EnvironmentalContext = {
      device: this.detectDevice(),
      networkQuality: await this.assessNetworkQuality(),
    };
    
    let confidence = 0.9; // Base confidence

    // Enhanced mobile detection with additional context
    if (context.device === 'mobile') {
      try {
        context.batteryLevel = await this.getBatteryLevel();
        if (context.batteryLevel !== undefined) confidence += 0.05;
      } catch (error) {
        console.warn('Battery level detection failed:', error);
      }
    }

    // Ambient conditions detection
    try {
      context.ambientNoise = await this.detectAmbientNoise();
      context.lighting = await this.detectLightingConditions();
      confidence += 0.05;
    } catch (error) {
      console.warn('Ambient conditions detection failed:', error);
      confidence -= 0.1;
    }

    const detectedContext: DetectedContext = {
      ...context,
      confidence: Math.max(0.5, confidence),
      detectionMethod: 'multi-sensor-fusion',
      timestamp: new Date().toISOString()
    };

    // Store in history
    this.contextHistory.push(detectedContext);
    if (this.contextHistory.length > 100) {
      this.contextHistory.shift(); // Keep only last 100 entries
    }

    return detectedContext;
  }

  /**
   * Detect device type with enhanced accuracy
   */
  private detectDevice(): 'mobile' | 'desktop' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';
    
    // Check for mobile indicators
    const mobileKeywords = ['mobile', 'android', 'iphone', 'ipod', 'blackberry', 'windows phone'];
    const isMobile = mobileKeywords.some(keyword => userAgent.includes(keyword));
    
    // Check for tablet indicators
    const tabletKeywords = ['ipad', 'tablet', 'kindle', 'playbook', 'silk'];
    const isTablet = tabletKeywords.some(keyword => userAgent.includes(keyword));
    
    // Enhanced detection using screen size and touch capabilities
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const maxDimension = Math.max(screenWidth, screenHeight);
    const minDimension = Math.min(screenWidth, screenHeight);
    
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isTablet || (hasTouchScreen && minDimension >= 768 && maxDimension >= 1024)) {
      return 'tablet';
    }
    
    if (isMobile || (hasTouchScreen && maxDimension <= 736)) {
      return 'mobile';
    }
    
    // Additional checks for desktop
    const isDesktop = platform.includes('win') || platform.includes('mac') || platform.includes('linux');
    
    return isDesktop || !hasTouchScreen ? 'desktop' : 'mobile';
  }

  /**
   * Assess network quality with multiple metrics
   */
  private async assessNetworkQuality(): Promise<'excellent' | 'good' | 'poor' | 'offline'> {
    if (!navigator.onLine) return 'offline';
    
    try {
      // Use Connection API if available (Chrome/Edge)
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;
        const rtt = connection.rtt;
        
        // Advanced classification based on multiple metrics
        if (effectiveType === '4g' && downlink > 10 && rtt < 100) {
          return 'excellent';
        } else if ((effectiveType === '4g' || effectiveType === '3g') && downlink > 2 && rtt < 300) {
          return 'good';
        } else if (downlink > 0.5 && rtt < 1000) {
          return 'good';
        } else {
          return 'poor';
        }
      }
      
      // Fallback: Performance-based detection
      return await this.performLatencyTest();
    } catch (error) {
      console.warn('Network quality assessment failed:', error);
      return 'good'; // Default assumption
    }
  }

  /**
   * Perform latency test for network quality
   */
  private async performLatencyTest(): Promise<'excellent' | 'good' | 'poor'> {
    try {
      const startTime = performance.now();
      
      // Test with a small request to avoid affecting user experience
      const response = await fetch('/api/ping', { 
        method: 'HEAD',
        cache: 'no-cache' 
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      if (!response.ok) {
        return 'poor';
      }
      
      if (latency < 100) {
        return 'excellent';
      } else if (latency < 300) {
        return 'good';
      } else {
        return 'poor';
      }
    } catch (error) {
      console.warn('Latency test failed:', error);
      return 'poor';
    }
  }

  /**
   * Get battery level for mobile devices
   */
  private async getBatteryLevel(): Promise<number | undefined> {
    try {
      // Modern Battery API
      const battery = await (navigator as any).getBattery?.();
      if (battery && typeof battery.level === 'number') {
        return battery.level;
      }
      
      // Fallback methods for older devices
      const batteryManager = (navigator as any).battery || (navigator as any).mozBattery || (navigator as any).webkitBattery;
      if (batteryManager && typeof batteryManager.level === 'number') {
        return batteryManager.level;
      }
      
      return undefined;
    } catch (error) {
      console.warn('Battery level detection failed:', error);
      return undefined;
    }
  }

  /**
   * Detect ambient noise level using audio API
   */
  private async detectAmbientNoise(): Promise<'quiet' | 'moderate' | 'noisy' | undefined> {
    try {
      // Request microphone access for noise detection
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      return new Promise<'quiet' | 'moderate' | 'noisy' | undefined>((resolve) => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        
        microphone.connect(analyser);
        analyser.fftSize = 256;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        let samples = 0;
        let totalVolume = 0;
        const maxSamples = 30; // Sample for 1 second at ~30fps
        
        const checkVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          
          const volume = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          totalVolume += volume;
          samples++;
          
          if (samples < maxSamples) {
            setTimeout(checkVolume, 33); // ~30fps sampling
          } else {
            // Clean up
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();
            
            const averageVolume = totalVolume / samples;
            
            // Classify noise level
            if (averageVolume < 20) {
              resolve('quiet');
            } else if (averageVolume < 60) {
              resolve('moderate');
            } else {
              resolve('noisy');
            }
          }
        };
        
        checkVolume();
      });
    } catch (error) {
      // Microphone access denied or not available
      console.warn('Ambient noise detection failed:', error);
      return undefined;
    }
  }

  /**
   * Detect lighting conditions using camera or screen brightness
   */
  private async detectLightingConditions(): Promise<'optimal' | 'dim' | 'bright' | undefined> {
    try {
      // Method 1: Screen brightness detection (if supported)
      if ('screen' in navigator && 'brightness' in (navigator.screen as any)) {
        const brightness = (navigator.screen as any).brightness;
        if (brightness < 0.3) return 'dim';
        if (brightness > 0.8) return 'bright';
        return 'optimal';
      }
      
      // Method 2: Camera-based ambient light detection
      return await this.detectLightingViaCamera();
    } catch (error) {
      console.warn('Lighting detection failed:', error);
      return undefined;
    }
  }

  /**
   * Detect lighting via camera sensor
   */
  private async detectLightingViaCamera(): Promise<'optimal' | 'dim' | 'bright' | undefined> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      
      return new Promise<'optimal' | 'dim' | 'bright' | undefined>((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.srcObject = stream;
        video.play();
        
        video.addEventListener('loadedmetadata', () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Capture a frame after a short delay
          setTimeout(() => {
            if (ctx) {
              ctx.drawImage(video, 0, 0);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              
              // Calculate average brightness
              let totalBrightness = 0;
              const pixels = imageData.data;
              
              for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                
                // Calculate luminance
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                totalBrightness += luminance;
              }
              
              const averageBrightness = totalBrightness / (pixels.length / 4);
              
              // Clean up
              stream.getTracks().forEach(track => track.stop());
              
              // Classify lighting
              if (averageBrightness < 50) {
                resolve('dim');
              } else if (averageBrightness > 200) {
                resolve('bright');
              } else {
                resolve('optimal');
              }
            }
          }, 500);
        });
      });
    } catch (error) {
      console.warn('Camera-based lighting detection failed:', error);
      return undefined;
    }
  }

  /**
   * Analyze contextual insights from historical data
   */
  analyzeContextualInsights(performanceHistory: any[]): ContextualInsights {
    // Group performance by environmental factors
    const contextGroups = this.groupPerformanceByContext(performanceHistory);
    
    // Find optimal conditions
    const optimalConditions = this.findOptimalConditions(contextGroups);
    
    // Score current conditions
    const currentContext = this.contextHistory[this.contextHistory.length - 1];
    const currentScore = this.scoreCurrentConditions(currentContext, optimalConditions);
    
    // Generate improvement suggestions
    const suggestions = this.generateImprovementSuggestions(currentContext, optimalConditions);
    
    return {
      optimalStudyConditions: optimalConditions,
      currentConditionScore: currentScore,
      improvementSuggestions: suggestions,
      historicalPerformance: Array.from(contextGroups.values())
    };
  }

  /**
   * Get environmental adaptation recommendations
   */
  getEnvironmentalAdaptations(context: EnvironmentalContext): EnvironmentalAdaptation {
    let difficultyAdjustment = 0;
    let breakFrequency = 25; // Default pomodoro technique
    
    const visualOpts = {
      contrastAdjustment: 0,
      fontSizeAdjustment: 0,
      colorScheme: 'auto' as const
    };
    
    const audioOpts = {
      enableSoundEffects: true,
      volumeAdjustment: 0.7
    };

    // Device-based adaptations
    switch (context.device) {
      case 'mobile':
        difficultyAdjustment -= 0.5; // Slightly easier on mobile
        breakFrequency = 20; // More frequent breaks
        visualOpts.fontSizeAdjustment = 0.2; // Larger text
        break;
        
      case 'tablet':
        breakFrequency = 30;
        visualOpts.fontSizeAdjustment = 0.1;
        break;
        
      case 'desktop':
        breakFrequency = 45; // Longer sessions on desktop
        break;
    }

    // Network quality adaptations
    switch (context.networkQuality) {
      case 'poor':
      case 'offline':
        difficultyAdjustment -= 1.0; // Significantly easier for poor connection
        audioOpts.enableSoundEffects = false; // Disable to reduce data usage
        break;
        
      case 'good':
        difficultyAdjustment -= 0.2;
        break;
    }

    // Battery level adaptations (mobile)
    if (context.batteryLevel !== undefined && context.batteryLevel < 0.3) {
      difficultyAdjustment -= 0.5; // Easier when battery is low
      breakFrequency = 15; // More frequent breaks to reduce usage
      visualOpts.colorScheme = 'dark'; // Dark mode saves battery
    }

    // Ambient noise adaptations
    switch (context.ambientNoise) {
      case 'noisy':
        difficultyAdjustment -= 0.3; // Harder to concentrate in noise
        audioOpts.enableSoundEffects = false; // Disable competing audio
        break;
        
      case 'quiet':
        audioOpts.volumeAdjustment = 0.5; // Lower volume in quiet environments
        break;
    }

    // Lighting adaptations
    switch (context.lighting) {
      case 'dim':
        visualOpts.contrastAdjustment = 0.3; // Higher contrast
        visualOpts.colorScheme = 'dark'; // Better for dim environments
        difficultyAdjustment -= 0.2; // Slightly easier in poor lighting
        break;
        
      case 'bright':
        visualOpts.contrastAdjustment = -0.2; // Lower contrast
        visualOpts.colorScheme = 'light'; // Better for bright environments
        break;
        
      case 'optimal':
        // No adjustments needed
        break;
    }

    return {
      difficultyAdjustment: Math.max(-3, Math.min(3, difficultyAdjustment)),
      recommendedBreakFrequency: breakFrequency,
      visualOptimizations: visualOpts,
      audioOptimizations: audioOpts
    };
  }

  /**
   * Track context changes and notify of significant changes
   */
  async trackContextChanges(): Promise<void> {
    const previousContext = this.contextHistory[this.contextHistory.length - 1];
    const currentContext = await this.getCurrentContext();
    
    if (previousContext && this.hasSignificantContextChange(previousContext, currentContext)) {
      // Emit context change event
      this.onContextChange?.(currentContext, previousContext);
    }
  }

  /**
   * Check for significant context changes
   */
  private hasSignificantContextChange(previous: DetectedContext, current: DetectedContext): boolean {
    // Device change (rare but significant)
    if (previous.device !== current.device) return true;
    
    // Network quality change
    if (previous.networkQuality !== current.networkQuality) return true;
    
    // Battery level change > 20%
    if (previous.batteryLevel && current.batteryLevel) {
      if (Math.abs(previous.batteryLevel - current.batteryLevel) > 0.2) return true;
    }
    
    // Ambient conditions change
    if (previous.ambientNoise !== current.ambientNoise) return true;
    if (previous.lighting !== current.lighting) return true;
    
    return false;
  }

  // Helper methods for contextual analysis

  private groupPerformanceByContext(performanceHistory: any[]): Map<string, PerformanceByContext> {
    const groups = new Map<string, PerformanceByContext>();
    
    // This would group performance data by environmental context
    // Implementation would depend on your performance data structure
    
    return groups;
  }

  private findOptimalConditions(contextGroups: Map<string, PerformanceByContext>): EnvironmentalContext {
    // Analyze performance groups to find optimal conditions
    // This is a simplified version - real implementation would be more sophisticated
    
    return {
      device: 'desktop', // Generally best performance
      networkQuality: 'excellent',
      batteryLevel: undefined, // Not applicable for optimal
      ambientNoise: 'quiet',
      lighting: 'optimal'
    };
  }

  private scoreCurrentConditions(current: DetectedContext | undefined, optimal: EnvironmentalContext): number {
    if (!current) return 0.5;
    
    let score = 1.0;
    
    // Score each factor
    if (current.device !== optimal.device) score -= 0.1;
    if (current.networkQuality !== optimal.networkQuality) {
      score -= current.networkQuality === 'poor' ? 0.3 : 0.1;
    }
    if (current.ambientNoise !== optimal.ambientNoise) score -= 0.15;
    if (current.lighting !== optimal.lighting) score -= 0.1;
    
    // Battery penalty for mobile
    if (current.device === 'mobile' && current.batteryLevel && current.batteryLevel < 0.3) {
      score -= 0.2;
    }
    
    return Math.max(0, score);
  }

  private generateImprovementSuggestions(current: DetectedContext | undefined, optimal: EnvironmentalContext): string[] {
    const suggestions: string[] = [];
    
    if (!current) return suggestions;
    
    if (current.networkQuality === 'poor') {
      suggestions.push('Consider switching to a better network connection for optimal performance');
    }
    
    if (current.ambientNoise === 'noisy') {
      suggestions.push('Find a quieter environment or use noise-canceling headphones');
    }
    
    if (current.lighting === 'dim') {
      suggestions.push('Improve lighting conditions for better visual clarity');
    } else if (current.lighting === 'bright') {
      suggestions.push('Reduce screen glare or move to a less bright environment');
    }
    
    if (current.device === 'mobile' && current.batteryLevel && current.batteryLevel < 0.3) {
      suggestions.push('Charge your device or switch to a desktop for longer study sessions');
    }
    
    return suggestions;
  }

  // Event handler for context changes (can be overridden)
  public onContextChange?: (current: DetectedContext, previous: DetectedContext) => void;
}
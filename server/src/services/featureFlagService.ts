export class FeatureFlagService {
  async isUAMSEnabled(userId: string): Promise<boolean> {
    // Gradual rollout: start with 5%, increase to 100%
    const rolloutPercentage = await this.getRolloutPercentage('uams_v3');
    const userHash = this.hashUserId(userId);
    return (userHash % 100) < rolloutPercentage;
  }

  private async getRolloutPercentage(flagName: string): Promise<number> {
    // In a real implementation, this would fetch the value from a feature flag service
    // or a database configuration.
    return 100; // Default to 100% for now
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
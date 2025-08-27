"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagService = void 0;
class FeatureFlagService {
    async isUAMSEnabled(userId) {
        const rolloutPercentage = await this.getRolloutPercentage('uams_v3');
        const userHash = this.hashUserId(userId);
        return (userHash % 100) < rolloutPercentage;
    }
    async getRolloutPercentage(flagName) {
        return 100;
    }
    hashUserId(userId) {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
}
exports.FeatureFlagService = FeatureFlagService;
//# sourceMappingURL=featureFlagService.js.map
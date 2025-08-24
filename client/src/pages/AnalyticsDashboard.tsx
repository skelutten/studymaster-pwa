import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

interface AnalyticsDashboardProps {
  userId: string;
  timeRange: '7d' | '30d' | '90d' | '1y';
}

interface DSRMetrics {
  date: string;
  averageDifficulty: number;
  averageStability: number;
  averageRetrievability: number;
  cardsReviewed: number;
}

interface SessionAnalytics {
  date: string;
  momentum: number;
  fatigue: number;
  flowTime: number;
  cognitiveLoad: number;
  satisfaction: number;
  cardsPerSession: number;
  accuracy: number;
}

interface LearningPattern {
  timeOfDay: string;
  performance: number;
  confidence: number;
  responseTime: number;
  sessions: number;
}

interface EnvironmentalInsights {
  condition: string;
  averagePerformance: number;
  sessionCount: number;
  preferenceScore: number;
}

interface PersonalizationData {
  optimalDifficulty: number;
  optimalSessionLength: number;
  bestPerformanceTimes: string[];
  cognitiveLoadProfile: {
    baseCapacity: number;
    fatigueRate: number;
    recoveryRate: number;
  };
  fsrsParameters: number[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ userId, timeRange }) => {
  const [dsrData, setDsrData] = useState<DSRMetrics[]>([]);
  const [sessionData, setSessionData] = useState<SessionAnalytics[]>([]);
  const [learningPatterns, setLearningPatterns] = useState<LearningPattern[]>([]);
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalInsights[]>([]);
  const [personalizationData, setPersonalizationData] = useState<PersonalizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'momentum' | 'difficulty' | 'cognitive'>('momentum');

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [userId, timeRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, these would be API calls
      // For now, we'll generate sample data
      setDsrData(generateSampleDSRData());
      setSessionData(generateSampleSessionData());
      setLearningPatterns(generateSampleLearningPatterns());
      setEnvironmentalData(generateSampleEnvironmentalData());
      setPersonalizationData(generateSamplePersonalizationData());
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Computed metrics
  const insights = useMemo(() => {
    if (!sessionData.length) return null;

    const avgMomentum = sessionData.reduce((sum, s) => sum + s.momentum, 0) / sessionData.length;
    const avgAccuracy = sessionData.reduce((sum, s) => sum + s.accuracy, 0) / sessionData.length;
    const totalCardsReviewed = sessionData.reduce((sum, s) => sum + s.cardsPerSession, 0);
    const avgFlowTime = sessionData.reduce((sum, s) => sum + s.flowTime, 0) / sessionData.length;
    
    return {
      avgMomentum,
      avgAccuracy,
      totalCardsReviewed,
      avgFlowTime,
      improvementTrend: sessionData.length > 1 ? 
        (sessionData[sessionData.length - 1].momentum - sessionData[0].momentum) > 0 ? 'improving' : 'declining' : 'stable'
    };
  }, [sessionData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading advanced analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">UAMS v3.0 Analytics</h1>
              <p className="mt-1 text-sm text-gray-600">Advanced Learning Intelligence Dashboard</p>
            </div>
            <div className="flex space-x-4">
              <select 
                value={timeRange} 
                onChange={(e) => {/* Handle time range change */}}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Insights Cards */}
        {insights && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <InsightCard
              title="Average Momentum"
              value={`${(insights.avgMomentum * 100).toFixed(1)}%`}
              trend={insights.improvementTrend}
              color="blue"
            />
            <InsightCard
              title="Accuracy Rate"
              value={`${(insights.avgAccuracy * 100).toFixed(1)}%`}
              trend="stable"
              color="green"
            />
            <InsightCard
              title="Cards Reviewed"
              value={insights.totalCardsReviewed.toString()}
              trend="stable"
              color="purple"
            />
            <InsightCard
              title="Avg Flow Time"
              value={`${insights.avgFlowTime.toFixed(0)}min`}
              trend="stable"
              color="orange"
            />
          </div>
        )}

        {/* DSR Metrics Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Memory Metrics (DSR)</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            <DSRTrendsChart data={dsrData} />
            <StabilityDistribution data={dsrData} />
            <RetrievabilityPrediction data={dsrData} />
          </div>
        </section>

        {/* Session Performance Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Session Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <MomentumTrendsChart data={sessionData} />
            <FlowStateAnalysis data={sessionData} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <CognitiveLoadPatterns data={sessionData} />
            <SessionQualityMatrix data={sessionData} />
          </div>
        </section>

        {/* Personal Learning Patterns */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Learning Patterns</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            <OptimalStudyTimes data={learningPatterns} />
            <EnvironmentalPreferences data={environmentalData} />
            <PersonalizedInsights data={personalizationData} />
          </div>
        </section>

        {/* Advanced Insights */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">AI-Powered Insights</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <LearningRecommendations insights={insights} patterns={learningPatterns} />
            <ParameterOptimizationStatus data={personalizationData} />
          </div>
        </section>
      </div>
    </div>
  );
};

// Sub-components

const InsightCard: React.FC<{
  title: string;
  value: string;
  trend: 'improving' | 'declining' | 'stable';
  color: 'blue' | 'green' | 'purple' | 'orange';
}> = ({ title, value, trend, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200'
  };

  const trendIcons = {
    improving: '📈',
    declining: '📉',
    stable: '➡️'
  };

  return (
    <div className={`${colorClasses[color]} p-6 rounded-lg border`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-lg">{trendIcons[trend]}</span>
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  );
};

const DSRTrendsChart: React.FC<{ data: DSRMetrics[] }> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">DSR Trends Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 10]} />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="averageDifficulty" 
            stroke="#8884d8" 
            name="Difficulty" 
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="averageStability" 
            stroke="#82ca9d" 
            name="Stability" 
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="averageRetrievability" 
            stroke="#ffc658" 
            name="Retrievability" 
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const StabilityDistribution: React.FC<{ data: DSRMetrics[] }> = ({ data }) => {
  // Process data to show stability distribution
  const distributionData = [
    { range: '0-1 days', count: 12, fill: '#ff6b6b' },
    { range: '1-7 days', count: 28, fill: '#4ecdc4' },
    { range: '7-30 days', count: 45, fill: '#45b7d1' },
    { range: '30+ days', count: 23, fill: '#96ceb4' }
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Memory Stability Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={distributionData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="count"
            label={({ range, percent }) => `${range}: ${(percent * 100).toFixed(0)}%`}
          >
            {distributionData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const RetrievabilityPrediction: React.FC<{ data: DSRMetrics[] }> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Retrievability Forecast</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 1]} />
          <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
          <Area 
            type="monotone" 
            dataKey="averageRetrievability" 
            stroke="#8884d8" 
            fill="#8884d8" 
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const MomentumTrendsChart: React.FC<{ data: SessionAnalytics[] }> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Momentum & Flow Trends</h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 1]} />
          <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="momentum" 
            stroke="#8884d8" 
            name="Session Momentum" 
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="satisfaction" 
            stroke="#82ca9d" 
            name="Satisfaction" 
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const FlowStateAnalysis: React.FC<{ data: SessionAnalytics[] }> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Flow State Analysis</h3>
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="cognitiveLoad" name="Cognitive Load" />
          <YAxis dataKey="momentum" name="Momentum" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter 
            dataKey="flowTime" 
            fill="#8884d8"
            name="Flow Time (size indicates duration)"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

const CognitiveLoadPatterns: React.FC<{ data: SessionAnalytics[] }> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Cognitive Load vs Fatigue</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 1]} />
          <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
          <Bar dataKey="cognitiveLoad" fill="#8884d8" name="Cognitive Load" />
          <Bar dataKey="fatigue" fill="#82ca9d" name="Fatigue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const SessionQualityMatrix: React.FC<{ data: SessionAnalytics[] }> = ({ data }) => {
  const radarData = [
    { subject: 'Momentum', value: 0.8, fullMark: 1 },
    { subject: 'Flow Time', value: 0.7, fullMark: 1 },
    { subject: 'Accuracy', value: 0.9, fullMark: 1 },
    { subject: 'Satisfaction', value: 0.85, fullMark: 1 },
    { subject: 'Efficiency', value: 0.75, fullMark: 1 }
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Session Quality Matrix</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis domain={[0, 1]} />
          <Radar
            name="Performance"
            dataKey="value"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

const OptimalStudyTimes: React.FC<{ data: LearningPattern[] }> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Optimal Study Times</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timeOfDay" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="performance" fill="#8884d8" name="Performance Score" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const EnvironmentalPreferences: React.FC<{ data: EnvironmentalInsights[] }> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Environmental Performance</h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm font-medium">{item.condition}</span>
            <div className="flex items-center space-x-2">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${item.averagePerformance * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">
                {(item.averagePerformance * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PersonalizedInsights: React.FC<{ data: PersonalizationData | null }> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">AI Personalization Profile</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Optimal Difficulty</span>
          <span className="font-medium">{data.optimalDifficulty.toFixed(1)}/10</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Optimal Session Length</span>
          <span className="font-medium">{data.optimalSessionLength}min</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Cognitive Capacity</span>
          <span className="font-medium">{(data.cognitiveLoadProfile.baseCapacity * 100).toFixed(0)}%</span>
        </div>
        <div className="mt-4">
          <span className="text-sm text-gray-600 block mb-2">Best Study Times</span>
          <div className="flex flex-wrap gap-1">
            {data.bestPerformanceTimes.map((time, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                {time}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LearningRecommendations: React.FC<{ 
  insights: any; 
  patterns: LearningPattern[] 
}> = ({ insights, patterns }) => {
  const recommendations = [
    "Your momentum peaks around 2-4 PM. Schedule challenging reviews during this window.",
    "Consider shorter sessions (20-25 min) to maintain optimal cognitive load.",
    "Desktop sessions show 15% better performance than mobile - use for difficult cards.",
    "Quiet environments improve your accuracy by 12%. Find a distraction-free space.",
    "Your FSRS parameters are 85% optimized. Continue current study pattern for best results."
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">AI Recommendations</h3>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div key={index} className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
              {index + 1}
            </span>
            <p className="text-sm text-gray-700">{rec}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ParameterOptimizationStatus: React.FC<{ data: PersonalizationData | null }> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">FSRS Parameter Optimization</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Optimization Progress</span>
          <span className="font-medium text-green-600">87% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full" style={{ width: '87%' }}></div>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <div>• Parameters updated based on 1,247 reviews</div>
          <div>• Accuracy improved by 12% since last optimization</div>
          <div>• Next optimization: 150 more reviews needed</div>
        </div>
      </div>
    </div>
  );
};

// Sample data generators (replace with actual API calls)
const generateSampleDSRData = (): DSRMetrics[] => {
  return Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
    averageDifficulty: 4.5 + Math.sin(i / 5) * 1.5,
    averageStability: 8 + Math.cos(i / 7) * 3,
    averageRetrievability: 0.7 + Math.sin(i / 3) * 0.2,
    cardsReviewed: 15 + Math.floor(Math.random() * 20)
  }));
};

const generateSampleSessionData = (): SessionAnalytics[] => {
  return Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
    momentum: 0.6 + Math.sin(i / 4) * 0.3,
    fatigue: 0.3 + Math.random() * 0.4,
    flowTime: 15 + Math.random() * 20,
    cognitiveLoad: 0.5 + Math.random() * 0.3,
    satisfaction: 0.7 + Math.sin(i / 6) * 0.2,
    cardsPerSession: 20 + Math.floor(Math.random() * 15),
    accuracy: 0.75 + Math.random() * 0.2
  }));
};

const generateSampleLearningPatterns = (): LearningPattern[] => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return hours.map(hour => ({
    timeOfDay: `${hour}:00`,
    performance: 0.3 + (Math.sin((hour - 6) * Math.PI / 12) + 1) * 0.35,
    confidence: 0.5 + Math.random() * 0.3,
    responseTime: 3000 + Math.random() * 4000,
    sessions: Math.floor(Math.random() * 10)
  }));
};

const generateSampleEnvironmentalData = (): EnvironmentalInsights[] => {
  return [
    { condition: 'Desktop + Quiet', averagePerformance: 0.89, sessionCount: 45, preferenceScore: 0.9 },
    { condition: 'Desktop + Moderate Noise', averagePerformance: 0.82, sessionCount: 32, preferenceScore: 0.7 },
    { condition: 'Mobile + Quiet', averagePerformance: 0.76, sessionCount: 28, preferenceScore: 0.6 },
    { condition: 'Mobile + Noisy', averagePerformance: 0.68, sessionCount: 15, preferenceScore: 0.4 },
    { condition: 'Tablet + Optimal Light', averagePerformance: 0.84, sessionCount: 20, preferenceScore: 0.8 }
  ];
};

const generateSamplePersonalizationData = (): PersonalizationData => {
  return {
    optimalDifficulty: 6.2,
    optimalSessionLength: 25,
    bestPerformanceTimes: ['9:00-11:00', '14:00-16:00'],
    cognitiveLoadProfile: {
      baseCapacity: 0.85,
      fatigueRate: 0.02,
      recoveryRate: 0.05
    },
    fsrsParameters: Array.from({ length: 21 }, () => Math.random() * 5)
  };
};

export default AnalyticsDashboard;
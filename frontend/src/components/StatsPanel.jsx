import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getStats, getAchievements } from '../utils/api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import PropTypes from 'prop-types';

/**
 * StatsPanel - Display user statistics with charts and metrics
 * Shows task completion trends, XP earned, streaks, and productivity insights
 */
export default function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [achievementsLoading, setAchievementsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('week');

  // Fetch statistics
  const fetchStats = async (selectedPeriod) => {
    try {
      setLoading(true);
      const data = await getStats(selectedPeriod);
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError('Failed to load statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch achievements
  const fetchAchievements = async () => {
    try {
      setAchievementsLoading(true);
      const data = await getAchievements();
      setAchievements(data.achievements || []);
    } catch (err) {
      console.error('Failed to load achievements:', err);
    } finally {
      setAchievementsLoading(false);
    }
  };

  // Load stats on mount and when period changes
  useEffect(() => {
    fetchStats(period);
  }, [period]);

  // Load achievements on mount
  useEffect(() => {
    fetchAchievements();
  }, []);

  // Handle period change
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  // Format daily data for bar chart
  const getDailyChartData = () => {
    if (!stats?.daily_breakdown) return [];
    
    return stats.daily_breakdown.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tasks: item.tasks,
    }));
  };

  // Format task type data for pie chart
  const getTaskTypeData = () => {
    if (!stats) return [];
    
    return [
      { name: 'Quick Wins', value: stats.quick_wins || 0, color: '#10b981' },
      { name: 'Deep Work', value: stats.deep_work || 0, color: '#8b5cf6' },
    ];
  };

  // Get most productive day
  const getMostProductiveDay = () => {
    if (!stats?.daily_breakdown || stats.daily_breakdown.length === 0) return 'N/A';
    
    const maxEntry = stats.daily_breakdown.reduce((max, item) =>
      item.tasks > max.tasks ? item : max
    );
    
    return new Date(maxEntry.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !stats) {
    return (
      <div className="stats-panel loading">
        <div className="loading-spinner"></div>
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="stats-panel error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button onClick={() => fetchStats(period)} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const taskTypeData = getTaskTypeData();
  const dailyChartData = getDailyChartData();
  const totalTasks = (stats.quick_wins || 0) + (stats.deep_work || 0);

  return (
    <div className="stats-panel">
      {/* Header with period selector */}
      <div className="stats-header">
        <h2>📊 Your Statistics</h2>
        <div className="period-selector">
          <button
            className={`period-button ${period === 'week' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('week')}
          >
            Week
          </button>
          <button
            className={`period-button ${period === 'month' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('month')}
          >
            Month
          </button>
          <button
            className={`period-button ${period === 'all' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('all')}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Key metrics cards */}
      <div className="metrics-grid">
        <motion.div
          className="metric-card"
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <div className="metric-value">{totalTasks}</div>
            <div className="metric-label">Tasks Completed</div>
          </div>
        </motion.div>

        <motion.div
          className="metric-card"
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="metric-icon">⚡</div>
          <div className="metric-content">
            <div className="metric-value">{stats.quick_wins || 0}</div>
            <div className="metric-label">Quick Wins</div>
          </div>
        </motion.div>

        <motion.div
          className="metric-card"
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="metric-icon">🧠</div>
          <div className="metric-content">
            <div className="metric-value">{stats.deep_work || 0}</div>
            <div className="metric-label">Deep Work</div>
          </div>
        </motion.div>

        <motion.div
          className="metric-card"
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="metric-icon">⭐</div>
          <div className="metric-content">
            <div className="metric-value">{stats.total_xp || 0}</div>
            <div className="metric-label">Total XP Earned</div>
          </div>
        </motion.div>

        <motion.div
          className="metric-card"
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="metric-icon">🔥</div>
          <div className="metric-content">
            <div className="metric-value">{stats.current_streak || 0}</div>
            <div className="metric-label">Current Streak</div>
          </div>
        </motion.div>

        <motion.div
          className="metric-card"
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="metric-icon">🏆</div>
          <div className="metric-content">
            <div className="metric-value">{stats.longest_streak || 0}</div>
            <div className="metric-label">Longest Streak</div>
          </div>
        </motion.div>
      </div>

      {/* Achievements section */}
      <div className="achievements-section">
        <h3 className="section-title">🏆 Achievements</h3>
        {achievementsLoading ? (
          <div className="achievements-loading">
            <div className="loading-spinner"></div>
            <p>Loading achievements...</p>
          </div>
        ) : achievements.length > 0 ? (
          <div className="achievements-grid">
            {achievements.map((achievement) => (
              <motion.div
                key={achievement.key}
                className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                whileHover={{ scale: achievement.unlocked ? 1.05 : 1.02, y: -4 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="achievement-icon">{achievement.icon}</div>
                <div className="achievement-content">
                  <h4 className="achievement-name">{achievement.name}</h4>
                  <p className="achievement-description">{achievement.description}</p>
                  {achievement.progress && (
                    <div className="achievement-progress">
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${Math.min(100, (achievement.progress.current / achievement.progress.required) * 100)}%`
                          }}
                        />
                      </div>
                      <span className="progress-text">
                        {achievement.progress.current} / {achievement.progress.required}
                      </span>
                    </div>
                  )}
                  {achievement.unlocked && achievement.unlocked_at && (
                    <div className="achievement-unlocked-date">
                      Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="achievements-empty">
            <p>No achievements data available</p>
          </div>
        )}
      </div>

      {/* Charts section */}
      {totalTasks > 0 ? (
        <div className="charts-section">
          {/* Daily completions bar chart */}
          {dailyChartData.length > 0 && (
            <div className="chart-container">
              <h3 className="chart-title">📈 Daily Task Completions</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f3f4f6'
                    }}
                  />
                  <Bar 
                    dataKey="tasks" 
                    fill="#3b82f6" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Task type distribution pie chart */}
          <div className="chart-container">
            <h3 className="chart-title">🎯 Task Type Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taskTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6'
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: '#f3f4f6' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Most productive day */}
          <div className="insight-card">
            <div className="insight-icon">🌟</div>
            <div className="insight-content">
              <h3>Most Productive Day</h3>
              <p className="insight-value">{getMostProductiveDay()}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="stats-empty">
          <div className="empty-icon">📊</div>
          <h3>No data yet</h3>
          <p>Complete some tasks to see your statistics!</p>
        </div>
      )}
    </div>
  );
}

StatsPanel.propTypes = {};

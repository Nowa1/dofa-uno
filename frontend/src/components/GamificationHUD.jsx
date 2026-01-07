import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getProfile } from '../utils/api';
import PropTypes from 'prop-types';

/**
 * GamificationHUD - Always-visible header bar showing XP, level, and streak
 * Displays user progress and gamification stats in a compact, non-intrusive way
 */
export default function GamificationHUD({ refreshTrigger }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch profile data
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Load profile on mount and when refreshTrigger changes
  useEffect(() => {
    fetchProfile();
  }, [refreshTrigger]);

  if (loading && !profile) {
    return (
      <div className="gamification-hud loading">
        <div className="hud-content">
          <div className="loading-shimmer">Loading...</div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="gamification-hud error">
        <div className="hud-content">
          <span className="error-text">⚠️ {error}</span>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  // Calculate XP progress percentage
  const xpProgress = profile.xp_progress?.next_level_xp > 0
    ? (profile.xp_progress.xp_in_current_level / profile.xp_progress.next_level_xp) * 100
    : 100;

  return (
    <motion.div
      className="gamification-hud"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="hud-content">
        {/* Level Badge */}
        <motion.div
          className="level-badge"
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="level-icon">⭐</div>
          <div className="level-info">
            <div className="level-label">Level</div>
            <div className="level-number">{profile.current_level}</div>
          </div>
        </motion.div>

        {/* XP Progress Bar */}
        <div className="xp-container">
          <div className="xp-header">
            <span className="xp-label">
              {profile.xp_progress.xp_in_current_level} / {profile.xp_progress.next_level_xp} XP
            </span>
            <span className="xp-total">Total: {profile.total_xp} XP</span>
          </div>
          <div className="xp-bar-container">
            <motion.div
              className="xp-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Streak Counter */}
        <motion.div
          className="streak-badge"
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="streak-icon">🔥</div>
          <div className="streak-info">
            <div className="streak-label">Streak</div>
            <div className="streak-number">{profile.current_streak} days</div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

GamificationHUD.propTypes = {
  refreshTrigger: PropTypes.number,
};

GamificationHUD.defaultProps = {
  refreshTrigger: 0,
};

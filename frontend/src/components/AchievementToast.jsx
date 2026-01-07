import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * AchievementToast - Animated toast notification for unlocked achievements
 * Shows achievement icon, title, and description with auto-dismiss
 */
export default function AchievementToast({ achievement, onDismiss }) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (achievement) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  // Play celebration sound when achievement appears
  useEffect(() => {
    if (achievement) {
      // Sound will be played by parent component
      console.log('Achievement unlocked:', achievement.title);
    }
  }, [achievement]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          className="achievement-toast"
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          onClick={onDismiss}
        >
          <div className="achievement-toast-content">
            {/* Trophy icon */}
            <div className="achievement-toast-icon">
              🏆
            </div>

            {/* Achievement details */}
            <div className="achievement-toast-details">
              <div className="achievement-toast-header">
                <span className="achievement-toast-badge">Achievement Unlocked!</span>
              </div>
              <h3 className="achievement-toast-title">{achievement.title}</h3>
              <p className="achievement-toast-description">{achievement.description}</p>
            </div>

            {/* Close button */}
            <button
              className="achievement-toast-close"
              onClick={onDismiss}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Progress bar for auto-dismiss */}
          <motion.div
            className="achievement-toast-progress"
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 5, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

AchievementToast.propTypes = {
  achievement: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.string,
  }),
  onDismiss: PropTypes.func.isRequired,
};

AchievementToast.defaultProps = {
  achievement: null,
};

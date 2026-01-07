import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * LevelUpModal - Full-screen celebration modal for level ups
 * Shows new level with animations and confetti effect
 */
export default function LevelUpModal({ isOpen, level, xpToNext, onClose }) {
  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  // Handle click to close
  const handleClick = () => {
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="level-up-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClick}
        >
          <motion.div
            className="level-up-modal-content"
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow effect */}
            <motion.div
              className="level-up-glow"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Level up text */}
            <motion.div
              className="level-up-header"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="level-up-title">Level Up!</h1>
            </motion.div>

            {/* Level number with animation */}
            <motion.div
              className="level-up-badge"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: 0.3,
                type: 'spring',
                stiffness: 200,
                damping: 15
              }}
            >
              <div className="level-up-star">⭐</div>
              <div className="level-up-number">{level}</div>
            </motion.div>

            {/* Congratulations message */}
            <motion.div
              className="level-up-message"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="level-up-congrats">Congratulations!</p>
              <p className="level-up-subtitle">
                You've reached Level {level}
              </p>
              {xpToNext && (
                <p className="level-up-next">
                  {xpToNext} XP until next level
                </p>
              )}
            </motion.div>

            {/* Floating particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="level-up-particle"
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 1,
                  scale: 0
                }}
                animate={{
                  x: Math.cos((i / 12) * Math.PI * 2) * 200,
                  y: Math.sin((i / 12) * Math.PI * 2) * 200,
                  opacity: 0,
                  scale: 1,
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.4 + (i * 0.05),
                  ease: 'easeOut',
                }}
                style={{
                  left: '50%',
                  top: '50%',
                }}
              >
                ✨
              </motion.div>
            ))}

            {/* Click to close hint */}
            <motion.div
              className="level-up-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              Click anywhere to continue
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

LevelUpModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  level: PropTypes.number,
  xpToNext: PropTypes.number,
  onClose: PropTypes.func.isRequired,
};

LevelUpModal.defaultProps = {
  level: 1,
  xpToNext: null,
};

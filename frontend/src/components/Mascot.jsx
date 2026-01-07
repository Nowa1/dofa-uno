import { motion, AnimatePresence } from 'framer-motion';

const Mascot = ({ state = 'idle', hasDebuff = false }) => {
  const mascotVariants = {
    idle: { 
      scale: [1, 1.05, 1],
      transition: { 
        repeat: Infinity, 
        duration: 2,
        ease: 'easeInOut'
      }
    },
    focus: { 
      rotate: 5,
      scale: 1,
      transition: { duration: 0.3 }
    },
    panic: { 
      x: [-2, 2, -2, 2, 0],
      transition: { 
        repeat: 3, 
        duration: 0.1 
      }
    },
    triumph: { 
      y: [-20, 0],
      scale: [1, 1.2, 1],
      transition: { 
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  };

  const getEmoji = () => {
    switch(state) {
      case 'focus': return '💪';
      case 'panic': return '😰';
      case 'triumph': return '🎉';
      default: return '😌';
    }
  };

  const getMessage = () => {
    switch(state) {
      case 'focus': return "You've got this!";
      case 'panic': return "Take a breath. We'll figure it out.";
      case 'triumph': return "Amazing work! 🎉";
      default: return "Ready when you are!";
    }
  };

  return (
    <motion.div
      className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 flex flex-col items-center gap-2 sm:gap-3"
      variants={mascotVariants}
      animate={state}
    >
      {/* Debuff Fog Effect */}
      <AnimatePresence>
        {hasDebuff && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              filter: 'blur(8px)',
              background: 'radial-gradient(circle, rgba(100, 100, 100, 0.4) 0%, transparent 70%)',
            }}
          >
            {/* Animated fog particles */}
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 bg-gradient-to-b from-gray-500/30 via-gray-600/20 to-transparent"
              style={{ filter: 'blur(12px)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speech Bubble */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-bg-secondary border-2 border-accent-cyan/50 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 shadow-neon relative max-w-[200px] sm:max-w-none"
      >
        <p className="text-xs sm:text-sm text-text-primary whitespace-nowrap">{getMessage()}</p>
        <div className="absolute -bottom-2 right-6 sm:right-8 w-0 h-0 border-l-6 border-r-6 border-t-6 sm:border-l-8 sm:border-r-8 sm:border-t-8 border-l-transparent border-r-transparent border-t-accent-cyan/50"></div>
      </motion.div>

      {/* Mascot Character */}
      <motion.div
        className={`relative w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 rounded-full flex items-center justify-center border-2 sm:border-4 border-accent-cyan/50 shadow-neon transition-all duration-500 ${
          hasDebuff ? 'saturate-50 brightness-75' : ''
        }`}
        whileHover={{ scale: 1.1 }}
        style={{
          filter: hasDebuff ? 'blur(1px) contrast(0.8)' : 'none',
        }}
      >
        {/* Placeholder SVG/Emoji */}
        <div className="text-3xl sm:text-5xl">
          {getEmoji()}
        </div>

        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-accent-cyan/10 animate-pulse-slow"></div>
      </motion.div>

      {/* Status indicator */}
      <div className="flex gap-0.5 sm:gap-1">
        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${state === 'idle' ? 'bg-accent-blue' : 'bg-gray-600'} animate-pulse`}></div>
        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${state === 'focus' ? 'bg-accent-green' : 'bg-gray-600'} animate-pulse`}></div>
        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${state === 'panic' ? 'bg-accent-red' : 'bg-gray-600'} animate-pulse`}></div>
        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${state === 'triumph' ? 'bg-accent-gold' : 'bg-gray-600'} animate-pulse`}></div>
      </div>
    </motion.div>
  );
};

export default Mascot;

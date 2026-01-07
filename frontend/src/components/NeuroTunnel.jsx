import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const NeuroTunnel = ({ task, onClose, onDone, onStuck }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showStuckModal, setShowStuckModal] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    // Start timer
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStuckClick = async () => {
    setShowStuckModal(true);
    setIsLoadingAI(true);
    setAiError(null);
    setAiMessage('');

    try {
      const response = await fetch('http://localhost:8000/api/chat_intervention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_title: task.title,
          task_description: task.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get help');
      }

      const data = await response.json();
      setAiMessage(data.message);
    } catch (err) {
      console.error('Error getting AI intervention:', err);
      setAiError(err.message || 'Failed to connect to the server.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleDone = () => {
    // Trigger confetti
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    // Call the onDone callback after a short delay
    setTimeout(() => {
      onDone();
    }, 3000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-black flex flex-col items-center justify-center"
      >
        {/* Task Title */}
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-center mb-8 sm:mb-12 px-4 sm:px-8 bg-gradient-to-r from-neon-blue via-accent-purple to-neon-pink bg-clip-text text-transparent max-w-5xl"
        >
          {task.title}
        </motion.h1>

        {/* Timer */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-mono font-bold text-neon-blue mb-12 sm:mb-16 tabular-nums"
        >
          {formatTime(timeElapsed)}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 sm:gap-6 px-4"
        >
          {/* Done Button */}
          <motion.button
            onClick={handleDone}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 sm:px-12 py-4 sm:py-6 bg-gradient-to-r from-accent-green to-neon-green text-white text-lg sm:text-2xl font-bold rounded-xl sm:rounded-2xl shadow-neon hover:shadow-neon-green transition-all duration-300"
          >
            ✓ Done
          </motion.button>

          {/* I'm Stuck Button */}
          <motion.button
            onClick={handleStuckClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 sm:px-12 py-4 sm:py-6 bg-gradient-to-r from-accent-red to-neon-pink text-white text-lg sm:text-2xl font-bold rounded-xl sm:rounded-2xl shadow-neon hover:shadow-neon-pink transition-all duration-300"
          >
            😰 I'm Stuck
          </motion.button>
        </motion.div>

        {/* Exit hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-4 sm:bottom-8 text-text-muted text-xs sm:text-sm px-4 text-center"
        >
          Press ESC to exit
        </motion.p>

        {/* AI Intervention Modal */}
        <AnimatePresence>
          {showStuckModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10 p-8"
              onClick={() => setShowStuckModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-bg-secondary border-2 sm:border-4 border-accent-cyan/50 rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-2xl w-full shadow-2xl relative mx-4"
              >
                {/* Mascot Icon */}
                <div className="flex items-start gap-3 sm:gap-6 mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 rounded-full flex items-center justify-center border-2 sm:border-4 border-accent-cyan/50 shadow-neon flex-shrink-0">
                    <div className="text-2xl sm:text-4xl">💪</div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-2xl font-bold text-text-primary mb-2">
                      Hey, I'm here to help!
                    </h3>
                    
                    {/* Loading State */}
                    {isLoadingAI && (
                      <div className="flex items-center gap-3 text-text-secondary">
                        <div className="w-6 h-6 border-3 border-accent-cyan border-t-transparent rounded-full animate-spin"></div>
                        <p>Thinking of a tiny first step...</p>
                      </div>
                    )}
                    
                    {/* Error State */}
                    {aiError && (
                      <div className="bg-red-500/10 border-2 border-red-500/50 rounded-xl p-4 text-red-400">
                        <p className="font-semibold">Oops!</p>
                        <p className="text-sm">{aiError}</p>
                      </div>
                    )}
                    
                    {/* AI Message */}
                    {aiMessage && !isLoadingAI && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-accent-cyan/10 border-2 border-accent-cyan/30 rounded-xl p-3 sm:p-4"
                      >
                        <p className="text-text-primary text-sm sm:text-lg leading-relaxed">
                          {aiMessage}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Close Button */}
                <motion.button
                  onClick={() => setShowStuckModal(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-accent-cyan to-accent-blue text-white text-base sm:text-lg font-bold rounded-lg sm:rounded-xl shadow-neon hover:shadow-neon-blue transition-all duration-300"
                >
                  Got it! Let's try that
                </motion.button>

                {/* Decorative corner accents */}
                <div className="absolute -top-1 -left-1 sm:-top-2 sm:-left-2 w-4 h-4 sm:w-6 sm:h-6 border-t-2 border-l-2 sm:border-t-4 sm:border-l-4 border-neon-blue"></div>
                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 border-t-2 border-r-2 sm:border-t-4 sm:border-r-4 border-neon-pink"></div>
                <div className="absolute -bottom-1 -left-1 sm:-bottom-2 sm:-left-2 w-4 h-4 sm:w-6 sm:h-6 border-b-2 border-l-2 sm:border-b-4 sm:border-l-4 border-neon-green"></div>
                <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 border-b-2 border-r-2 sm:border-b-4 sm:border-r-4 border-accent-purple"></div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default NeuroTunnel;

import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Mascot from './components/Mascot';
import NeuroTunnel from './components/NeuroTunnel';
import GamificationHUD from './components/GamificationHUD';
import AchievementToast from './components/AchievementToast';
import LevelUpModal from './components/LevelUpModal';
import confetti from 'canvas-confetti';

function App() {
  const [mascotState, setMascotState] = useState('idle');
  const [activeTask, setActiveTask] = useState(null);
  const [incompleteTaskCount, setIncompleteTaskCount] = useState(0);
  
  // Gamification state
  const [profileRefreshTrigger, setProfileRefreshTrigger] = useState(0);
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [levelUpData, setLevelUpData] = useState(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

  // Handle ESC key to exit NeuroTunnel
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && activeTask) {
        setActiveTask(null);
        setMascotState('idle');
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activeTask]);

  // Process achievement queue (show one at a time)
  useEffect(() => {
    if (achievementQueue.length > 0 && !currentAchievement) {
      const [nextAchievement, ...rest] = achievementQueue;
      setCurrentAchievement(nextAchievement);
      setAchievementQueue(rest);
    }
  }, [achievementQueue, currentAchievement]);

  const handleStartTask = (task) => {
    setActiveTask(task);
    setMascotState('focus');
  };

  const handleTaskDone = () => {
    setMascotState('triumph');
    setTimeout(() => {
      setActiveTask(null);
      setMascotState('idle');
    }, 3000);
  };

  const handleStuck = () => {
    setMascotState('panic');
    setTimeout(() => {
      setActiveTask(null);
      setMascotState('idle');
    }, 3000);
  };

  // Handle task completion with gamification
  const handleTaskComplete = (completionData) => {
    // Refresh profile to update HUD
    setProfileRefreshTrigger(prev => prev + 1);

    // Handle level up
    if (completionData.levelUp) {
      setLevelUpData({
        level: completionData.newLevel,
        xpToNext: completionData.xpToNext,
      });
      setShowLevelUpModal(true);
      
      // Trigger confetti for level up
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#ff00ff', '#00ff00', '#ffff00'],
      });
      
      // Play triumph sound (mascot will handle this)
      setMascotState('triumph');
      setTimeout(() => setMascotState('idle'), 3000);
    }

    // Queue achievements
    if (completionData.achievements && completionData.achievements.length > 0) {
      setAchievementQueue(prev => [...prev, ...completionData.achievements]);
      
      // Play celebration sound for achievements
      // Sound will be handled by AchievementToast component
    }
  };

  // Dismiss current achievement toast
  const handleDismissAchievement = () => {
    setCurrentAchievement(null);
  };

  // Close level up modal
  const handleCloseLevelUpModal = () => {
    setShowLevelUpModal(false);
    setLevelUpData(null);
  };

  return (
    <div className="App">
      {/* Gamification HUD - Always visible at top */}
      <GamificationHUD refreshTrigger={profileRefreshTrigger} />
      
      {/* Main Dashboard */}
      <Dashboard
        onStartTask={handleStartTask}
        onTaskCountChange={setIncompleteTaskCount}
        onTaskComplete={handleTaskComplete}
      />
      
      {/* Mascot */}
      <Mascot
        state={mascotState}
        hasDebuff={incompleteTaskCount > 5}
      />
      
      {/* NeuroTunnel Focus Mode */}
      {activeTask && (
        <NeuroTunnel
          task={activeTask}
          onClose={() => {
            setActiveTask(null);
            setMascotState('idle');
          }}
          onDone={handleTaskDone}
          onStuck={handleStuck}
        />
      )}
      
      {/* Achievement Toast Notification */}
      <AchievementToast
        achievement={currentAchievement}
        onDismiss={handleDismissAchievement}
      />
      
      {/* Level Up Modal */}
      <LevelUpModal
        isOpen={showLevelUpModal}
        level={levelUpData?.level}
        xpToNext={levelUpData?.xpToNext}
        onClose={handleCloseLevelUpModal}
      />
    </div>
  );
}

export default App;

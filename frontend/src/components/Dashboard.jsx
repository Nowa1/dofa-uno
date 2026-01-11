import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Brain, Sparkles, CheckCircle2, Circle, AlertCircle, Play, LogOut } from 'lucide-react';
import { initSounds, playCompletionSound } from '../utils/sounds';
import { parseDump, getTasks, completeTask, logout } from '../utils/api';
import useAuthStore from '../stores/authStore';
import BacklogView from './BacklogView';
import StatsPanel from './StatsPanel';
import PropTypes from 'prop-types';

const Dashboard = ({ onStartTask, onTaskCountChange, onTaskComplete }) => {
  const navigate = useNavigate();
  const { clearUser, user } = useAuthStore();
  const [brainDumpText, setBrainDumpText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);
  const [showTasks, setShowTasks] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'backlog', 'stats'
  const [totalXP, setTotalXP] = useState(0);
  const [completingTaskId, setCompletingTaskId] = useState(null);

  // Initialize sounds on mount
  useEffect(() => {
    initSounds();
  }, []);

  // Load tasks from backend on mount
  useEffect(() => {
    loadTasks();
  }, []);

  // Load tasks from localStorage as backup
  useEffect(() => {
    const savedTasks = localStorage.getItem('nemesis_tasks');
    if (savedTasks && tasks.length === 0) {
      try {
        const parsed = JSON.parse(savedTasks);
        setTasks(parsed);
        if (parsed.length > 0) {
          setShowTasks(true);
        }
      } catch (err) {
        console.error('Failed to load tasks from localStorage:', err);
      }
    }
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('nemesis_tasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  // Notify parent of task count changes for debuff effect
  useEffect(() => {
    if (onTaskCountChange) {
      const incompleteTasks = tasks.filter(task => task.status !== 'done').length;
      onTaskCountChange(incompleteTasks);
    }
  }, [tasks, onTaskCountChange]);

  // Load tasks from backend
  const loadTasks = async () => {
    try {
      const response = await getTasks('todo');
      if (response && response.tasks && response.tasks.length > 0) {
        setTasks(response.tasks);
        setShowTasks(true);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
      // Silently fail - will use localStorage backup
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!brainDumpText.trim()) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const data = await parseDump(brainDumpText);
      
      // Merge new tasks with existing tasks (don't overwrite)
      const newTasks = data.tasks || [];
      setTasks(prevTasks => {
        // Keep existing tasks and add new ones
        const existingIds = new Set(prevTasks.map(t => t.id));
        const tasksToAdd = newTasks.filter(t => !existingIds.has(t.id));
        return [...prevTasks, ...tasksToAdd];
      });
      
      setShowTasks(true);
      setBrainDumpText('');
    } catch (err) {
      console.error('Error parsing tasks:', err);
      setError(err.message || 'Failed to connect to the server. Make sure the backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTaskStatus = async (taskId) => {
    if (completingTaskId) return; // Prevent multiple clicks during animation
    
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === 'done') return;

    try {
      // Set completing state for animation
      setCompletingTaskId(taskId);
      
      // Call backend to complete task
      const response = await completeTask(taskId);
      
      // Play completion sound
      playCompletionSound();
      
      // Calculate total XP from response
      if (response.xp_earned) {
        setTotalXP(prev => prev + response.xp_earned);
      }
      
      // Notify parent component with completion data
      if (onTaskComplete) {
        onTaskComplete({
          levelUp: response.level_up || false,
          newLevel: response.new_level,
          xpToNext: response.xp_to_next_level,
          achievements: response.unlocked_achievements || [],
          streakInfo: response.streak_info,
          xpEarned: response.xp_earned,
        });
      }
      
      // Wait for animation to complete (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove task from local state (it's now in backlog only)
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
      
      // Clear completing state
      setCompletingTaskId(null);
      
    } catch (err) {
      console.error('Failed to complete task:', err);
      setError('Failed to mark task as complete. Please try again.');
      setCompletingTaskId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      clearUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear user and redirect even if API call fails
      clearUser();
      navigate('/login');
    }
  };

  const quickWins = tasks.filter(task => task.type === 'quick_win' || task.tag === 'quick_win');
  const deepWork = tasks.filter(task => task.type === 'deep_work' || task.tag === 'deep_work');
  const completedCount = tasks.filter(task => task.status === 'done').length;
  const todoCount = tasks.filter(task => task.status === 'todo').length;

  const TaskCard = ({ task }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`bg-bg-primary/50 border-2 rounded-xl p-4 transition-all duration-300 ${
        completingTaskId === task.id ? 'task-completing' : ''
      } ${
        task.status === 'done'
          ? 'border-accent-green/30 opacity-60'
          : (task.type === 'quick_win' || task.tag === 'quick_win')
          ? 'border-accent-green/50 hover:border-accent-green'
          : 'border-accent-purple/50 hover:border-accent-purple'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="cursor-pointer"
          onClick={() => toggleTaskStatus(task.id)}
        >
          {task.status === 'done' ? (
            <CheckCircle2 className="w-6 h-6 text-accent-green flex-shrink-0 mt-0.5" />
          ) : (
            <Circle className="w-6 h-6 text-text-muted flex-shrink-0 mt-0.5" />
          )}
        </div>
        <div className="flex-1">
          <h4 className={`font-semibold ${task.status === 'done' ? 'line-through text-text-muted' : 'text-text-primary'}`}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-sm text-text-secondary mt-1">{task.description}</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            {task.priority && (
              <span className="text-xs px-2 py-1 rounded-full bg-accent-gold/20 text-accent-gold">
                Priority {task.priority}
              </span>
            )}
            {task.xp_value && (
              <span className="text-xs px-2 py-1 rounded-full bg-accent-blue/20 text-accent-blue">
                +{task.xp_value} XP
              </span>
            )}
            {task.status !== 'done' && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartTask(task);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`ml-auto px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all duration-300 ${
                  (task.type === 'quick_win' || task.tag === 'quick_win')
                    ? 'bg-accent-green/20 text-accent-green hover:bg-accent-green/30 border border-accent-green/50'
                    : 'bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30 border border-accent-purple/50'
                }`}
              >
                <Play className="w-4 h-4" />
                Start
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen cyber-grid p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 sm:mb-12 relative"
        >
          {/* Logout Button - Top Right */}
          <div className="absolute top-0 right-0 flex items-center gap-3">
            {user && (
              <span className="text-text-secondary text-sm hidden sm:inline">
                {user.full_name || user.email}
              </span>
            )}
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-red-500/30 rounded-lg text-red-400 hover:border-red-500 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </motion.button>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-neon-blue via-accent-purple to-neon-pink bg-clip-text text-transparent">
              NEMESIS
            </h1>
            <p className="text-text-secondary text-base sm:text-lg">
              Clear your mind. Conquer your tasks.
            </p>
          </div>
        </motion.header>

        {/* Tab Navigation */}
        {showTasks && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex justify-center gap-2"
          >
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                activeTab === 'tasks'
                  ? 'bg-gradient-to-r from-neon-blue to-accent-purple text-white shadow-neon'
                  : 'bg-bg-secondary border border-accent-cyan/30 text-text-primary hover:border-accent-cyan'
              }`}
            >
              Tasks ({todoCount})
            </button>
            <button
              onClick={() => setActiveTab('backlog')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                activeTab === 'backlog'
                  ? 'bg-gradient-to-r from-neon-blue to-accent-purple text-white shadow-neon'
                  : 'bg-bg-secondary border border-accent-cyan/30 text-text-primary hover:border-accent-cyan'
              }`}
            >
              Backlog
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                activeTab === 'stats'
                  ? 'bg-gradient-to-r from-neon-blue to-accent-purple text-white shadow-neon'
                  : 'bg-bg-secondary border border-accent-cyan/30 text-text-primary hover:border-accent-cyan'
              }`}
            >
              Stats
            </button>
          </motion.div>
        )}

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-red-500/10 border-2 border-red-500/50 rounded-xl p-3 sm:p-4 flex items-start sm:items-center gap-3"
            >
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-red-500 font-semibold">Error</p>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-400"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        {activeTab === 'tasks' && (
          <>
            {/* Brain Dump Section */}
            {!showTasks && (
              <motion.section
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-8 sm:mb-12"
              >
                <div className="relative">
                  {/* Decorative corners */}
                  <div className="absolute -top-1 -left-1 sm:-top-2 sm:-left-2 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-l-2 sm:border-t-4 sm:border-l-4 border-neon-blue"></div>
                  <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-r-2 sm:border-t-4 sm:border-r-4 border-neon-pink"></div>
                  <div className="absolute -bottom-1 -left-1 sm:-bottom-2 sm:-left-2 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-l-2 sm:border-b-4 sm:border-l-4 border-neon-green"></div>
                  <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-r-2 sm:border-b-4 sm:border-r-4 border-accent-purple"></div>

                  <div className="bg-bg-secondary/80 backdrop-blur-sm border-2 border-accent-cyan/30 rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-neon-blue animate-pulse" />
                      <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
                        Free Up RAM
                      </h2>
                    </div>
                    
                    <p className="text-text-secondary text-sm sm:text-base mb-4 sm:mb-6">
                      Dump everything on your mind. I'll organize it for you.
                    </p>

                    <form onSubmit={handleSubmit}>
                      <textarea
                        value={brainDumpText}
                        onChange={(e) => setBrainDumpText(e.target.value)}
                        placeholder="I need to call mom, finish the report, buy groceries, fix that bug..."
                        className="w-full h-40 sm:h-48 px-4 py-3 sm:px-6 sm:py-4 bg-bg-primary/50 text-text-primary text-base sm:text-lg rounded-xl border-2 border-accent-cyan/20 focus:border-accent-cyan focus:outline-none transition-all duration-300 placeholder:text-text-muted resize-none shadow-inner"
                        disabled={isSubmitting}
                      />

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mt-4">
                        <span className="text-text-muted text-xs sm:text-sm">
                          {brainDumpText.length} characters
                        </span>
                        
                        <motion.button
                          type="submit"
                          disabled={!brainDumpText.trim() || isSubmitting}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 ${
                            brainDumpText.trim() && !isSubmitting
                              ? 'bg-gradient-to-r from-neon-blue to-accent-purple text-white shadow-neon hover:shadow-neon-pink'
                              : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
                          }`}
                        >
                          {isSubmitting ? (
                            <span className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Processing...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Sparkles className="w-5 h-5" />
                              Clear My Mind
                            </span>
                          )}
                        </motion.button>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.section>
            )}

            {/* Task List */}
            {showTasks && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Your Tasks</h2>
                    {totalXP > 0 && (
                      <p className="text-sm text-accent-blue">+{totalXP} XP earned this session</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowTasks(false);
                      setBrainDumpText('');
                    }}
                    className="px-3 py-2 sm:px-4 sm:py-2 bg-bg-secondary border border-accent-cyan/30 rounded-lg text-sm sm:text-base text-text-primary hover:border-accent-cyan transition-all"
                  >
                    + Add More Tasks
                  </button>
                </motion.div>

                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8"
                >
                  {/* Quick Wins Section */}
                  <div className="bg-bg-secondary/60 backdrop-blur-sm border-2 border-accent-green/30 rounded-2xl p-4 sm:p-6 shadow-xl">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent-green/20 rounded-lg flex items-center justify-center border-2 border-accent-green/50">
                        <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-accent-green" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl sm:text-2xl font-bold text-text-primary">Quick Wins</h3>
                        <p className="text-text-muted text-xs sm:text-sm">{'<15 minutes'}</p>
                      </div>
                      <div className="bg-accent-green/20 px-2 sm:px-3 py-1 rounded-full">
                        <span className="text-accent-green font-bold text-sm sm:text-base">{quickWins.length}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <AnimatePresence>
                        {quickWins.length > 0 ? (
                          quickWins.map(task => <TaskCard key={task.id} task={task} />)
                        ) : (
                          <div className="text-center py-12 text-text-muted">
                            <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No quick wins yet</p>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Deep Work Section */}
                  <div className="bg-bg-secondary/60 backdrop-blur-sm border-2 border-accent-purple/30 rounded-2xl p-4 sm:p-6 shadow-xl">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent-purple/20 rounded-lg flex items-center justify-center border-2 border-accent-purple/50">
                        <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-accent-purple" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl sm:text-2xl font-bold text-text-primary">Deep Work</h3>
                        <p className="text-text-muted text-xs sm:text-sm">≥15 minutes</p>
                      </div>
                      <div className="bg-accent-purple/20 px-2 sm:px-3 py-1 rounded-full">
                        <span className="text-accent-purple font-bold text-sm sm:text-base">{deepWork.length}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <AnimatePresence>
                        {deepWork.length > 0 ? (
                          deepWork.map(task => <TaskCard key={task.id} task={task} />)
                        ) : (
                          <div className="text-center py-12 text-text-muted">
                            <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No deep work yet</p>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.section>
              </>
            )}

            {/* Stats Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 sm:mt-8 flex justify-center gap-4 sm:gap-8 text-center pb-20 sm:pb-8"
            >
              <div className="bg-bg-secondary/40 backdrop-blur-sm border border-accent-blue/30 rounded-xl px-4 py-2 sm:px-6 sm:py-3">
                <div className="text-2xl sm:text-3xl font-bold text-accent-blue">✓ {completedCount}</div>
                <div className="text-text-muted text-xs sm:text-sm">Completed</div>
              </div>
            </motion.div>
          </>
        )}

        {/* Backlog Tab */}
        {activeTab === 'backlog' && (
          <BacklogView />
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <StatsPanel />
        )}
      </div>
    </div>
  );
};

Dashboard.propTypes = {
  onStartTask: PropTypes.func.isRequired,
  onTaskCountChange: PropTypes.func,
  onTaskComplete: PropTypes.func,
};

export default Dashboard;

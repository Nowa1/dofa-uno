import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBacklog } from '../utils/api';
import PropTypes from 'prop-types';

/**
 * BacklogView - Display completed tasks with pagination and search
 * Shows task history with XP earned and completion dates
 */
export default function BacklogView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const limit = 20;

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on new search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch backlog data
  const fetchBacklog = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBacklog(page, limit, debouncedSearch);
      setTasks(data.tasks || []);
      setTotal(data.count || 0);
      setTotalPages(data.total_pages || 1);
      setError(null);
    } catch (err) {
      console.error('Failed to load backlog:', err);
      setError('Failed to load backlog. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  // Load backlog on mount and when page/search changes
  useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Get color class for task type
  const getTaskTypeColor = (tag) => {
    return tag === 'quick_win' ? 'task-quick-win' : 'task-deep-work';
  };

  // Get task type label
  const getTaskTypeLabel = (tag) => {
    return tag === 'quick_win' ? '⚡ Quick Win' : '🧠 Deep Work';
  };

  return (
    <div className="backlog-view">
      {/* Header with search */}
      <div className="backlog-header">
        <div className="backlog-title">
          <h2>📚 Task Backlog</h2>
          <span className="task-count">{total} completed tasks</span>
        </div>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search completed tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      {/* Loading state */}
      {loading && tasks.length === 0 && (
        <div className="backlog-loading">
          <div className="loading-spinner"></div>
          <p>Loading your achievements...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="backlog-error">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchBacklog} className="retry-button">
            Try Again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && tasks.length === 0 && (
        <div className="backlog-empty">
          <div className="empty-icon">🎯</div>
          <h3>No completed tasks yet</h3>
          <p>
            {searchQuery 
              ? 'No tasks match your search. Try a different query.'
              : 'Complete your first task to start building your backlog!'}
          </p>
        </div>
      )}

      {/* Task list */}
      {!loading && !error && tasks.length > 0 && (
        <>
          <AnimatePresence mode="popLayout">
            <div className="backlog-grid">
              {tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  className={`backlog-card ${getTaskTypeColor(task.tag)}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                >
                  <div className="task-header">
                    <span className="task-type-badge">
                      {getTaskTypeLabel(task.tag)}
                    </span>
                    <span className="task-date">{formatDate(task.completed_at)}</span>
                  </div>
                  
                  <h3 className="task-title">{task.title}</h3>
                  
                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}
                  
                  {task.tag && (
                    <span className="task-tag">#{task.tag}</span>
                  )}
                  
                  <div className="task-footer">
                    <span className="task-xp">+{task.xp_value} XP</span>
                    <span className="task-checkmark">✓</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="pagination-button"
              >
                ← Previous
              </button>
              
              <div className="pagination-info">
                <span className="page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`page-number ${page === pageNum ? 'active' : ''}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </span>
                <span className="page-text">
                  Page {page} of {totalPages}
                </span>
              </div>
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="pagination-button"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

BacklogView.propTypes = {};

// Centralized API client for backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Default options for all fetch requests
 */
const defaultOptions = {
  credentials: 'include',  // IMPORTANT: Include cookies for authentication
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Parse brain dump text into tasks
 * @param {string} text - Brain dump text
 * @returns {Promise<Object>} Parsed tasks response
 */
export async function parseDump(text) {
  return fetchAPI('/api/parse_dump', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

/**
 * Get tasks by status
 * @param {string} status - 'todo', 'done', or 'all'
 * @returns {Promise<Array>} Array of tasks
 */
export async function getTasks(status = 'todo') {
  return fetchAPI(`/api/tasks?status=${status}`);
}

/**
 * Mark a task as complete
 * @param {number} taskId - Task ID
 * @returns {Promise<Object>} Completion response with XP, level_up, achievements, streak
 */
export async function completeTask(taskId) {
  return fetchAPI(`/api/tasks/${taskId}/complete`, {
    method: 'POST',
  });
}

/**
 * Get backlog (completed tasks) with pagination and search
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20)
 * @param {string} search - Search query (optional)
 * @returns {Promise<Object>} Backlog response with tasks, total, page, pages
 */
export async function getBacklog(page = 1, limit = 20, search = '') {
  let url = `/api/backlog?page=${page}&limit=${limit}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  return fetchAPI(url);
}

/**
 * Get user profile with XP, level, and streak
 * @returns {Promise<Object>} Profile data
 */
export async function getProfile() {
  return fetchAPI('/api/profile');
}

/**
 * Get all achievements (locked and unlocked)
 * @returns {Promise<Array>} Array of achievements
 */
export async function getAchievements() {
  return fetchAPI('/api/achievements');
}

/**
 * Get statistics for a time period
 * @param {string} period - 'week', 'month', or 'all'
 * @returns {Promise<Object>} Statistics data
 */
export async function getStats(period = 'week') {
  return fetchAPI(`/api/stats?period=${period}`);
}

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} fullName - User full name
 * @returns {Promise<Object>} User data
 */
export async function register(email, password, fullName) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    ...defaultOptions,
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Registration failed');
  }
  return response.json();
}

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User data
 */
export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    ...defaultOptions,
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }
  return response.json();
}

/**
 * Logout current user
 * @returns {Promise<Object>} Logout response
 */
export async function logout() {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    ...defaultOptions,
  });
  return response.json();
}

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} User data or null if not authenticated
 */
export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    ...defaultOptions,
  });
  if (!response.ok) {
    if (response.status === 401) return null;
    throw new Error('Failed to get current user');
  }
  return response.json();
}

/**
 * Error messages for user-friendly display
 */
export const ERROR_MESSAGES = {
  NETWORK: 'Unable to connect to server. Please check your connection.',
  PARSE: 'Failed to parse brain dump. Please try again.',
  TASK_LOAD: 'Failed to load tasks. Using cached data.',
  TASK_COMPLETE: 'Failed to mark task as complete. Please try again.',
  BACKLOG_LOAD: 'Failed to load backlog. Please try again.',
  PROFILE_LOAD: 'Failed to load profile data.',
  STATS_LOAD: 'Failed to load statistics.',
  AUTH_FAILED: 'Authentication failed. Please try again.',
  REGISTER_FAILED: 'Registration failed. Please try again.',
};

/**
 * Check if error is a network error
 */
export function isNetworkError(error) {
  return error.message.includes('fetch') || error.message.includes('NetworkError');
}

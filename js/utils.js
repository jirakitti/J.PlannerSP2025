// State Management & General Utilities for J.Tracking

// Storage Keys Constants
export const KEYS = {
  THEME: 'jtracking_theme',
  FIXED_TASKS: 'jtracking_fixed_tasks',
  DAILY_DATA: 'jtracking_daily_data',
  HABITS: 'jtracking_habits',
  BUCKET: 'jtracking_bucket'
};

// Default Fixed Tasks Template
export const DEFAULT_FIXED_TASKS = ["STM", "LogicPic", "LogicNum", "Scanning", "Spatial", "คุณเลข", "Pro2Group"];

// Default Quotes List
export const MOTIVATIONAL_QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Productivity is being able to do things that you were never able to do before.", author: "Franz Kafka" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "Make each day your masterpiece.", author: "John Wooden" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" }
];

// Date Helper Functions
export function getLocalDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatDate(d);
}

export function formatDate(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getMonthYearLabel(year, month) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[month]} ${year}`;
}

// Check if a date string is today
export function isToday(dateStr) {
  return dateStr === getLocalDateString(0);
}

// Pub-Sub Global State Store Class
class StateStore {
  constructor() {
    this.listeners = {};
    this.initDefaultState();
  }

  initDefaultState() {
    if (!localStorage.getItem(KEYS.THEME)) {
      localStorage.setItem(KEYS.THEME, 'dark');
    }
    if (!localStorage.getItem(KEYS.FIXED_TASKS)) {
      localStorage.setItem(KEYS.FIXED_TASKS, JSON.stringify(DEFAULT_FIXED_TASKS));
    }
    if (!localStorage.getItem(KEYS.DAILY_DATA)) {
      localStorage.setItem(KEYS.DAILY_DATA, JSON.stringify({}));
    }
    if (!localStorage.getItem(KEYS.HABITS)) {
      localStorage.setItem(KEYS.HABITS, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.BUCKET)) {
      localStorage.setItem(KEYS.BUCKET, JSON.stringify([]));
    }
  }

  // Pub-Sub Methods
  subscribe(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  notify(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Theme management
  getTheme() {
    return localStorage.getItem(KEYS.THEME) || 'dark';
  }

  setTheme(theme) {
    localStorage.setItem(KEYS.THEME, theme);
    this.notify('themeChanged', theme);
  }

  // Fixed Tasks
  getFixedTasks() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.FIXED_TASKS)) || DEFAULT_FIXED_TASKS;
    } catch {
      return DEFAULT_FIXED_TASKS;
    }
  }

  saveFixedTasks(tasks) {
    localStorage.setItem(KEYS.FIXED_TASKS, JSON.stringify(tasks));
    this.notify('fixedTasksChanged', tasks);
    this.notify('dataChanged', null); // Trigger global updates (like dashboard battery)
  }

  // Daily Tasks and Journal
  getDailyData(dateStr) {
    try {
      const allData = JSON.parse(localStorage.getItem(KEYS.DAILY_DATA)) || {};
      return allData[dateStr] || { custom: [], fixedCompleted: [], journal: '' };
    } catch {
      return { custom: [], fixedCompleted: [], journal: '' };
    }
  }

  saveDailyData(dateStr, data) {
    try {
      const allData = JSON.parse(localStorage.getItem(KEYS.DAILY_DATA)) || {};
      allData[dateStr] = data;
      localStorage.setItem(KEYS.DAILY_DATA, JSON.stringify(allData));
      this.notify('dailyDataChanged', { dateStr, data });
      this.notify('dataChanged', null);
    } catch (e) {
      console.error("Error saving daily data", e);
    }
  }

  // Habits
  getHabits() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.HABITS)) || [];
    } catch {
      return [];
    }
  }

  saveHabits(habits) {
    localStorage.setItem(KEYS.HABITS, JSON.stringify(habits));
    this.notify('habitsChanged', habits);
    this.notify('dataChanged', null);
  }

  // Bucket List
  getBucketItems() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.BUCKET)) || [];
    } catch {
      return [];
    }
  }

  saveBucketItems(items) {
    localStorage.setItem(KEYS.BUCKET, JSON.stringify(items));
    this.notify('bucketChanged', items);
    this.notify('dataChanged', null);
  }
}

export const store = new StateStore();

// Habit Streak Computations
export function calculateHabitStreak(history) {
  let currentStreak = 0;
  let todayStr = getLocalDateString(0);
  let yesterdayStr = getLocalDateString(-1);
  
  // Determine starting date for current streak calculation
  let startCheckDate = null;
  if (history[todayStr]) {
    startCheckDate = new Date();
  } else if (history[yesterdayStr]) {
    startCheckDate = new Date();
    startCheckDate.setDate(startCheckDate.getDate() - 1);
  }
  
  if (startCheckDate) {
    let tempDate = new Date(startCheckDate);
    while (true) {
      let dateStr = formatDate(tempDate);
      if (history[dateStr]) {
        currentStreak++;
        tempDate.setDate(tempDate.getDate() - 1);
      } else {
        break;
      }
    }
  }
  
  // Calculate longest streak
  let longestStreak = 0;
  const checkedSorted = Object.keys(history)
    .filter(d => history[d])
    .sort((a, b) => new Date(a) - new Date(b));
    
  if (checkedSorted.length > 0) {
    let currentTempStreak = 1;
    longestStreak = 1;
    for (let i = 1; i < checkedSorted.length; i++) {
      const prev = new Date(checkedSorted[i - 1]);
      const curr = new Date(checkedSorted[i]);
      const diffTime = Math.abs(curr - prev);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentTempStreak++;
      } else if (diffDays > 1) {
        currentTempStreak = 1;
      }
      if (currentTempStreak > longestStreak) {
        longestStreak = currentTempStreak;
      }
    }
  }
  
  return { currentStreak, longestStreak };
}

// Compute general Productivity Streak
// Consecutive days with any completion (either task completed or habit checked)
export function getProductivityStreak() {
  let dailyData = {};
  try {
    dailyData = JSON.parse(localStorage.getItem(KEYS.DAILY_DATA)) || {};
  } catch {}
  
  let habits = [];
  try {
    habits = JSON.parse(localStorage.getItem(KEYS.HABITS)) || [];
  } catch {}

  // Function to check if a day is active
  const isDayActive = (dateStr) => {
    // 1. Check if any daily tasks are completed
    const dayData = dailyData[dateStr];
    if (dayData) {
      if (dayData.fixedCompleted && dayData.fixedCompleted.length > 0) return true;
      if (dayData.custom && dayData.custom.some(t => t.completed)) return true;
      if (dayData.journal && dayData.journal.trim().length > 0) return true;
    }
    // 2. Check if any habit is checked
    for (const h of habits) {
      if (h.history && h.history[dateStr]) return true;
    }
    return false;
  };

  let streak = 0;
  let todayStr = getLocalDateString(0);
  let yesterdayStr = getLocalDateString(-1);

  let startCheckDate = null;
  if (isDayActive(todayStr)) {
    startCheckDate = new Date();
  } else if (isDayActive(yesterdayStr)) {
    startCheckDate = new Date();
    startCheckDate.setDate(startCheckDate.getDate() - 1);
  }

  if (startCheckDate) {
    let tempDate = new Date(startCheckDate);
    while (true) {
      let dateStr = formatDate(tempDate);
      if (isDayActive(dateStr)) {
        streak++;
        tempDate.setDate(tempDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return streak;
}

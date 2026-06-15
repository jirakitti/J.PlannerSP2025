// App Orchestrator Module for J.Tracking
import { store } from './utils.js';
import { initDashboard } from './dashboard.js';
import { initCalendar } from './calendar.js';
import { initHabits } from './habits.js';
import { initBucket } from './bucket.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial State Loaders
  initTheme();
  updateCountdownBanner();
  
  // 2. Initialize Subpages and get cleanup functions if any
  const dashboardCleanup = initDashboard();
  const calendarCleanup = initCalendar();
  const habitsCleanup = initHabits();
  const bucketCleanup = initBucket();
  // 3. Navigation setup
  const navItems = document.querySelectorAll('.nav-item');
  const pageViews = document.querySelectorAll('.page-view');
  
  // Mobile elements for sidebar toggling
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const sidebarAside = document.getElementById('sidebar-aside');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  function closeSidebar() {
    if (sidebarAside) sidebarAside.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  }

  if (menuToggleBtn) {
    menuToggleBtn.addEventListener('click', () => {
      if (sidebarAside) sidebarAside.classList.toggle('open');
      if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetPageId = item.dataset.page;
      
      // Update active nav class
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Toggle active page view
      pageViews.forEach(view => {
        if (view.id === `${targetPageId}-page`) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });

      // Close sidebar drawer if on mobile view
      closeSidebar();

      // When switching pages, trigger a state sync so stats update
      store.notify('dataChanged', null);
    });
  });

  // 4. Update Countdown Banner
  function updateCountdownBanner() {
    const targetDate = new Date(2026, 11, 22); // December 22, 2026 (Month is 0-indexed: 11 is Dec)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffMs = targetDate - today;
    
    const daysValEl = document.getElementById('countdown-days-val');
    const monthsDaysValEl = document.getElementById('countdown-months-days-val');
    
    if (diffMs <= 0) {
      if (daysValEl) daysValEl.textContent = "0 Days";
      if (monthsDaysValEl) monthsDaysValEl.textContent = "Goal Achieved!";
      return;
    }
    
    const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    // Calculate Months + Days
    let months = 0;
    let tempDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    while (true) {
      const nextMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, tempDate.getDate());
      if (nextMonth <= targetDate) {
        months++;
        tempDate = nextMonth;
      } else {
        break;
      }
    }
    
    const diffRemainingMs = targetDate - tempDate;
    const remainingDays = Math.round(diffRemainingMs / (1000 * 60 * 60 * 24));
    
    if (daysValEl) {
      daysValEl.textContent = `${totalDays} Days`;
    }
    
    if (monthsDaysValEl) {
      monthsDaysValEl.textContent = `${months} Mo, ${remainingDays} Days`;
    }
  }

  // 5. Theme Settings Manager
  function initTheme() {
    const themeBtn = document.getElementById('theme-btn');
    const themeBtnMobile = document.getElementById('theme-btn-mobile');
    const activeTheme = store.getTheme();
    
    applyTheme(activeTheme);
    
    const toggleThemeCallback = () => {
      const currentTheme = store.getTheme();
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      store.setTheme(nextTheme);
    };

    if (themeBtn) {
      themeBtn.addEventListener('click', toggleThemeCallback);
    }
    if (themeBtnMobile) {
      themeBtnMobile.addEventListener('click', toggleThemeCallback);
    }

    // React to store theme adjustments (for multi-module sync)
    store.subscribe('themeChanged', (theme) => {
      applyTheme(theme);
    });
  }

  function applyTheme(theme) {
    const themeStatusLabel = document.getElementById('theme-status-lbl');
    
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (themeStatusLabel) themeStatusLabel.textContent = 'Light Mode';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeStatusLabel) themeStatusLabel.textContent = 'Dark Mode';
    }
  }

  // Update countdown every day at midnight (simulate using a simple periodic checker)
  setInterval(updateCountdownBanner, 60000); // Check every minute
});

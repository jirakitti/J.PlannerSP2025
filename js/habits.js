// Habits Tracker Module for J.Tracking
import { store, getLocalDateString, formatDate, calculateHabitStreak } from './utils.js';

export function initHabits() {
  // DOM Elements
  const habitsGrid = document.getElementById('habits-grid');
  const inputNewHabit = document.getElementById('input-new-habit');
  const btnAddHabit = document.getElementById('btn-add-habit');

  // Generate the last 7 days list (from 6 days ago up to today)
  function getPast7Days() {
    const days = [];
    const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      days.push({
        dateStr: dateStr,
        label: weekdayLabels[d.getDay()], // e.g., "Mo"
        fullName: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      });
    }
    return days;
  }

  // Render Habits List
  function renderHabits() {
    if (!habitsGrid) return;
    habitsGrid.innerHTML = '';
    
    const habits = store.getHabits();
    const past7Days = getPast7Days();

    if (habits.length === 0) {
      habitsGrid.innerHTML = `
        <div class="glass" style="padding: 2.5rem; text-align: center; color: var(--text-muted); font-size: 0.95rem;">
          No habits added yet. Start tracking a new habit above!
        </div>
      `;
      return;
    }

    habits.forEach(habit => {
      // Calculate Streaks in real-time
      const { currentStreak, longestStreak } = calculateHabitStreak(habit.history || {});

      // Card layout
      const card = document.createElement('div');
      card.className = 'habit-card glass';

      // 1. Habit Info Column
      const infoCol = document.createElement('div');
      infoCol.className = 'habit-info';
      
      const title = document.createElement('h3');
      title.className = 'habit-title';
      title.textContent = habit.name;
      
      const meta = document.createElement('span');
      meta.className = 'habit-meta-streak';
      meta.textContent = `Started: ${habit.createdAt}`;
      
      infoCol.appendChild(title);
      infoCol.appendChild(meta);
      card.appendChild(infoCol);

      // 2. Bubble History Column
      const bubblesCol = document.createElement('div');
      bubblesCol.className = 'habit-bubbles-row';

      past7Days.forEach(day => {
        const isChecked = habit.history && habit.history[day.dateStr] === true;
        
        const bubbleContainer = document.createElement('div');
        bubbleContainer.className = `habit-bubble-container ${isChecked ? 'checked' : ''}`;
        bubbleContainer.title = `${day.fullName} - ${isChecked ? 'Completed' : 'Not Completed'}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'habit-bubble';
        bubble.textContent = day.label;
        
        const label = document.createElement('span');
        label.className = 'habit-bubble-day-label';
        // Show day name or date number
        label.textContent = day.dateStr.split('-')[2]; // just day number
        
        bubbleContainer.appendChild(bubble);
        bubbleContainer.appendChild(label);

        // Click to toggle habit check-in for specific day
        bubbleContainer.addEventListener('click', () => {
          toggleHabitDay(habit.id, day.dateStr);
        });

        bubblesCol.appendChild(bubbleContainer);
      });
      card.appendChild(bubblesCol);

      // 3. Streak Stats and Action Buttons
      const streakCol = document.createElement('div');
      streakCol.className = 'habit-streaks-box';

      // Current Streak display
      const currStreakStat = document.createElement('div');
      currStreakStat.className = 'habit-streak-stat';
      currStreakStat.innerHTML = `
        <span class="habit-streak-num">🔥 ${currentStreak}</span>
        <span class="habit-streak-lbl">Current</span>
      `;
      streakCol.appendChild(currStreakStat);

      // Longest Streak display
      const longStreakStat = document.createElement('div');
      longStreakStat.className = 'habit-streak-stat';
      longStreakStat.innerHTML = `
        <span class="habit-streak-num">🏆 ${longestStreak}</span>
        <span class="habit-streak-lbl">Longest</span>
      `;
      streakCol.appendChild(longStreakStat);

      // Delete habit button
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.style.padding = '8px';
      delBtn.style.marginLeft = '0.5rem';
      delBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px; height:18px;">
          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      `;
      delBtn.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete habit "${habit.name}"?`)) {
          deleteHabit(habit.id);
        }
      });
      streakCol.appendChild(delBtn);

      card.appendChild(streakCol);
      habitsGrid.appendChild(card);
    });
  }

  // Toggle habit checked status for a date
  function toggleHabitDay(habitId, dateStr) {
    const habits = store.getHabits();
    const updated = habits.map(h => {
      if (h.id === habitId) {
        const history = h.history || {};
        history[dateStr] = !history[dateStr];
        return { ...h, history };
      }
      return h;
    });
    
    store.saveHabits(updated);
    renderHabits();
  }

  // Add Habit
  function addHabit() {
    if (!inputNewHabit) return;
    const name = inputNewHabit.value.trim();
    if (!name) return;

    const habits = store.getHabits();
    
    // Check duplicates
    if (habits.some(h => h.name.toLowerCase() === name.toLowerCase())) {
      alert("This habit already exists!");
      return;
    }

    const newHabit = {
      id: Date.now(),
      name: name,
      createdAt: getLocalDateString(0),
      history: {}
    };

    habits.push(newHabit);
    store.saveHabits(habits);
    inputNewHabit.value = '';
    
    renderHabits();
  }

  // Delete Habit
  function deleteHabit(habitId) {
    const habits = store.getHabits();
    const filtered = habits.filter(h => h.id !== habitId);
    store.saveHabits(filtered);
    renderHabits();
  }

  // Add event listeners
  if (btnAddHabit) {
    btnAddHabit.addEventListener('click', addHabit);
  }
  if (inputNewHabit) {
    inputNewHabit.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addHabit();
    });
  }

  // Subscribe to changes (e.g., in case of data reset or other module syncs)
  const unsubscribe = store.subscribe('habitsChanged', renderHabits);

  // Initial draw
  renderHabits();

  return unsubscribe;
}

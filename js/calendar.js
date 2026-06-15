// Calendar & Tasks Module for J.Tracking
import { store, getLocalDateString, formatDate } from './utils.js';

export function initCalendar() {
  // Current calendar view state
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth(); // 0-indexed
  let selectedDateStr = getLocalDateString(0); // Default selected is today

  // DOM Elements
  const prevMonthBtn = document.getElementById('prev-month-btn');
  const nextMonthBtn = document.getElementById('next-month-btn');
  const monthDisplay = document.getElementById('month-display');
  const calendarGrid = document.getElementById('calendar-grid');
  
  // Fixed Tasks Modal Elements
  const btnSetupFixed = document.getElementById('btn-setup-fixed');
  const fixedModal = document.getElementById('fixed-tasks-modal');
  const fixedModalClose = document.getElementById('fixed-modal-close');
  const fixedTasksListEl = document.getElementById('fixed-tasks-list-modal');
  const inputNewFixed = document.getElementById('input-new-fixed');
  const btnAddFixed = document.getElementById('btn-add-fixed');
  
  // Daily Detail Panel Elements
  const selectedDateLabel = document.getElementById('selected-date-label');
  const journalTextarea = document.getElementById('journal-notes');
  const inputCustomTask = document.getElementById('input-custom-task');
  const btnAddCustomTask = document.getElementById('btn-add-custom-task');
  const customTaskListEl = document.getElementById('custom-task-list');
  const completedSummaryEl = document.getElementById('completed-summary-list');

  // Calendar Math Solver
  function generateCalendarDays(year, month) {
    const days = [];
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // getDay() is 0 (Sun) to 6 (Sat)
    // Convert to Mon-Sun (0: Mon, 1: Tue, ..., 6: Sun)
    let firstDayIndex = (firstDay.getDay() + 6) % 7;
    
    // Days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Days in previous month
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    // Fill previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthTotalDays - i);
      days.push({
        date: prevDate,
        dateStr: formatDate(prevDate),
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false
      });
    }
    
    // Fill current month days
    for (let i = 1; i <= totalDays; i++) {
      const currDate = new Date(year, month, i);
      days.push({
        date: currDate,
        dateStr: formatDate(currDate),
        dayNumber: i,
        isCurrentMonth: true
      });
    }
    
    // Fill next month leading days to complete grid rows (multiples of 7, up to 42 cells)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const nextDaysCount = totalCells - days.length;
    for (let i = 1; i <= nextDaysCount; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        date: nextDate,
        dateStr: formatDate(nextDate),
        dayNumber: i,
        isCurrentMonth: false
      });
    }
    
    return days;
  }

  // Draw the Calendar Grid
  function renderCalendar() {
    if (!calendarGrid) return;
    
    // Update Month Display Title
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    monthDisplay.textContent = `${months[currentMonth]} ${currentYear}`;
    
    calendarGrid.innerHTML = '';
    
    const days = generateCalendarDays(currentYear, currentMonth);
    const todayStr = getLocalDateString(0);
    const fixedTasks = store.getFixedTasks();

    days.forEach(day => {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell glass';
      if (!day.isCurrentMonth) cell.classList.add('other-month');
      if (day.dateStr === todayStr) cell.classList.add('today');
      if (day.dateStr === selectedDateStr) cell.classList.add('active-selected');
      
      cell.dataset.date = day.dateStr;

      // Header row
      const cellHeader = document.createElement('div');
      cellHeader.className = 'cell-header';
      
      const numberSpan = document.createElement('span');
      numberSpan.className = 'cell-number';
      numberSpan.textContent = day.dayNumber;
      cellHeader.appendChild(numberSpan);

      // Add small badges (like pin 📌 icon if custom tasks exist)
      const dayData = store.getDailyData(day.dateStr);
      if (dayData.custom && dayData.custom.length > 0) {
        const badgeWrap = document.createElement('div');
        badgeWrap.className = 'cell-badges';
        badgeWrap.innerHTML = `<span class="cell-custom-badge">📌</span>`;
        cellHeader.appendChild(badgeWrap);
      }
      
      cell.appendChild(cellHeader);

      // Checkbox list container
      const taskListWrap = document.createElement('div');
      taskListWrap.className = 'cell-tasks-list';

      // 1. Render Fixed Tasks
      fixedTasks.forEach(fixedTaskName => {
        const isCompleted = dayData.fixedCompleted && dayData.fixedCompleted.includes(fixedTaskName);
        
        const item = document.createElement('div');
        item.className = 'cell-task-item';
        if (isCompleted) item.classList.add('completed');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'cell-checkbox';
        checkbox.checked = isCompleted;
        
        checkbox.addEventListener('change', (e) => {
          e.stopPropagation(); // Prevent cell click selection
          toggleFixedTask(day.dateStr, fixedTaskName, checkbox.checked);
        });

        const label = document.createElement('label');
        label.textContent = fixedTaskName;
        label.title = fixedTaskName;
        label.addEventListener('click', (e) => {
          e.stopPropagation();
          checkbox.checked = !checkbox.checked;
          toggleFixedTask(day.dateStr, fixedTaskName, checkbox.checked);
        });

        item.appendChild(checkbox);
        item.appendChild(label);
        taskListWrap.appendChild(item);
      });

      // 2. Render Custom Tasks (with pin prefix)
      if (dayData.custom && dayData.custom.length > 0) {
        dayData.custom.forEach(customTask => {
          const item = document.createElement('div');
          item.className = 'cell-task-item';
          if (customTask.completed) item.classList.add('completed');

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'cell-checkbox';
          checkbox.checked = customTask.completed;
          checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            toggleCustomTask(day.dateStr, customTask.id, checkbox.checked);
          });

          const label = document.createElement('label');
          label.textContent = `📌 ${customTask.text}`;
          label.title = customTask.text;
          label.addEventListener('click', (e) => {
            e.stopPropagation();
            checkbox.checked = !checkbox.checked;
            toggleCustomTask(day.dateStr, customTask.id, checkbox.checked);
          });

          item.appendChild(checkbox);
          item.appendChild(label);
          taskListWrap.appendChild(item);
        });
      }

      cell.appendChild(taskListWrap);

      // Click event to select cell
      cell.addEventListener('click', () => {
        selectedDateStr = day.dateStr;
        // Update active classes on cells
        document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('active-selected'));
        cell.classList.add('active-selected');
        
        // Update notes panel
        renderDailyPanel();
      });

      calendarGrid.appendChild(cell);
    });
  }

  // Toggle state of fixed task on date
  function toggleFixedTask(dateStr, taskName, isCompleted) {
    const data = store.getDailyData(dateStr);
    if (!data.fixedCompleted) data.fixedCompleted = [];
    
    if (isCompleted) {
      if (!data.fixedCompleted.includes(taskName)) {
        data.fixedCompleted.push(taskName);
      }
    } else {
      data.fixedCompleted = data.fixedCompleted.filter(t => t !== taskName);
    }
    
    store.saveDailyData(dateStr, data);
    
    // If we altered the currently selected date, update the summary list
    if (dateStr === selectedDateStr) {
      renderDailyPanel();
    }
  }

  // Toggle custom task completion
  function toggleCustomTask(dateStr, taskId, isCompleted) {
    const data = store.getDailyData(dateStr);
    data.custom = data.custom.map(t => {
      if (t.id === taskId) {
        return { ...t, completed: isCompleted };
      }
      return t;
    });
    
    store.saveDailyData(dateStr, data);
    
    if (dateStr === selectedDateStr) {
      renderDailyPanel();
    }
    // Also re-render cell (simplest way is rendering calendar)
    renderCalendar();
  }

  // Render Daily Journal & Notes Panel
  function renderDailyPanel() {
    const parts = selectedDateStr.split('-');
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    if (selectedDateLabel) {
      selectedDateLabel.textContent = dateObj.toLocaleDateString('en-US', options);
    }
    
    const data = store.getDailyData(selectedDateStr);
    
    // Notes Area
    if (journalTextarea) {
      journalTextarea.value = data.journal || '';
    }
    
    // Custom tasks in Panel
    if (customTaskListEl) {
      customTaskListEl.innerHTML = '';
      if (data.custom && data.custom.length > 0) {
        data.custom.forEach(task => {
          const div = document.createElement('div');
          div.className = `custom-task-item ${task.completed ? 'completed' : ''}`;
          
          const checkboxLabel = document.createElement('div');
          checkboxLabel.className = 'custom-task-checkbox-wrap';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'cell-checkbox';
          checkbox.checked = task.completed;
          checkbox.addEventListener('change', () => {
            toggleCustomTask(selectedDateStr, task.id, checkbox.checked);
          });
          
          const textSpan = document.createElement('span');
          textSpan.textContent = task.text;
          
          checkboxLabel.appendChild(checkbox);
          checkboxLabel.appendChild(textSpan);
          
          const delBtn = document.createElement('button');
          delBtn.className = 'delete-btn';
          delBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          `;
          delBtn.addEventListener('click', () => {
            deleteCustomTask(task.id);
          });
          
          div.appendChild(checkboxLabel);
          div.appendChild(delBtn);
          customTaskListEl.appendChild(div);
        });
      } else {
        customTaskListEl.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 1rem;">No custom tasks for today.</p>`;
      }
    }

    // Summary of completed tasks
    if (completedSummaryEl) {
      completedSummaryEl.innerHTML = '';
      const fixedTasks = store.getFixedTasks();
      const completedFixed = (data.fixedCompleted || []).filter(t => fixedTasks.includes(t));
      const completedCustom = (data.custom || []).filter(t => t.completed).map(t => t.text);
      
      const allCompleted = [...completedFixed, ...completedCustom.map(t => `📌 ${t}`)];
      
      if (allCompleted.length > 0) {
        allCompleted.forEach(taskName => {
          const li = document.createElement('li');
          li.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>${taskName}</span>
          `;
          completedSummaryEl.appendChild(li);
        });
      } else {
        completedSummaryEl.innerHTML = `<li style="color: var(--text-muted)">No tasks completed yet.</li>`;
      }
    }
  }

  // Add a Custom Task
  function addCustomTask() {
    if (!inputCustomTask) return;
    const text = inputCustomTask.value.trim();
    if (!text) return;
    
    const data = store.getDailyData(selectedDateStr);
    if (!data.custom) data.custom = [];
    
    const newTask = {
      id: Date.now(),
      text: text,
      completed: false
    };
    
    data.custom.push(newTask);
    store.saveDailyData(selectedDateStr, data);
    
    inputCustomTask.value = '';
    
    renderCalendar();
    renderDailyPanel();
  }

  // Delete a Custom Task
  function deleteCustomTask(taskId) {
    const data = store.getDailyData(selectedDateStr);
    data.custom = (data.custom || []).filter(t => t.id !== taskId);
    
    store.saveDailyData(selectedDateStr, data);
    
    renderCalendar();
    renderDailyPanel();
  }

  // Auto-save Journal Note
  let journalTimeout = null;
  if (journalTextarea) {
    journalTextarea.addEventListener('input', () => {
      // Debounce saving to localStorage to prevent lag
      clearTimeout(journalTimeout);
      journalTimeout = setTimeout(() => {
        const data = store.getDailyData(selectedDateStr);
        data.journal = journalTextarea.value;
        store.saveDailyData(selectedDateStr, data);
      }, 300);
    });
  }

  // Set up Add Custom Task buttons
  if (btnAddCustomTask) {
    btnAddCustomTask.addEventListener('click', addCustomTask);
  }
  if (inputCustomTask) {
    inputCustomTask.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addCustomTask();
    });
  }

  // Fixed Template Tasks Editor Manager
  function renderFixedTasksModal() {
    if (!fixedTasksListEl) return;
    fixedTasksListEl.innerHTML = '';
    
    const fixedTasks = store.getFixedTasks();
    fixedTasks.forEach(task => {
      const item = document.createElement('div');
      item.className = 'custom-task-item';
      
      const span = document.createElement('span');
      span.textContent = task;
      span.style.fontSize = '0.9rem';
      
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      `;
      delBtn.addEventListener('click', () => {
        const updated = fixedTasks.filter(t => t !== task);
        store.saveFixedTasks(updated);
        renderFixedTasksModal();
        renderCalendar();
      });
      
      item.appendChild(span);
      item.appendChild(delBtn);
      fixedTasksListEl.appendChild(item);
    });
  }

  function addFixedTask() {
    if (!inputNewFixed) return;
    const taskName = inputNewFixed.value.trim();
    if (!taskName) return;
    
    const fixedTasks = store.getFixedTasks();
    if (fixedTasks.includes(taskName)) {
      alert("This task already exists in the Fixed Template List.");
      return;
    }
    
    fixedTasks.push(taskName);
    store.saveFixedTasks(fixedTasks);
    inputNewFixed.value = '';
    
    renderFixedTasksModal();
    renderCalendar();
  }

  // Modal event hooks
  if (btnSetupFixed && fixedModal) {
    btnSetupFixed.addEventListener('click', () => {
      renderFixedTasksModal();
      fixedModal.classList.add('active');
    });
  }
  
  if (fixedModalClose) {
    fixedModalClose.addEventListener('click', () => {
      fixedModal.classList.remove('active');
    });
  }

  if (fixedModal) {
    // Close modal if clicking outside content
    fixedModal.addEventListener('click', (e) => {
      if (e.target === fixedModal) {
        fixedModal.classList.remove('active');
      }
    });
  }

  if (btnAddFixed) {
    btnAddFixed.addEventListener('click', addFixedTask);
  }
  if (inputNewFixed) {
    inputNewFixed.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addFixedTask();
    });
  }

  // Month navigation buttons
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
    });
  }

  // Subscribe to updates to sync calendar when custom task items are edited or storage resets
  const unsub1 = store.subscribe('fixedTasksChanged', renderCalendar);
  const unsub2 = store.subscribe('dailyDataChanged', (evt) => {
    // Re-render calendar only if dailyData changed
    renderCalendar();
    if (evt.dateStr === selectedDateStr) {
      renderDailyPanel();
    }
  });

  // Initial draw
  renderCalendar();
  renderDailyPanel();

  // Return destructor for listeners cleanup
  return () => {
    unsub1();
    unsub2();
  };
}

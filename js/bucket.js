// Bucket List Module for J.Tracking
import { store } from './utils.js';

export function initBucket() {
  let activeFilter = 'All';
  let editingItemId = null; // null for Add, number for Edit
  let tempSubtasks = []; // Subtasks temporary list in modal state

  // DOM Elements
  const bucketGrid = document.getElementById('bucket-grid');
  const filterContainer = document.getElementById('bucket-filters');
  const btnAddGoal = document.getElementById('btn-add-goal');
  
  // Modal Elements
  const bucketModal = document.getElementById('bucket-modal');
  const bucketModalClose = document.getElementById('bucket-modal-close');
  const bucketForm = document.getElementById('bucket-form');
  const modalTitle = document.getElementById('bucket-modal-title');
  
  const inputGoalTitle = document.getElementById('input-goal-title');
  const selectCategory = document.getElementById('select-category');
  const inputTargetDate = document.getElementById('input-target-date');
  
  // Modal Subtasks elements
  const inputNewSubtask = document.getElementById('input-new-subtask');
  const btnAddSubtask = document.getElementById('btn-add-subtask');
  const modalSubtaskListEl = document.getElementById('modal-subtasks-list');
  const btnSaveGoal = document.getElementById('btn-save-goal');

  // Render Filter Chips
  function renderFilters() {
    if (!filterContainer) return;
    filterContainer.innerHTML = '';
    
    const categories = ['All', 'Growth', 'Career', 'Health', 'Travel', 'Wealth'];
    
    categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = `filter-chip ${cat === activeFilter ? 'active' : ''}`;
      chip.textContent = cat;
      chip.addEventListener('click', () => {
        activeFilter = cat;
        renderFilters();
        renderGoals();
      });
      filterContainer.appendChild(chip);
    });
  }

  // Render Goals Grid
  function renderGoals() {
    if (!bucketGrid) return;
    bucketGrid.innerHTML = '';

    const items = store.getBucketItems();
    
    // Filter items
    const filteredItems = activeFilter === 'All' 
      ? items 
      : items.filter(item => item.category === activeFilter);

    if (filteredItems.length === 0) {
      bucketGrid.innerHTML = `
        <div class="glass" style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted); font-size: 0.95rem;">
          No goals in this category. Let's create one!
        </div>
      `;
      return;
    }

    filteredItems.forEach(item => {
      // Calculate progress
      const totalSub = item.subtasks ? item.subtasks.length : 0;
      const completedSub = item.subtasks ? item.subtasks.filter(s => s.completed).length : 0;
      
      let progress = 0;
      if (totalSub > 0) {
        progress = Math.round((completedSub / totalSub) * 100);
      } else {
        progress = item.completed ? 100 : 0;
      }

      // Check if goal is fully completed
      const isCompleted = totalSub > 0 ? (completedSub === totalSub) : item.completed;

      // Card Element
      const card = document.createElement('div');
      card.className = 'bucket-card glass';
      if (isCompleted) card.style.borderColor = 'var(--success)';

      // Header: Category & Edit Button
      const cardHeader = document.createElement('div');
      cardHeader.className = 'bucket-card-header';
      
      const tag = document.createElement('span');
      tag.className = 'bucket-category-tag';
      tag.textContent = item.category;
      
      const editBtn = document.createElement('button');
      editBtn.className = 'delete-btn';
      editBtn.style.color = 'var(--text-muted)';
      editBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
        </svg>
      `;
      editBtn.title = "Edit goal settings";
      editBtn.addEventListener('click', () => {
        openModal(item.id);
      });

      cardHeader.appendChild(tag);
      cardHeader.appendChild(editBtn);
      card.appendChild(cardHeader);

      // Title
      const title = document.createElement('h3');
      title.className = 'bucket-card-title';
      title.textContent = item.title;
      card.appendChild(title);

      // Target Date
      if (item.targetDate) {
        const dateEl = document.createElement('div');
        dateEl.className = 'bucket-card-date';
        dateEl.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Target: ${item.targetDate}</span>
        `;
        card.appendChild(dateEl);
      }

      // Checklist of subtasks inside the card for quick access!
      if (totalSub > 0) {
        const subtasksChecklist = document.createElement('div');
        subtasksChecklist.style.display = 'flex';
        subtasksChecklist.style.flexDirection = 'column';
        subtasksChecklist.style.gap = '6px';
        subtasksChecklist.style.margin = '0.5rem 0';
        subtasksChecklist.style.maxHeight = '120px';
        subtasksChecklist.style.overflowY = 'auto';

        item.subtasks.forEach(sub => {
          const itemWrap = document.createElement('div');
          itemWrap.className = 'cell-task-item';
          if (sub.completed) itemWrap.classList.add('completed');

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'cell-checkbox';
          checkbox.checked = sub.completed;
          checkbox.addEventListener('change', () => {
            toggleSubtaskDirectly(item.id, sub.id, checkbox.checked);
          });

          const label = document.createElement('label');
          label.textContent = sub.text;
          label.title = sub.text;
          label.style.fontSize = '0.8rem';
          label.style.maxWidth = '100%';
          label.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
            toggleSubtaskDirectly(item.id, sub.id, checkbox.checked);
          });

          itemWrap.appendChild(checkbox);
          itemWrap.appendChild(label);
          subtasksChecklist.appendChild(itemWrap);
        });

        card.appendChild(subtasksChecklist);
      } else {
        // Render simple checkbox for subtask-free goals
        const checkWrap = document.createElement('div');
        checkWrap.className = 'cell-task-item';
        if (item.completed) checkWrap.classList.add('completed');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'cell-checkbox';
        checkbox.checked = item.completed || false;
        checkbox.addEventListener('change', () => {
          toggleGoalDirectly(item.id, checkbox.checked);
        });

        const label = document.createElement('label');
        label.textContent = "Mark Goal Completed";
        label.style.fontSize = '0.8rem';
        label.addEventListener('click', () => {
          checkbox.checked = !checkbox.checked;
          toggleGoalDirectly(item.id, checkbox.checked);
        });

        checkWrap.appendChild(checkbox);
        checkWrap.appendChild(label);
        card.appendChild(checkWrap);
      }

      // Progress Bar
      const progressSec = document.createElement('div');
      progressSec.className = 'bucket-progress-section';
      progressSec.innerHTML = `
        <div class="bucket-progress-header">
          <span>Progress</span>
          <span>${progress}%</span>
        </div>
        <div class="bucket-progress-bar-bg">
          <div class="bucket-progress-bar-fill" style="width: ${progress}%"></div>
        </div>
      `;
      card.appendChild(progressSec);

      // Card Footer with Delete Option
      const footer = document.createElement('div');
      footer.className = 'bucket-card-footer';
      
      const delGoal = document.createElement('button');
      delGoal.className = 'delete-btn';
      delGoal.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px;">
          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      `;
      delGoal.addEventListener('click', () => {
        if (confirm(`Remove "${item.title}" from your bucket list?`)) {
          deleteGoal(item.id);
        }
      });
      footer.appendChild(delGoal);
      card.appendChild(footer);

      bucketGrid.appendChild(card);
    });
  }

  // Toggle goal status directly for subtask-free goals
  function toggleGoalDirectly(itemId, isChecked) {
    const items = store.getBucketItems();
    const updated = items.map(item => {
      if (item.id === itemId) {
        return { ...item, completed: isChecked };
      }
      return item;
    });
    store.saveBucketItems(updated);
    renderGoals();
  }

  // Toggle subtask status directly on the card
  function toggleSubtaskDirectly(itemId, subtaskId, isChecked) {
    const items = store.getBucketItems();
    const updated = items.map(item => {
      if (item.id === itemId) {
        const subtasks = item.subtasks.map(s => {
          if (s.id === subtaskId) {
            return { ...s, completed: isChecked };
          }
          return s;
        });
        
        // Auto check completed status
        const allCompleted = subtasks.every(s => s.completed);
        return { ...item, subtasks, completed: allCompleted };
      }
      return item;
    });
    store.saveBucketItems(updated);
    renderGoals();
  }

  // Delete Goal
  function deleteGoal(itemId) {
    const items = store.getBucketItems();
    const filtered = items.filter(item => item.id !== itemId);
    store.saveBucketItems(filtered);
    renderGoals();
  }

  // Modal Subtasks Render
  function renderModalSubtasks() {
    if (!modalSubtaskListEl) return;
    modalSubtaskListEl.innerHTML = '';
    
    if (tempSubtasks.length === 0) {
      modalSubtaskListEl.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 0.5rem 0;">No subtasks created.</p>`;
      return;
    }

    tempSubtasks.forEach((sub, idx) => {
      const row = document.createElement('div');
      row.className = 'modal-subtask-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'cell-checkbox';
      checkbox.checked = sub.completed;
      checkbox.addEventListener('change', () => {
        tempSubtasks[idx].completed = checkbox.checked;
      });
      
      const lbl = document.createElement('label');
      lbl.textContent = sub.text;
      lbl.style.fontSize = '0.85rem';
      
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px;">
          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      `;
      delBtn.addEventListener('click', (e) => {
        e.preventDefault();
        tempSubtasks.splice(idx, 1);
        renderModalSubtasks();
      });

      row.appendChild(checkbox);
      row.appendChild(lbl);
      row.appendChild(delBtn);
      modalSubtaskListEl.appendChild(row);
    });
  }

  // Add Subtask within modal
  function addSubtaskInModal() {
    if (!inputNewSubtask) return;
    const txt = inputNewSubtask.value.trim();
    if (!txt) return;

    tempSubtasks.push({
      id: Date.now() + Math.random(), // Unique temp ID
      text: txt,
      completed: false
    });
    
    inputNewSubtask.value = '';
    renderModalSubtasks();
  }

  // Open Modal to Add or Edit
  function openModal(itemId = null) {
    editingItemId = itemId;
    tempSubtasks = [];
    
    if (bucketModal) {
      bucketModal.classList.add('active');
    }
    
    if (itemId) {
      // Edit mode
      if (modalTitle) modalTitle.textContent = "Edit Bucket Goal";
      const items = store.getBucketItems();
      const item = items.find(i => i.id === itemId);
      
      if (item) {
        if (inputGoalTitle) inputGoalTitle.value = item.title;
        if (selectCategory) selectCategory.value = item.category;
        if (inputTargetDate) inputTargetDate.value = item.targetDate || '';
        tempSubtasks = item.subtasks ? JSON.parse(JSON.stringify(item.subtasks)) : []; // Deep copy
      }
    } else {
      // Add mode
      if (modalTitle) modalTitle.textContent = "Add Life Goal";
      if (inputGoalTitle) inputGoalTitle.value = '';
      if (selectCategory) selectCategory.value = 'Growth';
      if (inputTargetDate) inputTargetDate.value = '';
    }
    
    renderModalSubtasks();
  }

  // Save Goal Button
  function saveGoal(e) {
    e.preventDefault();
    
    const title = inputGoalTitle.value.trim();
    const category = selectCategory.value;
    const targetDate = inputTargetDate.value;
    
    if (!title) {
      alert("Please specify a goal title.");
      return;
    }

    const items = store.getBucketItems();
    
    if (editingItemId) {
      // Edit save
      const allCompleted = tempSubtasks.length > 0 ? tempSubtasks.every(s => s.completed) : false;
      const updated = items.map(item => {
        if (item.id === editingItemId) {
          return {
            ...item,
            title,
            category,
            targetDate,
            subtasks: tempSubtasks,
            completed: tempSubtasks.length > 0 ? allCompleted : item.completed
          };
        }
        return item;
      });
      store.saveBucketItems(updated);
    } else {
      // Add save
      const newGoal = {
        id: Date.now(),
        title,
        category,
        targetDate,
        subtasks: tempSubtasks,
        completed: false
      };
      items.push(newGoal);
      store.saveBucketItems(items);
    }

    closeModal();
    renderGoals();
  }

  // Close Modal
  function closeModal() {
    if (bucketModal) bucketModal.classList.remove('active');
    editingItemId = null;
    tempSubtasks = [];
  }

  // Add event listeners
  if (btnAddGoal) {
    btnAddGoal.addEventListener('click', () => openModal(null));
  }
  
  if (bucketModalClose) {
    bucketModalClose.addEventListener('click', closeModal);
  }
  
  if (bucketModal) {
    bucketModal.addEventListener('click', (e) => {
      if (e.target === bucketModal) closeModal();
    });
  }

  if (btnAddSubtask) {
    btnAddSubtask.addEventListener('click', (e) => {
      e.preventDefault();
      addSubtaskInModal();
    });
  }
  
  if (inputNewSubtask) {
    inputNewSubtask.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSubtaskInModal();
      }
    });
  }

  if (btnSaveGoal) {
    btnSaveGoal.addEventListener('click', saveGoal);
  }

  // Subscribe to external store modifications (resets, etc.)
  const unsubscribe = store.subscribe('bucketChanged', renderGoals);

  // Initial draw
  renderFilters();
  renderGoals();

  return unsubscribe;
}

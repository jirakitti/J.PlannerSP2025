const STORAGE_KEY = "personal-os-state-v1";
const SUPABASE_TABLE = "user_app_state";
const todayKey = dateKey(new Date());
const targetDate = new Date("2026-12-22T00:00:00");
let selectedCalendarDate = todayKey;
let visibleCalendarMonth = new Date();
visibleCalendarMonth.setDate(1);
let supabaseClient = null;
let currentUser = null;
let remoteSaveTimer = null;
let isApplyingRemoteState = false;
let supabaseUnavailableReason = "";

const seedState = {
  lastDate: todayKey,
  history: {},
  routines: [
    { id: crypto.randomUUID(), title: "90-minute deep work block", done: false },
    { id: crypto.randomUUID(), title: "Active recall drill", done: false },
    { id: crypto.randomUUID(), title: "Cognitive warmup and planning", done: false }
  ],
  tasks: [
    { id: crypto.randomUUID(), title: "Review learning backlog", done: false },
    { id: crypto.randomUUID(), title: "Ship one visible improvement", done: false }
  ],
  habits: [
    { id: crypto.randomUUID(), title: "Sleep before target window", category: "Recovery", completions: {} },
    { id: crypto.randomUUID(), title: "Train body", category: "Body", completions: {} },
    { id: crypto.randomUUID(), title: "Read or study", category: "Skill", completions: {} }
  ],
  goals: [
    {
      id: crypto.randomUUID(),
      title: "Build elite technical leverage",
      area: "Career",
      targetDate: offsetDate(120),
      milestones: [
        { id: crypto.randomUUID(), title: "Define skill map", done: true },
        { id: crypto.randomUUID(), title: "Complete first portfolio project", done: false },
        { id: crypto.randomUUID(), title: "Publish weekly progress review", done: false }
      ]
    },
    {
      id: crypto.randomUUID(),
      title: "Create a resilient wealth system",
      area: "Wealth",
      targetDate: offsetDate(240),
      milestones: [
        { id: crypto.randomUUID(), title: "Audit monthly cash flow", done: false },
        { id: crypto.randomUUID(), title: "Automate investing rhythm", done: false }
      ]
    }
  ],
  journal: "",
  dayNotes: {},
  dayTasks: {}
};

let state = loadState();

const views = {
  dashboard: document.querySelector("#dashboard-view"),
  planner: document.querySelector("#planner-view"),
  habits: document.querySelector("#habits-view"),
  calendar: document.querySelector("#calendar-view"),
  vision: document.querySelector("#vision-view")
};

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const parsed = saved ? JSON.parse(saved) : structuredClone(seedState);
  return normalizeState(parsed);
}

function normalizeState(input) {
  const parsed = input && typeof input === "object" ? input : {};
  const normalized = {
    ...structuredClone(seedState),
    ...parsed
  };

  normalized.history ||= {};
  normalized.dayNotes ||= {};
  normalized.dayTasks ||= {};
  normalized.habits ||= [];
  normalized.goals ||= [];
  normalized.routines ||= [];
  normalized.tasks ||= [];

  if (normalized.lastDate !== todayKey) {
    const score = calculateScore(normalized).overall;
    if (normalized.lastDate) normalized.history[normalized.lastDate] = score;
    normalized.routines = normalized.routines.map((item) => ({ ...item, done: false }));
    normalized.tasks = normalized.tasks.map((item) => ({ ...item, done: false }));
    normalized.journal = "";
    normalized.lastDate = todayKey;
  }

  return normalized;
}

function saveState() {
  state.history[todayKey] = calculateScore(state).overall;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleRemoteSave();
}

function scheduleRemoteSave() {
  if (!currentUser || !supabaseClient || isApplyingRemoteState) return;
  window.clearTimeout(remoteSaveTimer);
  setSyncStatus("Syncing...");
  remoteSaveTimer = window.setTimeout(saveRemoteState, 700);
}

async function saveRemoteState() {
  if (!currentUser || !supabaseClient) return;

  const { error } = await supabaseClient
    .from(SUPABASE_TABLE)
    .upsert({
      id: currentUser.id,
      state,
      updated_at: new Date().toISOString()
    });

  setSyncStatus(error ? "Sync failed" : "Synced");
}

async function loadRemoteState() {
  if (!currentUser || !supabaseClient) return;
  setSyncStatus("Loading cloud data...");

  const { data, error } = await supabaseClient
    .from(SUPABASE_TABLE)
    .select("state")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    setSyncStatus("Cloud load failed");
    return;
  }

  if (data?.state) {
    isApplyingRemoteState = true;
    state = normalizeState(data.state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
    isApplyingRemoteState = false;
    setSyncStatus("Synced");
    return;
  }

  await saveRemoteState();
}

async function initSupabase() {
  const config = window.PERSONAL_OS_SUPABASE || {};
  if (!config.url || !config.anonKey) {
    supabaseUnavailableReason = "Add Supabase keys first";
    setSyncStatus(supabaseUnavailableReason);
    return;
  }

  if (!window.supabase) {
    supabaseUnavailableReason = "Supabase library did not load";
    setSyncStatus(supabaseUnavailableReason);
    return;
  }

  supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true
    }
  });

  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
  updateAccountUi();
  if (currentUser) await loadRemoteState();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    updateAccountUi();
    if (currentUser) await loadRemoteState();
  });
}

function setSyncStatus(message) {
  document.querySelector("#sync-status").textContent = message;
  document.querySelector("#mobile-sync-label").textContent = currentUser ? `${message} · Signed in` : message;
  document.querySelector("#journal-status").textContent = currentUser ? message : "Saved locally";
}

function updateAccountUi() {
  const signedIn = Boolean(currentUser);
  document.querySelector("#account-label").textContent = signedIn ? currentUser.email : "Not signed in";
  document.querySelector("#auth-form").hidden = signedIn;
  document.querySelector("#signout-btn").hidden = !signedIn;
  document.querySelector("#mobile-auth-open").setAttribute("aria-label", signedIn ? "Open sync account panel" : "Open sign in and sync panel");
  setSyncStatus(signedIn ? "Synced" : "Local mode");
}

function placeAuthPanel() {
  const accountPanel = document.querySelector(".account-panel");
  const sideRail = document.querySelector(".side-rail");
  const mobileButton = document.querySelector("#mobile-auth-open");
  const useMobileLayout = window.matchMedia("(max-width: 980px)").matches;

  if (useMobileLayout && accountPanel.previousElementSibling !== mobileButton) {
    mobileButton.insertAdjacentElement("afterend", accountPanel);
    return;
  }

  if (!useMobileLayout && accountPanel.parentElement !== sideRail) {
    sideRail.append(accountPanel);
    closeMobileAuth();
  }
}

function openMobileAuth() {
  placeAuthPanel();
  document.querySelector(".account-panel").classList.add("is-open");
  document.querySelector("#mobile-auth-backdrop").hidden = false;
  document.querySelector("#mobile-auth-backdrop").classList.add("is-open");
  document.querySelector("#mobile-auth-open").setAttribute("aria-expanded", "true");
  window.setTimeout(() => {
    const target = currentUser ? document.querySelector("#signout-btn") : document.querySelector("#auth-email");
    target?.focus();
  }, 0);
}

function closeMobileAuth() {
  document.querySelector(".account-panel").classList.remove("is-open");
  document.querySelector("#mobile-auth-backdrop").classList.remove("is-open");
  document.querySelector("#mobile-auth-backdrop").hidden = true;
  document.querySelector("#mobile-auth-open").setAttribute("aria-expanded", "false");
}

function calculateScore(source = state) {
  const routines = source.routines;
  const tasks = source.tasks;
  const habits = source.habits;
  const milestones = source.goals.flatMap((goal) => goal.milestones);

  const routineScore = ratio(routines.filter((item) => item.done).length, routines.length);
  const taskScore = ratio(tasks.filter((item) => item.done).length, tasks.length);
  const habitScore = ratio(habits.filter((habit) => habit.completions[todayKey]).length, habits.length);
  const milestoneScore = ratio(milestones.filter((item) => item.done).length, milestones.length);

  const overall = Math.round(
    routineScore * 0.34 +
    taskScore * 0.24 +
    habitScore * 0.26 +
    milestoneScore * 0.16
  );

  return {
    overall,
    routineScore,
    taskScore,
    habitScore,
    milestoneScore,
    routineDone: routines.filter((item) => item.done).length,
    taskDone: tasks.filter((item) => item.done).length,
    habitDone: habits.filter((habit) => habit.completions[todayKey]).length,
    milestoneDone: milestones.filter((item) => item.done).length,
    routineTotal: routines.length,
    taskTotal: tasks.length,
    habitTotal: habits.length,
    milestoneTotal: milestones.length
  };
}

function ratio(done, total) {
  return total ? Math.round((done / total) * 100) : 100;
}

function render() {
  saveState();
  renderCountdown();
  renderDashboard();
  renderPlanner();
  renderHabits();
  renderCalendar();
  renderGoals();
}

function renderCountdown() {
  const today = new Date(`${todayKey}T00:00:00`);
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.max(0, Math.ceil((targetDate - today) / msPerDay));
  const split = splitMonthsAndDays(today, targetDate);
  document.querySelector("#countdown-days").textContent = `${days}`;
  document.querySelector("#countdown-split").textContent = `${split.months} mo, ${split.days} days`;
}

function splitMonthsAndDays(from, to) {
  if (from >= to) return { months: 0, days: 0 };
  let cursor = new Date(from);
  let months = 0;

  while (true) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    if (next > to) break;
    cursor = next;
    months += 1;
  }

  const days = Math.ceil((to - cursor) / (24 * 60 * 60 * 1000));
  return { months, days };
}

function renderDashboard() {
  const score = calculateScore();
  document.querySelector("#current-date").textContent = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date());

  document.querySelector("#rail-score").textContent = `${score.overall}%`;
  document.querySelector("#battery-label").textContent = `${score.overall}%`;
  document.querySelector("#battery-fill").style.height = `${score.overall}%`;
  document.querySelector("#fixed-stat").textContent = `${score.routineDone}/${score.routineTotal}`;
  document.querySelector("#task-stat").textContent = `${score.taskDone}/${score.taskTotal}`;
  document.querySelector("#habit-stat").textContent = `${score.habitDone}/${score.habitTotal}`;
  document.querySelector("#milestone-stat").textContent = `${score.milestoneDone}/${score.milestoneTotal}`;
  document.querySelector("#coach-advice").textContent = coachMessage(score.overall);
  document.querySelector("#coach-mode").textContent = coachMode(score.overall);

  const openItems = [
    ...state.routines.filter((item) => !item.done).map((item) => ({ ...item, type: "Routine" })),
    ...state.tasks.filter((item) => !item.done).map((item) => ({ ...item, type: "Task" })),
    ...state.habits.filter((habit) => !habit.completions[todayKey]).map((habit) => ({ ...habit, type: "Habit" }))
  ].slice(0, 7);

  document.querySelector("#open-count").textContent = `${openItems.length} open`;
  const focusList = document.querySelector("#today-focus-list");
  focusList.innerHTML = openItems.length
    ? openItems.map((item) => `<div class="check-item"><span>${item.type}</span><strong class="item-title">${escapeHtml(item.title)}</strong></div>`).join("")
    : `<div class="empty-state">Today is clear. Add the next meaningful action.</div>`;

  renderWeeklyBars();
}

function coachMode(score) {
  if (score >= 90) return "Protect";
  if (score >= 70) return "Press";
  if (score >= 45) return "Stabilize";
  return "Recover";
}

function coachMessage(score) {
  if (score >= 90) return "High output day. Do not add noise. Finish clean, document the win, and protect recovery.";
  if (score >= 70) return "You have traction. Complete one remaining fixed routine before touching optional work.";
  if (score >= 45) return "Stabilize the day. Choose the smallest unfinished mandatory item and close it now.";
  if (score > 0) return "Avoid heroic planning. One routine, one task, one habit. That is enough to regain control.";
  return "Start with one mandatory routine. Momentum needs proof, not motivation.";
}

function renderWeeklyBars() {
  const container = document.querySelector("#weekly-bars");
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const values = days.map((date) => state.history[dateKey(date)] || 0);
  const avg = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

  document.querySelector("#momentum-score").textContent = `${avg}% avg`;
  container.innerHTML = days.map((date, index) => {
    const label = new Intl.DateTimeFormat("en", { weekday: "short" }).format(date).slice(0, 1);
    const value = values[index];
    return `<div class="day-bar"><div class="bar-track"><div class="bar-fill" style="height:${value}%"></div></div><span>${label}</span></div>`;
  }).join("");
}

function renderPlanner() {
  renderCheckList("#routine-list", state.routines, "routines");
  renderCheckList("#task-list", state.tasks, "tasks");
  document.querySelector("#journal-input").value = state.journal;
}

function renderCheckList(selector, collection, key) {
  const container = document.querySelector(selector);
  container.innerHTML = collection.length ? "" : `<div class="empty-state">No items yet.</div>`;

  collection.forEach((item) => {
    const node = document.querySelector("#item-template").content.firstElementChild.cloneNode(true);
    node.classList.toggle("is-done", item.done);
    const input = node.querySelector("input");
    input.checked = item.done;
    node.querySelector(".item-title").textContent = item.title;
    input.addEventListener("change", () => {
      item.done = input.checked;
      render();
    });
    node.querySelector(".delete-button").addEventListener("click", () => {
      state[key] = state[key].filter((candidate) => candidate.id !== item.id);
      render();
    });
    container.append(node);
  });
}

function renderHabits() {
  const container = document.querySelector("#habit-grid");
  container.innerHTML = state.habits.length ? "" : `<div class="empty-state">Add the first habit that matters.</div>`;

  state.habits.forEach((habit) => {
    const streak = currentStreak(habit);
    const article = document.createElement("article");
    article.className = "habit-card";
    article.innerHTML = `
      <div class="habit-head">
        <div>
          <h2>${escapeHtml(habit.title)}</h2>
          <div class="habit-meta">${habit.category} · ${streak} day streak</div>
        </div>
        <button class="delete-button" type="button" aria-label="Delete habit">×</button>
      </div>
      <div class="streak-line">${habitDays(habit)}</div>
      <button class="ghost-button habit-toggle" type="button">${habit.completions[todayKey] ? "Completed Today" : "Mark Today"}</button>
    `;
    article.querySelector(".delete-button").addEventListener("click", () => {
      state.habits = state.habits.filter((candidate) => candidate.id !== habit.id);
      render();
    });
    article.querySelector(".habit-toggle").addEventListener("click", () => {
      habit.completions[todayKey] = !habit.completions[todayKey];
      render();
    });
    container.append(article);
  });
}

function renderCalendar() {
  renderCalendarGrid();
  renderSelectedDay();
}

function renderCalendarGrid() {
  const container = document.querySelector("#calendar-grid");
  const monthLabel = document.querySelector("#calendar-month-label");
  const year = visibleCalendarMonth.getFullYear();
  const month = visibleCalendarMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  start.setDate(firstDay.getDate() - mondayOffset);

  monthLabel.textContent = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric"
  }).format(visibleCalendarMonth);

  container.innerHTML = "";
  Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    const score = habitScoreForDate(key);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.classList.toggle("is-muted", date.getMonth() !== month);
    button.classList.toggle("is-today", key === todayKey);
    button.classList.toggle("is-selected", key === selectedCalendarDate);
    button.innerHTML = `
      <div class="day-number-row">
        <strong>${date.getDate()}</strong>
        <span class="day-score-pill">${score}%</span>
      </div>
      <div class="calendar-mini-list">
        ${state.habits.slice(0, 4).map((habit) => `
          <span class="${habit.completions[key] ? "is-complete" : ""}">${habit.completions[key] ? "✓" : "□"} ${escapeHtml(habit.title)}</span>
        `).join("")}
      </div>
    `;
    button.addEventListener("click", () => {
      selectedCalendarDate = key;
      visibleCalendarMonth = new Date(date);
      visibleCalendarMonth.setDate(1);
      renderCalendar();
    });
    container.append(button);
  });
}

function renderSelectedDay() {
  const label = document.querySelector("#selected-day-label");
  const score = document.querySelector("#selected-day-score");
  const note = document.querySelector("#calendar-note");
  const habitList = document.querySelector("#calendar-habit-list");

  label.textContent = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${selectedCalendarDate}T00:00:00`));
  score.textContent = `${habitScoreForDate(selectedCalendarDate)}% habits`;
  note.value = state.dayNotes[selectedCalendarDate] || "";

  habitList.innerHTML = state.habits.length ? "" : `<div class="empty-state">Add habits on the Discipline page first.</div>`;
  state.habits.forEach((habit) => {
    const row = document.createElement("label");
    row.className = "day-check";
    row.innerHTML = `
      <span>${escapeHtml(habit.title)} <small>${escapeHtml(habit.category)}</small></span>
      <input type="checkbox" ${habit.completions[selectedCalendarDate] ? "checked" : ""} />
    `;
    row.querySelector("input").addEventListener("change", (event) => {
      habit.completions[selectedCalendarDate] = event.target.checked;
      if (!event.target.checked) delete habit.completions[selectedCalendarDate];
      render();
    });
    habitList.append(row);
  });

  renderCalendarTasks();
}

function renderCalendarTasks() {
  const list = document.querySelector("#calendar-task-list");
  const tasks = state.dayTasks[selectedCalendarDate] || [];
  list.innerHTML = tasks.length ? "" : `<div class="empty-state">No custom tasks for this date.</div>`;

  tasks.forEach((task) => {
    const node = document.querySelector("#item-template").content.firstElementChild.cloneNode(true);
    node.classList.toggle("is-done", task.done);
    const input = node.querySelector("input");
    input.checked = task.done;
    node.querySelector(".item-title").textContent = task.title;
    input.addEventListener("change", () => {
      task.done = input.checked;
      render();
    });
    node.querySelector(".delete-button").addEventListener("click", () => {
      state.dayTasks[selectedCalendarDate] = tasks.filter((candidate) => candidate.id !== task.id);
      render();
    });
    list.append(node);
  });
}

function habitScoreForDate(dateKey) {
  return ratio(state.habits.filter((habit) => habit.completions[dateKey]).length, state.habits.length);
}

function habitDays(habit) {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    const key = dateKey(date);
    const label = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date);
    return `<span class="streak-day ${habit.completions[key] ? "is-complete" : ""}" title="${label}"></span>`;
  }).join("");
}

function currentStreak(habit) {
  let streak = 0;
  const cursor = new Date();
  while (habit.completions[dateKey(cursor)]) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderGoals() {
  const container = document.querySelector("#goal-board");
  container.innerHTML = state.goals.length ? "" : `<div class="empty-state">Create a macro-goal with one concrete milestone.</div>`;

  state.goals.forEach((goal) => {
    const done = goal.milestones.filter((item) => item.done).length;
    const progress = ratio(done, goal.milestones.length);
    const article = document.createElement("article");
    article.className = "goal-card";
    article.innerHTML = `
      <span class="goal-area">${escapeHtml(goal.area)}</span>
      <div class="goal-head">
        <div>
          <h2>${escapeHtml(goal.title)}</h2>
          <div class="goal-meta">Target ${formatDate(goal.targetDate)} · ${done}/${goal.milestones.length} milestones</div>
        </div>
        <button class="delete-button" type="button" aria-label="Delete goal">×</button>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div class="milestone-list"></div>
      <form class="milestone-form">
        <input type="text" maxlength="70" placeholder="Add milestone..." aria-label="New milestone" />
        <button type="submit">Add</button>
      </form>
    `;

    const list = article.querySelector(".milestone-list");
    goal.milestones.forEach((milestone) => {
      const row = document.createElement("label");
      row.className = "milestone-row";
      row.innerHTML = `
        <input type="checkbox" ${milestone.done ? "checked" : ""} />
        <span>${escapeHtml(milestone.title)}</span>
        <button class="delete-button" type="button" aria-label="Delete milestone">×</button>
      `;
      row.querySelector("input").addEventListener("change", (event) => {
        milestone.done = event.target.checked;
        render();
      });
      row.querySelector("button").addEventListener("click", () => {
        goal.milestones = goal.milestones.filter((candidate) => candidate.id !== milestone.id);
        render();
      });
      list.append(row);
    });

    article.querySelector(".delete-button").addEventListener("click", () => {
      state.goals = state.goals.filter((candidate) => candidate.id !== goal.id);
      render();
    });

    article.querySelector(".milestone-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = event.currentTarget.querySelector("input");
      if (!input.value.trim()) return;
      goal.milestones.push({ id: crypto.randomUUID(), title: input.value.trim(), done: false });
      input.value = "";
      render();
    });

    container.append(article);
  });
}

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function addItem(collection, title) {
  if (!title.trim()) return;
  collection.push({ id: crypto.randomUUID(), title: title.trim(), done: false });
  render();
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    Object.values(views).forEach((view) => view.classList.remove("is-visible"));
    views[button.dataset.view].classList.add("is-visible");
  });
});

document.querySelector("#routine-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#routine-input");
  addItem(state.routines, input.value);
  input.value = "";
});

document.querySelector("#task-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#task-input");
  addItem(state.tasks, input.value);
  input.value = "";
});

document.querySelector("#habit-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#habit-input");
  if (!input.value.trim()) return;
  state.habits.push({
    id: crypto.randomUUID(),
    title: input.value.trim(),
    category: document.querySelector("#habit-category").value,
    completions: {}
  });
  input.value = "";
  render();
});

document.querySelector("#goal-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.querySelector("#goal-title");
  const milestone = document.querySelector("#goal-milestone");
  if (!title.value.trim()) return;
  state.goals.push({
    id: crypto.randomUUID(),
    title: title.value.trim(),
    area: document.querySelector("#goal-area").value,
    targetDate: document.querySelector("#goal-date").value,
    milestones: milestone.value.trim()
      ? [{ id: crypto.randomUUID(), title: milestone.value.trim(), done: false }]
      : []
  });
  title.value = "";
  milestone.value = "";
  render();
});

document.querySelector("#journal-input").addEventListener("input", (event) => {
  state.journal = event.target.value;
  saveState();
});

document.querySelector("#calendar-note").addEventListener("input", (event) => {
  state.dayNotes[selectedCalendarDate] = event.target.value;
  saveState();
});

document.querySelector("#calendar-task-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#calendar-task-input");
  if (!input.value.trim()) return;
  state.dayTasks[selectedCalendarDate] ||= [];
  state.dayTasks[selectedCalendarDate].push({
    id: crypto.randomUUID(),
    title: input.value.trim(),
    done: false
  });
  input.value = "";
  render();
});

document.querySelector("#prev-month-btn").addEventListener("click", () => {
  visibleCalendarMonth.setMonth(visibleCalendarMonth.getMonth() - 1);
  renderCalendar();
});

document.querySelector("#next-month-btn").addEventListener("click", () => {
  visibleCalendarMonth.setMonth(visibleCalendarMonth.getMonth() + 1);
  renderCalendar();
});

document.querySelector("#calendar-today-btn").addEventListener("click", () => {
  selectedCalendarDate = todayKey;
  visibleCalendarMonth = new Date();
  visibleCalendarMonth.setDate(1);
  renderCalendar();
});

document.querySelector("#reset-day-btn").addEventListener("click", () => {
  state.routines = state.routines.map((item) => ({ ...item, done: false }));
  state.tasks = state.tasks.map((item) => ({ ...item, done: false }));
  state.habits = state.habits.map((habit) => {
    const completions = { ...habit.completions };
    delete completions[todayKey];
    return { ...habit, completions };
  });
  render();
});

document.querySelector("#add-routine-btn").addEventListener("click", () => document.querySelector("#routine-input").focus());
document.querySelector("#add-task-btn").addEventListener("click", () => document.querySelector("#task-input").focus());
document.querySelector("#add-habit-btn").addEventListener("click", () => document.querySelector("#habit-input").focus());
document.querySelector("#new-goal-btn").addEventListener("click", () => document.querySelector("#goal-title").focus());
document.querySelector("#mobile-auth-open").addEventListener("click", openMobileAuth);
document.querySelector("#mobile-auth-close").addEventListener("click", closeMobileAuth);
document.querySelector("#mobile-auth-backdrop").addEventListener("click", closeMobileAuth);
window.addEventListener("resize", placeAuthPanel);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMobileAuth();
});

document.querySelector("#auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    setSyncStatus(supabaseUnavailableReason || "Supabase is not ready");
    return;
  }

  const email = document.querySelector("#auth-email").value.trim();
  const password = document.querySelector("#auth-password").value;
  if (!email || !password) return;

  setSyncStatus("Signing in...");
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  setSyncStatus(error ? error.message : "Signed in");
});

document.querySelector("#signup-btn").addEventListener("click", async () => {
  if (!supabaseClient) {
    setSyncStatus(supabaseUnavailableReason || "Supabase is not ready");
    return;
  }

  const email = document.querySelector("#auth-email").value.trim();
  const password = document.querySelector("#auth-password").value;
  if (!email || !password) return;

  setSyncStatus("Creating account...");
  const { error } = await supabaseClient.auth.signUp({ email, password });
  setSyncStatus(error ? error.message : "Check email or sign in");
});

document.querySelector("#signout-btn").addEventListener("click", async () => {
  if (!supabaseClient) return;
  await saveRemoteState();
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateAccountUi();
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      setSyncStatus("Offline install unavailable");
    });
  });
}

placeAuthPanel();
render();
initSupabase();

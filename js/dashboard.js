// Dashboard Module for J.Tracking
import { store, getLocalDateString, getProductivityStreak, MOTIVATIONAL_QUOTES } from './utils.js';

export function initDashboard() {
  // Select DOM Elements
  const batteryFill = document.querySelector('.battery-fill');
  const batteryPercentage = document.querySelector('.battery-percentage');
  const batteryStatusTag = document.querySelector('.battery-status-tag');
  
  const coachMessage = document.getElementById('coach-message');
  const coachAdvice = document.getElementById('coach-advice');
  
  const statTasks = document.getElementById('stat-tasks-today');
  const statHabits = document.getElementById('stat-habits-today');
  const statBucket = document.getElementById('stat-bucket-completed');
  
  const quoteText = document.getElementById('quote-text');
  const quoteAuthor = document.getElementById('quote-author');

  function renderDashboard() {
    const todayStr = getLocalDateString(0);
    const dailyData = store.getDailyData(todayStr);
    const fixedTasksList = store.getFixedTasks();
    const habits = store.getHabits();
    const bucketItems = store.getBucketItems();
    
    // 1. Calculate Tasks Score (50%)
    const totalFixedTasksCount = fixedTasksList.length;
    const completedFixedTasksCount = dailyData.fixedCompleted ? dailyData.fixedCompleted.length : 0;
    
    const customTasks = dailyData.custom || [];
    const totalCustomTasksCount = customTasks.length;
    const completedCustomTasksCount = customTasks.filter(t => t.completed).length;
    
    const totalTasks = totalFixedTasksCount + totalCustomTasksCount;
    const completedTasks = completedFixedTasksCount + completedCustomTasksCount;
    
    const tasksScore = totalTasks === 0 ? 50 : (completedTasks / totalTasks) * 50;
    
    // 2. Calculate Habits Score (30%)
    const habitsCheckedCount = habits.filter(h => h.history && h.history[todayStr]).length;
    const totalHabitsCount = habits.length;
    const habitsScore = totalHabitsCount === 0 ? 30 : (habitsCheckedCount / totalHabitsCount) * 30;
    
    // 3. Calculate Streak Score (20%)
    const currentStreak = getProductivityStreak();
    // Cap streak score at 10 days for max 20 points
    const streakScore = Math.min(currentStreak, 10) / 10 * 20;
    
    // Total Battery Score
    const totalScore = Math.round(tasksScore + habitsScore + streakScore);
    
    // 4. Update SVG Progress Circle
    // Circle radius r=90, circumference = 2 * PI * r = ~565.48
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (totalScore / 100) * circumference;
    
    if (batteryFill) {
      batteryFill.style.strokeDashoffset = offset;
    }
    if (batteryPercentage) {
      batteryPercentage.textContent = `${totalScore}%`;
    }
    
    // 5. Update Status Tag
    let statusText = "";
    let statusClass = "";
    if (totalScore >= 90) {
      statusText = "God Mode";
      statusClass = "success";
    } else if (totalScore >= 70) {
      statusText = "High Performer";
      statusClass = "accent";
    } else if (totalScore >= 40) {
      statusText = "Steady Pace";
      statusClass = "warning";
    } else {
      statusText = "Battery Low";
      statusClass = "danger";
    }
    
    if (batteryStatusTag) {
      batteryStatusTag.textContent = statusText;
      batteryStatusTag.style.borderColor = `var(--${statusClass})`;
      batteryStatusTag.style.color = `var(--${statusClass})`;
      batteryStatusTag.style.background = `hsla(var(--${statusClass}-rgb, 263, 70%, 65%), 0.1)`;
    }
    
    // 6. AI Coach Performance Analysis
    let coachMsgText = "";
    let coachAdviceText = "";
    
    if (totalScore >= 90) {
      coachMsgText = `⚡ GOD MODE ACTIVATED. You are operating at peak efficiency today. Your focus is absolute, and your execution is flawless. Maintain this state and dominate!`;
      coachAdviceText = `Coach Advice: Save this momentum. Document what went right today (sleep, routine, focus block) in your journal. You're setting the standard.`;
    } else if (totalScore >= 70) {
      coachMsgText = `🚀 HIGH PERFORMER. Excellent output today! You've checked off key tasks and kept your habits strong. Just a few pieces left to claim total victory.`;
      coachAdviceText = `Coach Advice: Review remaining checklist items. A quick 10-minute sprint is all that stands between you and a perfect 100% score.`;
    } else if (totalScore >= 40) {
      coachMsgText = `📈 STEADY PROGRESS. You are in the arena and making progress, but there's room to accelerate. Don't let micro-distractions break your flow.`;
      coachAdviceText = `Coach Advice: Choose one key habit or single custom task right now. Focus on it for 15 minutes. Action cures hesitation.`;
    } else {
      coachMsgText = `⚠️ BATTERY LOW. You're running on empty. But remember: the day isn't over, and a slow start doesn't define your finish. Let's restart.`;
      coachAdviceText = `Coach Advice: Pick the smallest task or habit on your list (like a 2-minute STM review or a journal entry). One tick will reactivate your momentum.`;
    }
    
    if (coachMessage) coachMessage.textContent = coachMsgText;
    if (coachAdvice) coachAdvice.textContent = coachAdviceText;
    
    // 7. Update Daily Stats Grid
    if (statTasks) {
      statTasks.textContent = `${completedTasks}/${totalTasks}`;
    }
    if (statHabits) {
      statHabits.textContent = `${habitsCheckedCount}/${totalHabitsCount}`;
    }
    if (statBucket) {
      const completedBuckets = bucketItems.filter(b => b.completed).length;
      statBucket.textContent = `${completedBuckets}/${bucketItems.length}`;
    }
  }

  // 8. Daily Motivational Quote
  function renderQuote() {
    // Pick a quote based on the day of the year
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const quoteIndex = dayOfYear % MOTIVATIONAL_QUOTES.length;
    const quote = MOTIVATIONAL_QUOTES[quoteIndex];
    
    if (quoteText) quoteText.textContent = `"${quote.text}"`;
    if (quoteAuthor) quoteAuthor.textContent = quote.author;
  }

  // Subscribe to store updates to keep UI synchronized in real-time
  const unsubscribe = store.subscribe('dataChanged', renderDashboard);

  // Initial render
  renderDashboard();
  renderQuote();

  // Return destructor for potential cleanups when switching pages
  return unsubscribe;
}

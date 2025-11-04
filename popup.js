// popup.js
// Handles UI for task timers and communicates with background.js

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Render tasks dynamically
function renderTasks(tasks) {
  const container = document.getElementById('taskList');
  container.innerHTML = '';

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `<p class="empty-text">No tasks yet</p>`;
    return;
  }

  tasks.forEach((task) => {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task-item';

    const name = document.createElement('span');
    name.textContent = task.name;
    name.className = 'task-name';

    const time = document.createElement('span');
    time.textContent = formatTime(task.time || 0);
    time.className = 'task-time';

    const btnGroup = document.createElement('div');
    btnGroup.className = 'task-buttons';

    // Start/Pause button
    const startBtn = document.createElement('button');
    startBtn.textContent = task.isRunning ? '⏸ Pause' : '▶ Start';
    startBtn.className = task.isRunning ? 'pause-btn' : 'start-btn';
    startBtn.addEventListener('click', () => {
      if (task.isRunning) {
        pauseTimer(task.id);
      } else {
        startTimer(task.id);
      }
    });

    // 🗑️ Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑 Delete';
    deleteBtn.className = 'delete-btn';
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Delete "${task.name}"?`)) {
        deleteTask(task.id);
      }
    });

    //Reset Button
    const resetButton = document.createElement('button');
    resetButton.textContent = '⟳ Reset';
    resetButton.className = 'reset-btn';
    resetButton.addEventListener('click', () => {
      resetTimer(task.id);
    })

    btnGroup.appendChild(startBtn);
    btnGroup.appendChild(deleteBtn);
    btnGroup.appendChild(resetButton);

    taskDiv.appendChild(name);
    taskDiv.appendChild(time);
    taskDiv.appendChild(btnGroup);
    container.appendChild(taskDiv);
  });
}

// Start a timer
function startTimer(taskId) {
  chrome.runtime.sendMessage({ action: 'startTimer', taskId }, (response) => {
    if (response?.success) refreshTasks();
  });
}

// Pause a timer
function pauseTimer(taskId) {
  chrome.runtime.sendMessage({ action: 'pauseTimer', taskId }, (response) => {
    if (response?.success) refreshTasks();
  });
}

function resetTimer(taskId) {
  chrome.runtime.sendMessage({ action: 'resetTimer', taskId }, (response) => {
    if (response?.success) refreshTasks();
  })
}

// Add a new task
function addTask(name) {
  if (!name.trim()) return;

  chrome.runtime.sendMessage({ action: 'addTask', name }, (response) => {
    if (response?.success) refreshTasks();
  });
}

// 🗑 Delete task
function deleteTask(taskId) {
  chrome.runtime.sendMessage({ action: 'deleteTask', taskId }, (response) => {
    if (response?.success) refreshTasks();
  });
}

// Refresh the task list
function refreshTasks() {
  chrome.runtime.sendMessage({ action: 'getTasks' }, (response) => {
    if (response?.tasks) renderTasks(response.tasks);
  });

  chrome.runtime.sendMessage({ action: 'updateBadge' });
}

// -----------------------------
// UI Events
// -----------------------------
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('addTaskBtn');
  const input = document.getElementById('taskInput');

  addBtn.addEventListener('click', () => {
    addTask(input.value);
    input.value = '';
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTask(input.value);
      input.value = '';
    }
  });

  // Load tasks initially and auto-refresh every second
  refreshTasks();
  setInterval(refreshTasks, 1000);
});

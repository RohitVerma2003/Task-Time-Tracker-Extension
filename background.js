// background.js
// Handles background timer logic for all tasks in a modular way 💡

class Task {
  constructor({ id, name, time = 0, isRunning = false, startTime = null, baseTime = 0 }) {
    this.id = id;
    this.name = name;
    this.time = time;
    this.isRunning = isRunning;
    this.startTime = startTime;
    this.baseTime = baseTime;
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.startTime = Date.now();
      this.baseTime = this.time || 0;
    }
  }

  pause() {
    if (this.isRunning) {
      this.isRunning = false;
      this.startTime = null;
    }
  }

  updateTime() {
    if (this.isRunning && this.startTime) {
      const now = Date.now();
      const elapsed = Math.floor((now - this.startTime) / 1000);
      this.time = this.baseTime + elapsed;
    }
  }

  reset() {
    this.time = 0;
    this.baseTime = 0;
    this.isRunning = false;
    this.startTime = null;
  }
}

class TaskManager {
  constructor() {
    this.tasks = [];
    this.totalTime = 0;
  }

  async loadTasks() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['tasks'], (result) => {
        const rawTasks = result.tasks || [];
        this.tasks = rawTasks.map((t) => new Task(t));
        resolve(this.tasks);
      });
    });
  }

  saveTasks() {
    chrome.storage.local.set({ tasks: this.tasks });
  }

  addTask(name) {
    const newTask = new Task({
      id: Date.now().toString(),
      name,
      time: 0,
      isRunning: false,
      startTime: null,
      baseTime: 0,
    });
    this.tasks.push(newTask);
    this.saveTasks();
    this.updateBadge();
    return newTask;
  }

  updateAllTimers() {
    this.totalTime = 0;
    let hasRunning = false;
    this.tasks.forEach((task) => {
      task.updateTime();
      this.totalTime += task.time;
      if (task.isRunning) hasRunning = true;
    });
    console.log(this.totalTime);

    if (hasRunning) {
      this.saveTasks();
      this.updateBadge();
    }
  }

  updateBadge() {
    const runningCount = this.tasks.filter((t) => t.isRunning).length;
    if (runningCount > 0) {
      chrome.action.setBadgeText({ text: runningCount.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#2ecc71' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }

  startTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.start();
      this.saveTasks();
      this.updateBadge();
    }
  }

  pauseTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.pause();
      this.saveTasks();
      this.updateBadge();
    }
  }

  resetTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.reset();
      this.saveTasks();
      this.updateBadge();
    }
  }

  deleteTask(id) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.saveTasks();
    this.updateBadge();
  }

  getTasksWithUpdatedTimes() {
    const now = Date.now();
    this.tasks.forEach((task) => {
      if (task.isRunning && task.startTime) {
        const elapsed = Math.floor((now - task.startTime) / 1000);
        task.time = task.baseTime + elapsed;
      }
    });
    return this.tasks;
  }
}

const manager = new TaskManager();

// ⏰ Background timer update every second
chrome.alarms.create('updateTimers', { periodInMinutes: 1 / 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateTimers') manager.updateAllTimers();
});

// 💬 Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  manager.loadTasks().then(() => {
    switch (request.action) {
      case 'addTask':
        const newTask = manager.addTask(request.name);
        sendResponse({ success: true, task: newTask });
        break;
      case 'startTimer':
        manager.startTask(request.taskId);
        sendResponse({ success: true });
        break;
      case 'pauseTimer':
        manager.pauseTask(request.taskId);
        sendResponse({ success: true });
        break;
      case 'deleteTask':
        manager.deleteTask(request.taskId);
        sendResponse({ success: true });
        break;
      case 'updateBadge':
        manager.updateBadge();
        sendResponse({ success: true });
        break;
      case 'getTasks':
        sendResponse({ tasks: manager.getTasksWithUpdatedTimes() });
        break;
      case 'resetTimer':
        manager.resetTask(request.taskId);
        sendResponse({ success: true });
        break;
      case 'getTotalTime':
        sendResponse({success: true, totalTime: manager.totalTime});
    }
  });
  return true;
});

// 🧩 Initialize on install/startup
chrome.runtime.onInstalled.addListener(() => {
  manager.loadTasks().then(() => manager.updateBadge());
});
manager.loadTasks().then(() => manager.updateBadge());

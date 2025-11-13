// ---- STATE & STORAGE ----

const STORAGE_KEY = "byt_focusdesk_tasks";

let tasks = [];
let currentFilter = "all";

let timerInterval = null;
let timerMode = "work"; // "work" | "break"
let remainingSeconds = 25 * 60;

// ---- DOM ELEMENTS ----

const taskForm = document.getElementById("task-form");
const taskListEl = document.getElementById("task-list");
const filterButtons = document.querySelectorAll(".filter-btn");

const summaryTotalEl = document.getElementById("summary-total");
const summaryTodoEl = document.getElementById("summary-todo");
const summaryInProgressEl = document.getElementById("summary-in-progress");
const summaryDoneEl = document.getElementById("summary-done");

const timerDisplayEl = document.getElementById("timer-display");
const timerProgressBarEl = document.getElementById("timer-progress-bar");
const startBtn = document.getElementById("start-timer");
const pauseBtn = document.getElementById("pause-timer");
const resetBtn = document.getElementById("reset-timer");
const modeButtons = document.querySelectorAll(".mode-btn");

// ---- UTILITIES ----

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    tasks = JSON.parse(raw);
  } catch {
    tasks = [];
  }
}

function createTask({ title, description, priority, tag }) {
  const id = Date.now().toString();
  return {
    id,
    title: title.trim(),
    description: description.trim(),
    priority,
    tag: tag.trim(),
    status: "todo",
    createdAt: new Date().toISOString(),
  };
}

// ---- RENDERING ----

function renderTasks() {
  taskListEl.innerHTML = "";

  const filtered = tasks.filter((t) => {
    if (currentFilter === "all") return true;
    return t.status === currentFilter;
  });

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "task-item";
    empty.innerHTML = `<div class="task-desc">Keine Aufgaben in dieser Ansicht.</div>`;
    taskListEl.appendChild(empty);
    updateSummary();
    return;
  }

  filtered.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";

    // border left by priority
    if (task.priority === "high") {
      li.style.borderLeftColor = "#b91c1c";
    } else if (task.priority === "medium") {
      li.style.borderLeftColor = "#92400e";
    } else {
      li.style.borderLeftColor = "#16a34a";
    }

    li.innerHTML = `
      <div class="task-item-header">
        <span class="task-title">${escapeHtml(task.title)}</span>
        <div class="task-meta">
          ${
            task.tag
              ? `<span class="tag-badge">${escapeHtml(task.tag)}</span>`
              : ""
          }
          <span class="priority-pill ${
            task.priority === "medium"
              ? "priority-medium"
              : task.priority === "low"
              ? "priority-low"
              : ""
          }">
            ${
              task.priority === "high"
                ? "Hoch"
                : task.priority === "medium"
                ? "Mittel"
                : "Niedrig"
            }
          </span>
        </div>
      </div>
      ${
        task.description
          ? `<div class="task-desc">${escapeHtml(task.description)}</div>`
          : ""
      }
      <div class="task-footer">
        <select class="status-select" data-id="${task.id}">
          <option value="todo" ${
            task.status === "todo" ? "selected" : ""
          }>To Do</option>
          <option value="in-progress" ${
            task.status === "in-progress" ? "selected" : ""
          }>In Bearbeitung</option>
          <option value="done" ${
            task.status === "done" ? "selected" : ""
          }>Erledigt</option>
        </select>
        <button class="delete-btn" data-id="${task.id}">Löschen</button>
      </div>
    `;

    taskListEl.appendChild(li);
  });

  updateSummary();
}

function updateSummary() {
  const total = tasks.length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  const inProgress = tasks.filter((t) => t.status === "in-progress").length;
  const done = tasks.filter((t) => t.status === "done").length;

  summaryTotalEl.textContent = total;
  summaryTodoEl.textContent = todo;
  summaryInProgressEl.textContent = inProgress;
  summaryDoneEl.textContent = done;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---- EVENT HANDLERS: TASKS ----

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(taskForm);
  const title = formData.get("title") || "";
  const description = formData.get("description") || "";
  const priority = formData.get("priority") || "medium";
  const tag = formData.get("tag") || "";

  if (!title.trim()) return;

  const newTask = createTask({ title, description, priority, tag });
  tasks.unshift(newTask); // neue Aufgaben oben
  saveTasks();
  renderTasks();

  taskForm.reset();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

taskListEl.addEventListener("change", (e) => {
  if (e.target.classList.contains("status-select")) {
    const id = e.target.dataset.id;
    const status = e.target.value;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.status = status;
    saveTasks();
    renderTasks();
  }
});

taskListEl.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const id = e.target.dataset.id;
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    renderTasks();
  }
});

// ---- TIMER LOGIC ----

function setMode(mode) {
  timerMode = mode;
  if (mode === "work") {
    remainingSeconds = 25 * 60;
  } else {
    remainingSeconds = 5 * 60;
  }
  updateTimerDisplay();
  updateProgressBar();
  modeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    remainingSeconds--;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      clearInterval(timerInterval);
      timerInterval = null;
      alert(
        timerMode === "work"
          ? "Arbeitsphase beendet – kurze Pause!"
          : "Pause beendet – zurück zur Arbeit!"
      );
    }
    updateTimerDisplay();
    updateProgressBar();
  }, 1000);
}

function pauseTimer() {
  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  pauseTimer();
  if (timerMode === "work") {
    remainingSeconds = 25 * 60;
  } else {
    remainingSeconds = 5 * 60;
  }
  updateTimerDisplay();
  updateProgressBar();
}

function updateTimerDisplay() {
  const m = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const s = String(remainingSeconds % 60).padStart(2, "0");
  timerDisplayEl.textContent = `${m}:${s}`;
}

function updateProgressBar() {
  const total = timerMode === "work" ? 25 * 60 : 5 * 60;
  const progress = 100 - (remainingSeconds / total) * 100;
  timerProgressBarEl.style.width = `${progress}%`;
}

// Timer events

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    setMode(mode);
  });
});

// ---- INIT ----

function init() {
  loadTasks();
  renderTasks();
  setMode("work");
}

init();

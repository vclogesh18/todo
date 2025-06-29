// Firebase setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCU45wbU1CpPsfLpzGGQ8BFMA-DFhWr6KU",
  authDomain: "todo-ad363.firebaseapp.com",
  projectId: "todo-ad363",
  storageBucket: "todo-ad363.firebasestorage.app",
  messagingSenderId: "1021653668231",
  appId: "1:1021653668231:web:6017812c4b464ad80b8322",
  measurementId: "G-Y8M0C7EDMZ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// App logic
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let dragStartIndex = null;

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function getTaskIndexById(id) {
  return tasks.findIndex(t => t.id === id);
}

function loadTasks() {
  const stored = localStorage.getItem("tasks");
  tasks = stored ? JSON.parse(stored) : [];
  tasks.forEach((task) => {
    if (!task.id) {
      task.id = Date.now() + Math.floor(Math.random() * 1000);
    }
  });
  saveTasks();
}

function renderTasks() {
  const list = document.getElementById("taskList");
  const searchTerm = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const filter = document.getElementById("statusFilter")?.value || "all";
  list.innerHTML = "";

  const today = new Date().toISOString().split("T")[0];

  let filteredTasks = tasks.filter(task => {
    const matchText = task.name.toLowerCase().includes(searchTerm);
    const matchStatus =
      filter === "all" ||
      (filter === "overdue" && !task.done && task.dueDate && task.dueDate < today) ||
      (filter === "pending" && !task.done && task.dueDate && task.dueDate > today) ||
      (filter === "done" && task.done);
    return matchText && matchStatus;
  });

  filteredTasks.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    return 0;
  });

  filteredTasks.forEach((task) => {
    const realIndex = tasks.indexOf(task);
    const overdue = !task.done && task.dueDate && task.dueDate < today;
    const styleClass = task.done ? "done" : overdue ? "overdue" : "";

    const li = document.createElement("li");
    li.setAttribute("draggable", "true");
    li.setAttribute("data-index", realIndex);
    li.innerHTML = `
      <div class="task-info ${styleClass}">
        <span>${task.done ? "✅ " : ""}<strong>${task.name}</strong></span>
        <small>${task.dueDate ? `Due: ${task.dueDate}` : ""}</small>
      </div>
      <div class="task-actions">
        <button class="done-btn">✅ Done</button>
        <button class="remove-btn">🗑️ Remove</button>
      </div>
    `;

    li.querySelector(".done-btn").addEventListener("click", () => markDone(task.id));
    li.querySelector(".remove-btn").addEventListener("click", () => removeTask(task.id));
    li.querySelector(".task-info").addEventListener("dblclick", () => enableDualEdit(li.querySelector(".task-info"), task.id));

    li.addEventListener("dragstart", handleDragStart);
    li.addEventListener("dragover", handleDragOver);
    li.addEventListener("drop", handleDrop);

    list.appendChild(li);
  });
}

function markDone(id) {
  const index = getTaskIndexById(id);
  if (index !== -1) {
    tasks[index].done = true;
    saveTasks();
    renderTasks();
  }
}

function removeTask(id) {
  const index = getTaskIndexById(id);
  if (index !== -1) {
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
  }
}

function enableDualEdit(container, id) {
  const index = getTaskIndexById(id);
  const task = tasks[index];
  container.innerHTML = `
    <div class="edit-wrapper" tabindex="-1">
      <input type="text" id="editName${index}" value="${task.name}" class="edit-input" />
      <input type="date" id="editDate${index}" value="${task.dueDate || ''}" class="inline-date" />
    </div>
  `;
  const wrapper = container.querySelector(".edit-wrapper");
  const nameInput = document.getElementById(`editName${index}`);
  const dateInput = document.getElementById(`editDate${index}`);

  nameInput.focus();

  const save = () => {
    const updatedName = nameInput.value.trim();
    const updatedDate = dateInput.value;
    if (updatedName) {
      task.name = updatedName;
      task.dueDate = updatedDate;
      saveTasks();
    }
    renderTasks();
  };

  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") renderTasks();
  });
  dateInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") renderTasks();
  });
  wrapper.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!wrapper.contains(document.activeElement)) save();
    }, 100);
  });
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
}

function exportTasks() {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tasks.json";
  a.click();
  URL.revokeObjectURL(url);
}

function openImportModal() {
  document.getElementById("importModal").style.display = "block";
}

function closeImportModal() {
  document.getElementById("importModal").style.display = "none";
  document.getElementById("importFile").value = "";
}

function handleImport() {
  const file = document.getElementById("importFile").files[0];
  if (!file) return alert("Please select a file first.");
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        tasks = imported;
        saveTasks();
        renderTasks();
        closeImportModal();
      } else {
        alert("Invalid JSON format");
      }
    } catch {
      alert("Error parsing the file");
    }
  };
  reader.readAsText(file);
}

function addTask() {
  const input = document.getElementById("taskInput");
  const dueInput = document.getElementById("dueDateInput");
  const name = input.value.trim();
  const dueDate = dueInput.value;
  if (name) {
    tasks.push({ id: Date.now(), name, dueDate, done: false });
    saveTasks();
    renderTasks();
    input.value = "";
    dueInput.value = "";
  }
}

function handleDragStart(e) {
  dragStartIndex = +e.target.getAttribute("data-index");
}
function handleDragOver(e) {
  e.preventDefault();
}
function handleDrop(e) {
  const dropIndex = +e.target.closest("li").getAttribute("data-index");
  if (dragStartIndex !== null && dropIndex !== dragStartIndex) {
    [tasks[dragStartIndex], tasks[dropIndex]] = [tasks[dropIndex], tasks[dragStartIndex]];
    saveTasks();
    renderTasks();
  }
  dragStartIndex = null;
}

// Auth functions
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert(err.message);
  }
}

async function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert(err.message);
  }
}

async function logout() {
  await signOut(auth);
}

// Initialize app
window.addEventListener("DOMContentLoaded", () => {
  // Restore dark mode
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
  }

  // Bind UI actions
  document.getElementById("loginBtn")?.addEventListener("click", login);
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
  
  document.getElementById("signupBtn")?.addEventListener("click", signup);
  document.getElementById("darkModeBtn")?.addEventListener("click", toggleDarkMode);
  document.getElementById("exportBtn")?.addEventListener("click", exportTasks);
  document.getElementById("importBtn")?.addEventListener("click", openImportModal);
  document.getElementById("addTaskBtn")?.addEventListener("click", addTask);
  document.getElementById("handleImportBtn")?.addEventListener("click", handleImport);
  document.getElementById("cancelImportBtn")?.addEventListener("click", closeImportModal);
  document.getElementById("searchInput")?.addEventListener("input", renderTasks);       // 👈 search binding
  document.getElementById("statusFilter")?.addEventListener("change", renderTasks);     // 👈 filter binding

  // Auth check
  onAuthStateChanged(auth, (user) => {
    const app = document.getElementById("app");
    const authSection = document.getElementById("auth-section");
    if (user) {
      authSection.style.display = "none";
      app.style.display = "block";
      loadTasks();
      renderTasks();
    } else {
      authSection.style.display = "block";
      app.style.display = "none";
    }
  });

  // Close modals on outside click
  window.onclick = function (event) {
    if (event.target === document.getElementById("importModal")) {
      closeImportModal();
    }
  };
});
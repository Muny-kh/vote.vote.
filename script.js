(function () {
  "use strict";

  const STORAGE_KEYS = {
    foods: "class_food_vote_foods",
    voted: "class_food_vote_voted",
    deadline: "class_food_vote_deadline",
    password: "class_food_vote_password"
  };

  const DEFAULT_PASSWORD = "Admin@2026";

  let foods = readJSON(STORAGE_KEYS.foods, []);
  let hasVoted = localStorage.getItem(STORAGE_KEYS.voted) === "true";
  let deadline = localStorage.getItem(STORAGE_KEYS.deadline) || "";
  let password = localStorage.getItem(STORAGE_KEYS.password) || DEFAULT_PASSWORD;
  let editingId = null;

  const elements = {
    countdownText: document.getElementById("countdownText"),
    voteStatusPill: document.getElementById("voteStatusPill"),
    closedBanner: document.getElementById("closedBanner"),
    foodGrid: document.getElementById("foodGrid"),
    emptyState: document.getElementById("emptyState"),
    totalFoods: document.getElementById("totalFoods"),
    totalVotes: document.getElementById("totalVotes"),
    topFood: document.getElementById("topFood"),
    rankingBody: document.getElementById("rankingBody"),
    adminFab: document.getElementById("adminFab"),
    loginModal: document.getElementById("loginModal"),
    loginForm: document.getElementById("loginForm"),
    loginPassword: document.getElementById("loginPassword"),
    loginError: document.getElementById("loginError"),
    closeModal: document.getElementById("closeModal"),
    adminPanel: document.getElementById("adminPanel"),
    logoutBtn: document.getElementById("logoutBtn"),
    addFoodForm: document.getElementById("addFoodForm"),
    foodNameInput: document.getElementById("foodNameInput"),
    foodImageInput: document.getElementById("foodImageInput"),
    addFoodError: document.getElementById("addFoodError"),
    deadlineForm: document.getElementById("deadlineForm"),
    deadlineDate: document.getElementById("deadlineDate"),
    deadlineTime: document.getElementById("deadlineTime"),
    currentDeadline: document.getElementById("currentDeadline"),
    passwordForm: document.getElementById("passwordForm"),
    oldPassword: document.getElementById("oldPassword"),
    newPassword: document.getElementById("newPassword"),
    passwordError: document.getElementById("passwordError"),
    resetVotesBtn: document.getElementById("resetVotesBtn"),
    adminFoodList: document.getElementById("adminFoodList"),
    toastArea: document.getElementById("toastArea"),
    spinnerOverlay: document.getElementById("spinnerOverlay")
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    normalizeStoredState();
    attachEvents();
    hydrateDeadlineInputs();
    renderAll();
    setInterval(updateCountdown, 1000);
  }

  function attachEvents() {
    document.querySelectorAll(".ripple").forEach((button) => {
      button.addEventListener("click", createRipple);
    });

    elements.adminFab.addEventListener("click", openLoginModal);
    elements.closeModal.addEventListener("click", closeLoginModal);
    elements.loginModal.addEventListener("click", (event) => {
      if (event.target === elements.loginModal) closeLoginModal();
    });

    elements.loginForm.addEventListener("submit", handleLogin);
    elements.logoutBtn.addEventListener("click", handleLogout);
    elements.addFoodForm.addEventListener("submit", handleAddFood);
    elements.deadlineForm.addEventListener("submit", handleDeadline);
    elements.passwordForm.addEventListener("submit", handlePasswordChange);
    elements.resetVotesBtn.addEventListener("click", handleResetVotes);

    elements.foodGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-vote-id]");
      if (!button) return;
      voteForFood(button.dataset.voteId);
    });

    elements.adminFoodList.addEventListener("click", handleAdminFoodClick);
    elements.adminFoodList.addEventListener("submit", handleEditSubmit);
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveFoods() {
    localStorage.setItem(STORAGE_KEYS.foods, JSON.stringify(foods));
  }

  function normalizeStoredState() {
    if (!Array.isArray(foods)) foods = [];
    foods = foods.map((food) => ({
      id: food.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: String(food.name || "").trim(),
      image: String(food.image || "").trim(),
      votes: Number.isFinite(Number(food.votes)) ? Number(food.votes) : 0
    })).filter((food) => food.name && food.image);

    if (!foods.length && hasVoted) {
      hasVoted = false;
      localStorage.removeItem(STORAGE_KEYS.voted);
    }

    saveFoods();
  }

  function renderAll() {
    renderFoods();
    renderDashboard();
    renderAdminFoods();
    updateCountdown();
  }

  function isDeadlinePassed() {
    return Boolean(deadline) && Date.now() >= new Date(deadline).getTime();
  }

  function renderFoods() {
    const closed = isDeadlinePassed();
    const hasFoods = foods.length > 0;

    elements.emptyState.classList.toggle("hidden", hasFoods);
    elements.foodGrid.classList.toggle("hidden", !hasFoods);
    elements.closedBanner.classList.toggle("hidden", !closed);

    if (!hasFoods) {
      elements.voteStatusPill.textContent = "កំពុងរង់ចាំមុខម្ហូប";
      elements.foodGrid.innerHTML = "";
      return;
    }

    elements.voteStatusPill.textContent = closed
      ? "ការបោះឆ្នោតត្រូវបានបិទ"
      : hasVoted
        ? "អ្នកបានបោះឆ្នោតរួចហើយ ✅"
        : "បើកឱ្យបោះឆ្នោត";

    elements.foodGrid.innerHTML = foods.map((food) => {
      const disabled = hasVoted || closed;
      const label = closed
        ? "ការបោះឆ្នោតត្រូវបានបិទ"
        : hasVoted
          ? "អ្នកបានបោះឆ្នោតរួចហើយ ✅"
          : "បោះឆ្នោត 💖";

      return `
        <article class="food-card fade-in" data-card-id="${escapeHTML(food.id)}">
          <div class="food-image-wrap">
            <img src="${escapeHTML(food.image)}" alt="${escapeHTML(food.name)}" loading="lazy" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 800 450%22%3E%3Crect width=%22800%22 height=%22450%22 fill=%22%23dffdf4%22/%3E%3Ctext x=%22400%22 y=%22235%22 text-anchor=%22middle%22 font-size=%2256%22%3E%F0%9F%8D%BD%EF%B8%8F%3C/text%3E%3C/svg%3E';">
          </div>
          <div class="food-content">
            <h3>${escapeHTML(food.name)}</h3>
            <div class="vote-count">
              <span>សន្លឹកឆ្នោត</span>
              <strong>${food.votes}</strong>
            </div>
            <button class="vote-button ripple" type="button" data-vote-id="${escapeHTML(food.id)}" ${disabled ? "disabled" : ""}>${label}</button>
          </div>
        </article>
      `;
    }).join("");

    elements.foodGrid.querySelectorAll(".ripple").forEach((button) => {
      button.addEventListener("click", createRipple);
    });
  }

  function voteForFood(id) {
    if (hasVoted) {
      showToast("អ្នកបានបោះឆ្នោតរួចហើយ ✅", "error");
      return;
    }

    if (isDeadlinePassed()) {
      showToast("ការបោះឆ្នោតត្រូវបានបិទ", "error");
      return;
    }

    const food = foods.find((item) => item.id === id);
    if (!food) return;

    food.votes += 1;
    hasVoted = true;
    localStorage.setItem(STORAGE_KEYS.voted, "true");
    saveFoods();
    renderAll();
    animateVote(id);
    showToast("បោះឆ្នោតបានជោគជ័យ ✅", "success");
  }

  function animateVote(id) {
    const card = Array.from(elements.foodGrid.querySelectorAll("[data-card-id]"))
      .find((item) => item.dataset.cardId === id);
    if (!card) return;

    card.classList.add("pop");
    const heart = document.createElement("div");
    heart.className = "heart-burst";
    heart.textContent = "💖";
    card.appendChild(heart);

    setTimeout(() => {
      card.classList.remove("pop");
      heart.remove();
    }, 950);
  }

  function renderDashboard() {
    const ranked = [...foods].sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, "km"));
    const totalVotes = foods.reduce((sum, food) => sum + food.votes, 0);
    const topFood = ranked[0] && ranked[0].votes > 0 ? ranked[0].name : "0";

    elements.totalFoods.textContent = String(foods.length);
    elements.totalVotes.textContent = String(totalVotes);
    elements.topFood.textContent = topFood;

    if (!ranked.length) {
      elements.rankingBody.innerHTML = `
        <tr>
          <td colspan="3">មិនទាន់មានមុខម្ហូប</td>
        </tr>
      `;
      return;
    }

    elements.rankingBody.innerHTML = ranked.map((food, index) => `
      <tr class="${index === 0 ? "top-row" : ""}">
        <td>${index === 0 ? "🏆 " : ""}${index + 1}</td>
        <td>${escapeHTML(food.name)}</td>
        <td>${food.votes}</td>
      </tr>
    `).join("");
  }

  function openLoginModal() {
    elements.loginModal.classList.remove("hidden");
    elements.loginPassword.value = "";
    elements.loginError.textContent = "";
    setTimeout(() => elements.loginPassword.focus(), 80);
  }

  function closeLoginModal() {
    elements.loginModal.classList.add("hidden");
  }

  function handleLogin(event) {
    event.preventDefault();
    const inputPassword = elements.loginPassword.value;

    if (inputPassword !== password) {
      elements.loginError.textContent = "ពាក្យសម្ងាត់មិនត្រឹមត្រូវ";
      showToast("ពាក្យសម្ងាត់មិនត្រឹមត្រូវ", "error");
      return;
    }

    showSpinner();
    setTimeout(() => {
      hideSpinner();
      closeLoginModal();
      elements.adminPanel.classList.remove("hidden");
      elements.adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("ចូលគ្រប់គ្រងបានជោគជ័យ ✅", "success");
    }, 350);
  }

  function handleLogout() {
    elements.adminPanel.classList.add("hidden");
    editingId = null;
    renderAdminFoods();
    showToast("បានចាកចេញពីផ្ទាំងគ្រប់គ្រង", "success");
  }

  function handleAddFood(event) {
    event.preventDefault();
    const name = elements.foodNameInput.value.trim();
    const image = elements.foodImageInput.value.trim();

    elements.addFoodError.textContent = "";

    if (!name) {
      elements.addFoodError.textContent = "សូមបញ្ចូលឈ្មោះមុខម្ហូប";
      return;
    }

    if (!image) {
      elements.addFoodError.textContent = "សូមបញ្ចូលតំណរូបភាព";
      return;
    }

    if (!isValidUrl(image)) {
      elements.addFoodError.textContent = "សូមបញ្ចូលតំណរូបភាពឱ្យត្រឹមត្រូវ";
      return;
    }

    if (!foods.length) {
      hasVoted = false;
      localStorage.removeItem(STORAGE_KEYS.voted);
    }

    foods.push({
      id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      image,
      votes: 0
    });

    saveFoods();
    elements.addFoodForm.reset();
    renderAll();
    showToast("បានបន្ថែមមុខម្ហូបថ្មី ✅", "success");
  }

  function renderAdminFoods() {
    if (!foods.length) {
      elements.adminFoodList.innerHTML = `
        <div class="empty-state">
          <div class="empty-plate" aria-hidden="true"><span></span><i></i></div>
          <h3>មិនទាន់មានមុខម្ហូបសម្រាប់បោះឆ្នោតនៅឡើយទេ</h3>
        </div>
      `;
      return;
    }

    elements.adminFoodList.innerHTML = foods.map((food) => {
      const isEditing = editingId === food.id;
      return `
        <article class="admin-food-card fade-in" data-admin-id="${escapeHTML(food.id)}">
          <img src="${escapeHTML(food.image)}" alt="${escapeHTML(food.name)}" loading="lazy">
          <h4>${escapeHTML(food.name)}</h4>
          <p class="current-deadline">សន្លឹកឆ្នោត៖ ${food.votes}</p>
          ${isEditing ? renderEditForm(food) : renderAdminActions(food)}
        </article>
      `;
    }).join("");

    elements.adminFoodList.querySelectorAll(".ripple").forEach((button) => {
      button.addEventListener("click", createRipple);
    });
  }

  function renderAdminActions(food) {
    return `
      <div class="admin-actions">
        <button class="edit-button ripple" type="button" data-edit-id="${escapeHTML(food.id)}">✏️ កែប្រែ</button>
        <button class="danger-button ripple" type="button" data-delete-id="${escapeHTML(food.id)}">🗑️ លុប</button>
      </div>
    `;
  }

  function renderEditForm(food) {
    return `
      <form class="edit-fields" data-edit-form="${escapeHTML(food.id)}">
        <label>
          <span>ឈ្មោះមុខម្ហូប</span>
          <input name="name" type="text" value="${escapeHTML(food.name)}">
        </label>
        <label>
          <span>តំណរូបភាព</span>
          <input name="image" type="url" value="${escapeHTML(food.image)}">
        </label>
        <div class="admin-actions">
          <button class="primary-button ripple" type="submit">រក្សាទុក</button>
          <button class="ghost-button ripple" type="button" data-cancel-edit="true">បោះបង់</button>
        </div>
      </form>
    `;
  }

  function handleAdminFoodClick(event) {
    const editButton = event.target.closest("[data-edit-id]");
    const deleteButton = event.target.closest("[data-delete-id]");
    const cancelButton = event.target.closest("[data-cancel-edit]");

    if (editButton) {
      editingId = editButton.dataset.editId;
      renderAdminFoods();
      return;
    }

    if (cancelButton) {
      editingId = null;
      renderAdminFoods();
      return;
    }

    if (deleteButton) {
      const id = deleteButton.dataset.deleteId;
      if (!confirm("តើអ្នកពិតជាចង់លុបមែនទេ?")) return;
      foods = foods.filter((food) => food.id !== id);
      if (!foods.length) {
        hasVoted = false;
        localStorage.removeItem(STORAGE_KEYS.voted);
      }
      if (editingId === id) editingId = null;
      saveFoods();
      renderAll();
      showToast("បានលុបមុខម្ហូប ✅", "success");
    }
  }

  function handleEditSubmit(event) {
    const form = event.target.closest("[data-edit-form]");
    if (!form) return;

    event.preventDefault();
    const id = form.dataset.editForm;
    const food = foods.find((item) => item.id === id);
    if (!food) return;

    const name = form.elements.name.value.trim();
    const image = form.elements.image.value.trim();

    if (!name) {
      showToast("សូមបញ្ចូលឈ្មោះមុខម្ហូប", "error");
      return;
    }

    if (!image || !isValidUrl(image)) {
      showToast("សូមបញ្ចូលតំណរូបភាពឱ្យត្រឹមត្រូវ", "error");
      return;
    }

    food.name = name;
    food.image = image;
    editingId = null;
    saveFoods();
    renderAll();
    showToast("បានកែប្រែដោយជោគជ័យ ✅", "success");
  }

  function handleDeadline(event) {
    event.preventDefault();
    const date = elements.deadlineDate.value;
    const time = elements.deadlineTime.value;

    if (!date || !time) {
      showToast("សូមជ្រើសថ្ងៃខែ និងម៉ោង", "error");
      return;
    }

    deadline = `${date}T${time}:00`;
    localStorage.setItem(STORAGE_KEYS.deadline, deadline);
    updateCountdown();
    renderFoods();
    showToast("បានរក្សាទុកពេលបញ្ចប់ ✅", "success");
  }

  function hydrateDeadlineInputs() {
    if (!deadline) return;
    const date = new Date(deadline);
    if (Number.isNaN(date.getTime())) return;
    elements.deadlineDate.value = deadline.slice(0, 10);
    elements.deadlineTime.value = deadline.slice(11, 16);
  }

  function updateCountdown() {
    if (!deadline) {
      elements.countdownText.textContent = "បច្ចុប្បន្នមិនទាន់កំណត់ពេលបញ្ចប់";
      elements.currentDeadline.textContent = "បច្ចុប្បន្នមិនទាន់កំណត់ពេលបញ្ចប់";
      return;
    }

    const target = new Date(deadline).getTime();
    if (Number.isNaN(target)) {
      elements.countdownText.textContent = "បច្ចុប្បន្នមិនទាន់កំណត់ពេលបញ្ចប់";
      elements.currentDeadline.textContent = "បច្ចុប្បន្នមិនទាន់កំណត់ពេលបញ្ចប់";
      return;
    }

    const remaining = target - Date.now();
    const readableDeadline = formatDateTime(deadline);
    elements.currentDeadline.textContent = `ពេលបញ្ចប់បច្ចុប្បន្ន៖ ${readableDeadline}`;

    if (remaining <= 0) {
      elements.countdownText.textContent = "ការបោះឆ្នោតត្រូវបានបិទ";
      if (!elements.closedBanner.classList.contains("hidden") || !foods.length) return;
      renderFoods();
      return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    elements.countdownText.textContent = `${days} ថ្ងៃ ${hours} ម៉ោង ${minutes} នាទី ${seconds} វិនាទី`;
    if (elements.closedBanner.classList.contains("hidden") === false) renderFoods();
  }

  function handlePasswordChange(event) {
    event.preventDefault();
    const oldPassword = elements.oldPassword.value;
    const newPassword = elements.newPassword.value.trim();
    elements.passwordError.textContent = "";

    if (oldPassword !== password) {
      elements.passwordError.textContent = "ពាក្យសម្ងាត់ចាស់មិនត្រឹមត្រូវ";
      return;
    }

    if (!newPassword) {
      elements.passwordError.textContent = "សូមបញ្ចូលពាក្យសម្ងាត់ថ្មី";
      return;
    }

    password = newPassword;
    localStorage.setItem(STORAGE_KEYS.password, password);
    elements.passwordForm.reset();
    showToast("បានប្តូរពាក្យសម្ងាត់ ✅", "success");
  }

  function handleResetVotes() {
    if (!confirm("តើអ្នកពិតជាចង់សម្អាតសន្លឹកឆ្នោតទាំងអស់មែនទេ?")) return;

    foods = foods.map((food) => ({
      ...food,
      votes: 0
    }));
    hasVoted = false;
    localStorage.removeItem(STORAGE_KEYS.voted);
    saveFoods();
    renderAll();
    showToast("បានសម្អាតសន្លឹកឆ្នោត ✅", "success");
  }

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast ${type || "success"}`;
    toast.textContent = message;
    elements.toastArea.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(18px)";
      setTimeout(() => toast.remove(), 250);
    }, 2600);
  }

  function showSpinner() {
    elements.spinnerOverlay.classList.remove("hidden");
  }

  function hideSpinner() {
    elements.spinnerOverlay.classList.add("hidden");
  }

  function createRipple(event) {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.className = "ripple-dot";
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  }

  function isValidUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "data:";
    } catch (error) {
      return false;
    }
  }

  function formatDateTime(value) {
    const date = new Date(value);
    return new Intl.DateTimeFormat("km-KH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();

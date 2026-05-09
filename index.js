
  // ─── Constants & State ───────────────────────────────────────────────────────
  const STORAGE_KEY = 'studyflow_tasks_v2';
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  const PRIORITY_CONFIG = {
    high:   { dot: 'bg-accent',  badge: 'bg-accentLight text-accent border-accent',  label: 'High'   },
    medium: { dot: 'bg-gold',    badge: 'bg-goldLight text-gold border-gold',         label: 'Med'    },
    low:    { dot: 'bg-teal',    badge: 'bg-tealLight text-teal border-teal',         label: 'Low'    },
  };

  let tasks = [];
  let currentFilter = 'all';
  let currentSort   = 'date-asc';
  let searchQuery   = '';
  let isDark = false;

  // ─── Persistence ─────────────────────────────────────────────────────────────
  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      tasks = raw ? JSON.parse(raw) : [];
    } catch {
      tasks = [];
    }
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatDate(dateStr) {
    // Display date nicely
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
  }

  function isOverdue(task) {
    return !task.done && task.date < todayStr();
  }

  function daysUntil(dateStr) {
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(dateStr + 'T00:00:00');
    return Math.round((due - today) / 86400000);
  }

  function dueLabelHtml(task) {
    if (task.done) return `<span class="text-xs text-muted line-through">${formatDate(task.date)}</span>`;
    const d = daysUntil(task.date);
    if (d < 0)  return `<span class="text-xs font-bold text-red-500">Overdue by ${Math.abs(d)}d</span>`;
    if (d === 0) return `<span class="text-xs font-bold text-accent">Due Today!</span>`;
    if (d === 1) return `<span class="text-xs font-bold text-gold">Due Tomorrow</span>`;
    if (d <= 3)  return `<span class="text-xs font-semibold text-gold">Due in ${d} days</span>`;
    return `<span class="text-xs text-muted">${formatDate(task.date)}</span>`;
  }

  // ─── DOM Building ─────────────────────────────────────────────────────────────
  function buildTaskCard(task) {
    const overdue = isOverdue(task);
    const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

    const card = document.createElement('div');
    card.className = `task-card animate-slide-in bg-white border-2 ${overdue ? 'border-red-400' : 'border-ink'} rounded-xl shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all p-4 ${task.done ? 'opacity-60' : ''}`;
    card.dataset.id = task.id;

    card.innerHTML = `
      <div class="flex items-start gap-3">
        <!-- Checkbox -->
        <div class="pt-0.5 flex-shrink-0">
          <button
            class="w-5 h-5 rounded border-2 border-ink flex items-center justify-center transition-all ${task.done ? 'bg-teal border-teal' : 'hover:bg-cream'}"
            onclick="toggleDone('${task.id}')"
            title="${task.done ? 'Mark pending' : 'Mark done'}"
            aria-label="Toggle done"
          >
            ${task.done ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center flex-wrap gap-1.5 mb-1">
            <!-- Priority dot -->
            <span class="priority-dot ${pc.dot}"></span>
            <!-- Category badge -->
            <span class="text-xs font-semibold text-muted border border-border bg-cream rounded px-1.5 py-0.5">${task.category || 'Task'}</span>
            <!-- Priority badge -->
            <span class="text-xs font-bold border rounded px-1.5 py-0.5 ${pc.badge}">${pc.label}</span>
            <!-- Overdue flag -->
            ${overdue ? `<span class="text-xs font-bold text-red-500 border border-red-300 bg-red-50 rounded px-1.5 py-0.5">⚠ Overdue</span>` : ''}
          </div>

          <!-- Task name -->
          <p class="font-bold text-sm text-ink leading-snug break-words ${task.done ? 'line-through text-muted' : ''}">${escHtml(task.name)}</p>

          <!-- Due date line -->
          <div class="flex items-center gap-1.5 mt-1.5">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="text-muted flex-shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            ${dueLabelHtml(task)}
          </div>

          <!-- Added date -->
          <p class="text-xs text-muted/50 mt-0.5">Added ${formatDate(task.added.slice(0,10))}</p>
        </div>

        <!-- Delete button -->
        <button
          onclick="deleteTask('${task.id}')"
          class="flex-shrink-0 w-7 h-7 rounded bg-paper border-2 border-ink flex items-center justify-center text-muted hover:bg-accent hover:text-white hover:border-accent transition-all shadow-brutalSm active:scale-90"
          title="Delete task"
          aria-label="Delete task"
        >
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    `;

    return card;
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ─── Render Pipeline ─────────────────────────────────────────────────────────
  function getFilteredSorted() {
    let list = [...tasks];

    // Filter
    if (currentFilter === 'pending')  list = list.filter(t => !t.done && !isOverdue(t));
    if (currentFilter === 'done')     list = list.filter(t => t.done);
    if (currentFilter === 'overdue')  list = list.filter(t => isOverdue(t));

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (currentSort === 'date-asc')   list.sort((a,b) => a.date.localeCompare(b.date));
    if (currentSort === 'date-desc')  list.sort((a,b) => b.date.localeCompare(a.date));
    if (currentSort === 'priority')   list.sort((a,b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    if (currentSort === 'added')      list.sort((a,b) => b.added.localeCompare(a.added));

    return list;
  }

  function renderTasks() {
    const list  = document.getElementById('task-list');
    const empty = document.getElementById('empty-state');
    const noRes = document.getElementById('no-results');
    const clearBtn = document.getElementById('clear-done');

    list.innerHTML = '';

    const filtered = getFilteredSorted();

    // Show/hide states
    if (tasks.length === 0) {
      empty.classList.remove('hidden');
      noRes.classList.add('hidden');
    } else if (filtered.length === 0) {
      empty.classList.add('hidden');
      noRes.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      noRes.classList.add('hidden');
      filtered.forEach(t => list.appendChild(buildTaskCard(t)));
    }

    // Clear completed button
    const hasDone = tasks.some(t => t.done);
    clearBtn.classList.toggle('hidden', !hasDone);

    updateStats();
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────
  function updateStats() {
    const total   = tasks.length;
    const done    = tasks.filter(t => t.done).length;
    const pending = tasks.filter(t => !t.done).length;
    const overdue = tasks.filter(t => isOverdue(t)).length;
    const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

    document.getElementById('stat-total').textContent   = total;
    document.getElementById('stat-done').textContent    = done;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('progress-pct').textContent = pct + '%';
    document.getElementById('progress-bar').style.width = pct + '%';
    document.getElementById('nav-count').textContent    = pending;

    // Overdue banner
    const banner = document.getElementById('overdue-banner');
    if (overdue > 0) {
      banner.classList.remove('hidden');
      document.getElementById('overdue-text').textContent =
        `${overdue} task${overdue > 1 ? 's' : ''} overdue — check your schedule!`;
    } else {
      banner.classList.add('hidden');
    }
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────
  function addTask(name, date, priority, category) {
    tasks.unshift({
      id:       uid(),
      name:     name.trim(),
      date:     date,
      priority: priority,
      category: category,
      done:     false,
      added:    new Date().toISOString(),
    });
    saveTasks();
    renderTasks();
  }

  function deleteTask(id) {
    const card = document.querySelector(`.task-card[data-id="${id}"]`);
    if (card) {
      card.classList.add('removing');
      setTimeout(() => {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
      }, 240);
    }
  }

  function toggleDone(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.done = !task.done;
    saveTasks();
    renderTasks();
  }

  // ─── Form Handling ────────────────────────────────────────────────────────────
  const form     = document.getElementById('task-form');
  const nameIn   = document.getElementById('task-name');
  const dateIn   = document.getElementById('task-date');
  const errName  = document.getElementById('err-name');
  const errDate  = document.getElementById('err-date');
  const toast    = document.getElementById('success-toast');
  const submitBtn = document.getElementById('submit-btn');

  // Set min date to today
  dateIn.min = todayStr();

  function showError(el, inputEl) {
    el.classList.remove('hidden');
    inputEl.classList.add('border-accent', 'bg-accentLight/20');
    inputEl.classList.remove('border-ink');
    inputEl.animate([{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}], {duration:350,easing:'ease'});
  }

  function clearError(el, inputEl) {
    el.classList.add('hidden');
    inputEl.classList.remove('border-accent', 'bg-accentLight/20');
    inputEl.classList.add('border-ink');
  }

  // Live clear on input
  nameIn.addEventListener('input', () => { if (nameIn.value.trim()) clearError(errName, nameIn); });
  dateIn.addEventListener('change', () => { if (dateIn.value) clearError(errDate, dateIn); });

  form.addEventListener('submit', e => {
    e.preventDefault();

    const name     = nameIn.value;
    const date     = dateIn.value;
    const priority = document.querySelector('input[name="priority"]:checked')?.value || 'medium';
    const category = document.getElementById('task-cat').value;

    let valid = true;

    // Validate name
    if (!name.trim()) {
      showError(errName, nameIn);
      valid = false;
    } else {
      clearError(errName, nameIn);
    }

    // Validate date
    if (!date) {
      showError(errDate, dateIn);
      valid = false;
    } else {
      clearError(errDate, dateIn);
    }

    if (!valid) return;

    // Add task
    addTask(name, date, priority, category);

    // Reset form
    nameIn.value = '';
    dateIn.value = '';
    document.querySelector('input[name="priority"][value="medium"]').checked = true;
    nameIn.focus();

    // Success toast
    toast.classList.remove('hidden');
    submitBtn.textContent = '✓ Added!';
    submitBtn.classList.add('bg-teal', 'border-teal');
    submitBtn.classList.remove('bg-accent');
    setTimeout(() => {
      toast.classList.add('hidden');
      submitBtn.textContent = '+ Add Task';
      submitBtn.classList.remove('bg-teal', 'border-teal');
      submitBtn.classList.add('bg-accent');
    }, 2000);
  });

  // ─── Filter buttons ───────────────────────────────────────────────────────────
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // ─── Sort ─────────────────────────────────────────────────────────────────────
  document.getElementById('sort-select').addEventListener('change', e => {
    currentSort = e.target.value;
    renderTasks();
  });

  // ─── Search ───────────────────────────────────────────────────────────────────
  let searchTimer;
  document.getElementById('search-input').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value;
      renderTasks();
    }, 200);
  });

  // ─── Clear done ───────────────────────────────────────────────────────────────
  document.getElementById('clear-done').addEventListener('click', () => {
    if (confirm('Remove all completed tasks?')) {
      tasks = tasks.filter(t => !t.done);
      saveTasks();
      renderTasks();
    }
  });

  // ─── Theme toggle (dark mode) ─────────────────────────────────────────────────
  function toggleTheme() {
    isDark = !isDark;
    document.documentElement.classList.toggle('dark', isDark);
    const icon = document.getElementById('theme-icon');
    if (isDark) {
      document.body.style.background = '#1a1a1a';
      icon.innerHTML = `<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>`;
    } else {
      document.body.style.background = '';
      icon.innerHTML = `<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707"/><circle cx="12" cy="12" r="4"/>`;
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  loadTasks();
  renderTasks();

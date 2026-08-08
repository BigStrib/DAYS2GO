(function () {
    'use strict';

    // ===== DOM =====
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    const mainScreen = $('#mainScreen');
    const welcomeState = $('#welcomeState');
    const countdownDisplay = $('#countdownDisplay');
    const daysLeftNumber = $('#daysLeftNumber');
    const progressFill = $('#progressFill');
    const progressCompleted = $('#progressCompleted');
    const progressTotal = $('#progressTotal');
    const countdownSub = $('#countdownSub');
    const fabMenu = $('#fabMenu');
    const welcomeMenuBtn = $('#welcomeMenuBtn');
    const panelOverlay = $('#panelOverlay');
    const sidePanel = $('#sidePanel');
    const panelClose = $('#panelClose');
    const panelEvents = $('#panelEvents');
    const panelEmpty = $('#panelEmpty');
    const addEventBtn = $('#addEventBtn');
    const bulkAddBtn = $('#bulkAddBtn');
    const clearAllBtn = $('#clearAllBtn');
    const eventModal = $('#eventModal');
    const modalTitle = $('#modalTitle');
    const modalCloseBtn = $('#modalCloseBtn');
    const inputName = $('#inputName');
    const inputDate = $('#inputDate');
    const modalSave = $('#modalSave');
    const bulkModal = $('#bulkModal');
    const bulkCloseBtn = $('#bulkCloseBtn');
    const bulkSave = $('#bulkSave');
    const confirmDialog = $('#confirmDialog');
    const confirmMsg = $('#confirmMsg');
    const confirmNo = $('#confirmNo');
    const confirmYes = $('#confirmYes');
    const toast = $('#toast');
    const toastIcon = $('#toastIcon');
    const toastMsg = $('#toastMsg');

    // ===== STATE =====
    let events = JSON.parse(localStorage.getItem('days2go_events')) || [];
    let editingId = null;
    let confirmCallback = null;
    let fabVisible = true;
    let fabTimeout = null;

    // ===== HELPERS =====
    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }

    function save() {
        localStorage.setItem('days2go_events', JSON.stringify(events));
    }

    function todayStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function daysUntil(dateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr + 'T00:00:00');
        return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    }

    function fmtDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function escHtml(t) {
        const d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    // ===== TOAST =====
    let toastTimer = null;
    function showToast(msg, icon = 'fa-check-circle', color = '#27ae60') {
        toastMsg.textContent = msg;
        toastIcon.className = `fas ${icon}`;
        toastIcon.style.color = color;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    // ===== CONFIRM =====
    function showConfirm(msg, cb) {
        confirmMsg.textContent = msg;
        confirmCallback = cb;
        confirmDialog.classList.add('open');
    }

    confirmNo.addEventListener('click', () => {
        confirmDialog.classList.remove('open');
        confirmCallback = null;
    });

    confirmYes.addEventListener('click', () => {
        confirmDialog.classList.remove('open');
        if (confirmCallback) confirmCallback();
        confirmCallback = null;
    });

    confirmDialog.addEventListener('click', e => {
        if (e.target === confirmDialog) {
            confirmDialog.classList.remove('open');
            confirmCallback = null;
        }
    });

    // ===== MAIN SCREEN UPDATE =====
    function updateMain() {
        const hasEvents = events.length > 0;

        if (!hasEvents) {
            welcomeState.classList.remove('hidden');
            countdownDisplay.classList.add('hidden');
            fabMenu.classList.add('hidden-fab');
            fabMenu.classList.remove('visible-fab');
            return;
        }

        welcomeState.classList.add('hidden');
        countdownDisplay.classList.remove('hidden');

        // Calculate remaining (upcoming) events
        const upcoming = events.filter(e => e.status === 'upcoming');
        const attended = events.filter(e => e.status === 'attended');
        const unattended = events.filter(e => e.status === 'unattended');
        const completed = attended.length + unattended.length;
        const total = events.length;
        const remaining = upcoming.length;

        // Check if all done
        if (remaining === 0) {
            daysLeftNumber.textContent = '0';
            daysLeftNumber.style.textShadow = '0 0 60px rgba(39, 174, 96, 0.4)';
            const cdLabel = countdownDisplay.querySelector('.countdown-label');
            cdLabel.textContent = 'All Done!';
        } else {
            daysLeftNumber.textContent = remaining;
            daysLeftNumber.style.textShadow = '';
            const cdLabel = countdownDisplay.querySelector('.countdown-label');
            cdLabel.textContent = remaining === 1 ? 'Day To Go' : 'Days To Go';
        }

        // Progress
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        progressFill.style.width = pct + '%';
        progressCompleted.textContent = completed;
        progressTotal.textContent = total;

        // Next upcoming date
        if (remaining > 0) {
            const sorted = [...upcoming].sort((a, b) => a.date.localeCompare(b.date));
            const next = sorted[0];
            const d = daysUntil(next.date);
            if (d === 0) {
                countdownSub.textContent = `Next: ${next.name} — Today`;
            } else if (d === 1) {
                countdownSub.textContent = `Next: ${next.name} — Tomorrow`;
            } else if (d < 0) {
                countdownSub.textContent = `Next: ${next.name} — ${Math.abs(d)} days ago`;
            } else {
                countdownSub.textContent = `Next: ${next.name} — ${fmtDate(next.date)}`;
            }
        } else {
            countdownSub.textContent = `${attended.length} attended · ${unattended.length} missed`;
        }

        // After events exist, manage FAB visibility
        handleFabVisibility();
    }

    // ===== FAB VISIBILITY =====
    // After first event: hide FAB. Tap screen to show it briefly.
    function handleFabVisibility() {
        if (events.length === 0) return;
        // Start hidden
        if (!fabVisible) {
            fabMenu.classList.add('hidden-fab');
            fabMenu.classList.remove('visible-fab');
        }
    }

    function showFabTemporarily() {
        if (events.length === 0) return;
        fabMenu.classList.remove('hidden-fab');
        fabMenu.classList.add('visible-fab');
        fabVisible = true;

        clearTimeout(fabTimeout);
        fabTimeout = setTimeout(() => {
            fabMenu.classList.add('hidden-fab');
            fabMenu.classList.remove('visible-fab');
            fabVisible = false;
        }, 3500);
    }

    // Tap main screen to show FAB
    mainScreen.addEventListener('click', e => {
        // Don't trigger if tapping the FAB itself or welcome btn
        if (e.target.closest('.fab-menu') || e.target.closest('.welcome-btn')) return;
        if (events.length > 0) {
            showFabTemporarily();
        }
    });

    // Initially hide FAB if events exist
    if (events.length > 0) {
        fabVisible = false;
    }

    // ===== PANEL =====
    function openPanel() {
        sidePanel.classList.add('open');
        panelOverlay.classList.add('open');
        clearTimeout(fabTimeout);
        fabMenu.classList.add('hidden-fab');
        fabMenu.classList.remove('visible-fab');
        renderPanelEvents();
    }

    function closePanel() {
        sidePanel.classList.remove('open');
        panelOverlay.classList.remove('open');
        updateMain();
    }

    fabMenu.addEventListener('click', e => {
        e.stopPropagation();
        openPanel();
    });

    welcomeMenuBtn.addEventListener('click', e => {
        e.stopPropagation();
        openPanel();
    });

    panelClose.addEventListener('click', closePanel);
    panelOverlay.addEventListener('click', closePanel);

    // ===== RENDER PANEL EVENTS =====
    function renderPanelEvents() {
        // Remove all event items
        panelEvents.querySelectorAll('.event-item').forEach(el => el.remove());

        if (events.length === 0) {
            panelEmpty.classList.remove('hidden');
            return;
        }

        panelEmpty.classList.add('hidden');

        // Sort by date
        const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

        sorted.forEach((evt, idx) => {
            const item = document.createElement('div');
            item.className = 'event-item';
            item.dataset.id = evt.id;

            if (evt.status === 'attended') {
                item.classList.add('done', 'status-attended');
            } else if (evt.status === 'unattended') {
                item.classList.add('done', 'status-unattended');
            }

            const d = daysUntil(evt.date);
            let badgeClass = 'badge-upcoming';
            let badgeText = `${d}d`;

            if (evt.status === 'attended') {
                badgeClass = 'badge-attended';
                badgeText = 'Done';
            } else if (evt.status === 'unattended') {
                badgeClass = 'badge-unattended';
                badgeText = 'Missed';
            } else if (d === 0) {
                badgeClass = 'badge-today';
                badgeText = 'Today';
            } else if (d < 0) {
                badgeText = `${Math.abs(d)}d ago`;
            } else if (d === 1) {
                badgeText = '1 day';
            } else {
                badgeText = `${d}d`;
            }

            // Determine which action buttons to show
            let actionsHTML = '';
            if (evt.status === 'upcoming') {
                actionsHTML = `
                    <button class="evt-action evt-attend" data-act="attend" title="Attended">
                        <i class="fas fa-check"></i> Attended
                    </button>
                    <button class="evt-action evt-unattend" data-act="unattend" title="Not Attended">
                        <i class="fas fa-xmark"></i> Missed
                    </button>
                    <button class="evt-action evt-edit" data-act="edit" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="evt-action evt-delete" data-act="delete" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            } else {
                actionsHTML = `
                    <button class="evt-action evt-edit" data-act="undo" title="Undo" style="color:var(--text2)">
                        <i class="fas fa-rotate-left"></i> Undo
                    </button>
                    <button class="evt-action evt-edit" data-act="edit" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="evt-action evt-delete" data-act="delete" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }

            item.innerHTML = `
                <div class="event-item-main">
                    <div class="event-item-indicator"></div>
                    <div class="event-item-info">
                        <div class="event-item-name">${escHtml(evt.name)}</div>
                        <div class="event-item-date">
                            <i class="fas fa-calendar-day"></i>
                            ${fmtDate(evt.date)}
                        </div>
                    </div>
                    <span class="event-item-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="event-item-actions">
                    ${actionsHTML}
                </div>
            `;

            item.style.animationDelay = `${idx * 0.03}s`;
            panelEvents.appendChild(item);
        });
    }

    // ===== PANEL EVENT ACTIONS =====
    panelEvents.addEventListener('click', e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;

        const item = btn.closest('.event-item');
        if (!item) return;

        const id = item.dataset.id;
        const act = btn.dataset.act;

        switch (act) {
            case 'attend':
                setStatus(id, 'attended');
                item.style.transform = 'translateX(40px)';
                item.style.opacity = '0';
                setTimeout(() => renderPanelEvents(), 250);
                showToast('Marked attended', 'fa-circle-check', '#27ae60');
                break;

            case 'unattend':
                setStatus(id, 'unattended');
                item.style.transform = 'translateX(-40px)';
                item.style.opacity = '0';
                setTimeout(() => renderPanelEvents(), 250);
                showToast('Marked as missed', 'fa-circle-xmark', '#c0392b');
                break;

            case 'undo':
                setStatus(id, 'upcoming');
                renderPanelEvents();
                showToast('Restored', 'fa-rotate-left', '#999');
                break;

            case 'edit':
                openEditModal(id);
                break;

            case 'delete':
                showConfirm('Delete this event?', () => {
                    events = events.filter(ev => ev.id !== id);
                    save();
                    renderPanelEvents();
                    updateMain();
                    showToast('Deleted', 'fa-trash-can', '#c0392b');
                });
                break;
        }
    });

    function setStatus(id, status) {
        const evt = events.find(e => e.id === id);
        if (evt) {
            evt.status = status;
            save();
            updateMain();
        }
    }

    // ===== ADD EVENT MODAL =====
    addEventBtn.addEventListener('click', () => {
        editingId = null;
        inputName.value = '';
        inputDate.value = todayStr();
        modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add Event';
        modalSave.innerHTML = '<i class="fas fa-check"></i> Save';
        eventModal.classList.add('open');
        setTimeout(() => inputName.focus(), 300);
    });

    function openEditModal(id) {
        const evt = events.find(e => e.id === id);
        if (!evt) return;
        editingId = id;
        inputName.value = evt.name;
        inputDate.value = evt.date;
        modalTitle.innerHTML = '<i class="fas fa-pen-to-square"></i> Edit Event';
        modalSave.innerHTML = '<i class="fas fa-check"></i> Update';
        eventModal.classList.add('open');
        setTimeout(() => inputName.focus(), 300);
    }

    modalCloseBtn.addEventListener('click', () => eventModal.classList.remove('open'));
    eventModal.addEventListener('click', e => {
        if (e.target === eventModal) eventModal.classList.remove('open');
    });

    modalSave.addEventListener('click', () => {
        const name = inputName.value.trim();
        const date = inputDate.value;

        if (!name) {
            inputName.focus();
            showToast('Enter a name', 'fa-exclamation-circle', '#c0392b');
            return;
        }
        if (!date) {
            showToast('Pick a date', 'fa-exclamation-circle', '#c0392b');
            return;
        }

        if (editingId) {
            const evt = events.find(e => e.id === editingId);
            if (evt) {
                evt.name = name;
                evt.date = date;
            }
            showToast('Updated', 'fa-pen-to-square', '#999');
        } else {
            events.push({
                id: uid(),
                name,
                date,
                status: 'upcoming'
            });
            showToast('Event added', 'fa-check-circle', '#27ae60');
        }

        save();
        editingId = null;
        eventModal.classList.remove('open');
        renderPanelEvents();
        updateMain();
    });

    inputName.addEventListener('keydown', e => {
        if (e.key === 'Enter') modalSave.click();
    });

    // ===== BULK ADD MODAL =====
    bulkAddBtn.addEventListener('click', () => {
        $('#bulkStartDate').value = todayStr();
        $('#bulkPrefix').value = 'Day';
        $('#bulkCount').value = 20;
        bulkModal.classList.add('open');
    });

    bulkCloseBtn.addEventListener('click', () => bulkModal.classList.remove('open'));
    bulkModal.addEventListener('click', e => {
        if (e.target === bulkModal) bulkModal.classList.remove('open');
    });

    bulkSave.addEventListener('click', () => {
        const prefix = $('#bulkPrefix').value.trim() || 'Day';
        const startDate = $('#bulkStartDate').value;
        const count = parseInt($('#bulkCount').value) || 1;

        if (!startDate) {
            showToast('Pick a start date', 'fa-exclamation-circle', '#c0392b');
            return;
        }
        if (count < 1 || count > 100) {
            showToast('Enter 1–100', 'fa-exclamation-circle', '#c0392b');
            return;
        }

        for (let i = 0; i < count; i++) {
            const d = new Date(startDate + 'T00:00:00');
            d.setDate(d.getDate() + i);
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            events.push({
                id: uid(),
                name: `${prefix} ${i + 1}`,
                date: ds,
                status: 'upcoming'
            });
        }

        save();
        bulkModal.classList.remove('open');
        renderPanelEvents();
        updateMain();
        showToast(`${count} events created`, 'fa-layer-group', '#27ae60');
    });

    // ===== CLEAR ALL =====
    clearAllBtn.addEventListener('click', () => {
        if (events.length === 0) {
            showToast('Nothing to clear', 'fa-info-circle', '#999');
            return;
        }
        showConfirm(`Delete all ${events.length} events?`, () => {
            events = [];
            save();
            renderPanelEvents();
            updateMain();
            showToast('All cleared', 'fa-trash-can', '#c0392b');
        });
    });

    // ===== KEYBOARD =====
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            eventModal.classList.remove('open');
            bulkModal.classList.remove('open');
            confirmDialog.classList.remove('open');
            closePanel();
        }
    });

    // ===== INIT =====
    updateMain();

    // If events exist, start with FAB hidden
    if (events.length > 0) {
        fabMenu.classList.add('hidden-fab');
        fabMenu.classList.remove('visible-fab');
        fabVisible = false;
    }

})();
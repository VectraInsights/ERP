/* ============================================================
   UI.JS — Modal, Toast, Loader Utilities
   ============================================================ */
'use strict';

/* ─── Toast ──────────────────────────────────────────────── */
export const toast = {
  _container: null,

  _init() {
    if (!this._container) {
      this._container = document.getElementById('toast-container');
    }
  },

  show(type = 'info', title, message, duration = 4000) {
    this._init();
    const icons = {
      success: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
      danger:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    };

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    this._container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    if (duration > 0) {
      setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 350);
      }, duration);
    }
  },

  success(title, msg) { this.show('success', title, msg); },
  error(title, msg)   { this.show('danger', title, msg); },
  warning(title, msg) { this.show('warning', title, msg); },
  info(title, msg)    { this.show('info', title, msg); },
};

/* ─── Modal ──────────────────────────────────────────────── */
export const modal = {
  _current: null,

  open(config) {
    const {
      id = 'modal-dynamic',
      title,
      size = '',
      body,
      footer,
      onClose,
    } = config;

    // Close existing
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = id + '-overlay';

    overlay.innerHTML = `
      <div class="modal ${size ? 'modal-' + size : ''}" id="${id}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close" id="${id}-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">${body || ''}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    document.body.appendChild(overlay);
    this._current = overlay;

    requestAnimationFrame(() => overlay.classList.add('active'));

    // Close handlers
    overlay.querySelector(`#${id}-close-btn`).addEventListener('click', () => this.close(onClose));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close(onClose);
    });
    document.addEventListener('keydown', this._escHandler = (e) => {
      if (e.key === 'Escape') this.close(onClose);
    });

    return overlay;
  },

  close(cb) {
    if (this._current) {
      this._current.classList.remove('active');
      setTimeout(() => {
        this._current?.remove();
        this._current = null;
      }, 300);
      document.removeEventListener('keydown', this._escHandler);
    }
    if (typeof cb === 'function') cb();
  },

  // Confirmation dialog
  confirm(title, message, onConfirm, danger = false) {
    this.open({
      id: 'modal-confirm',
      size: 'sm',
      title,
      body: `<p style="color:var(--text-secondary);font-size:14px;line-height:1.6">${message}</p>`,
      footer: `
        <button class="btn btn-ghost" id="modal-confirm-cancel">Cancelar</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-ok">Confirmar</button>
      `,
    });
    setTimeout(() => {
      document.getElementById('modal-confirm-cancel')?.addEventListener('click', () => this.close());
      document.getElementById('modal-confirm-ok')?.addEventListener('click', () => {
        this.close();
        onConfirm?.();
      });
    }, 50);
  },
};

/* ─── Page Loader ────────────────────────────────────────── */
export const loader = {
  show(container) {
    const el = document.createElement('div');
    el.className = 'loading-overlay';
    el.innerHTML = `<div class="spinner spinner-lg"></div>`;
    el.style.position = 'absolute';
    container.style.position = 'relative';
    container.appendChild(el);
    return el;
  },
  hide(el) { el?.remove(); },
};

/* ─── Ripple Effect ──────────────────────────────────────── */
export function addRipple(el) {
  el.classList.add('ripple-container');
  el.addEventListener('click', (e) => {
    const rect = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple-effect';
    ripple.style.cssText = `
      width:${size}px; height:${size}px;
      top:${e.clientY - rect.top - size/2}px;
      left:${e.clientX - rect.left - size/2}px;
    `;
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

/* ─── Count Up Animation ─────────────────────────────────── */
export function countUp(el, target, prefix = '', suffix = '', duration = 1200) {
  const start = 0;
  const startTime = performance.now();
  const step = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * ease;
    el.textContent = prefix + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(current)) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ─── Debounce ───────────────────────────────────────────── */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ─── Generate Table HTML ────────────────────────────────── */
export function buildTable(columns, rows, emptyMsg = 'Nenhum registro encontrado') {
  if (!rows.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        </div>
        <h3>Sem dados</h3>
        <p>${emptyMsg}</p>
      </div>
    `;
  }
  return `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr data-id="${row._id || ''}">
              ${columns.map(c => `<td class="${c.class || ''}">${c.render ? c.render(row) : (row[c.key] ?? '—')}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* ─── Pagination ─────────────────────────────────────────── */
export class Paginator {
  constructor(items, perPage = 10) {
    this.items = items;
    this.perPage = perPage;
    this.page = 1;
  }

  get total() { return Math.ceil(this.items.length / this.perPage); }
  get current() {
    const start = (this.page - 1) * this.perPage;
    return this.items.slice(start, start + this.perPage);
  }

  renderPagination(containerId, onChange) {
    const c = document.getElementById(containerId);
    if (!c) return;
    if (this.total <= 1) { c.innerHTML = ''; return; }

    const pages = [];
    for (let i = 1; i <= this.total; i++) pages.push(i);

    c.innerHTML = `
      <div class="pagination">
        <button class="page-btn" id="pg-prev" ${this.page === 1 ? 'disabled' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        ${pages.map(p => `<button class="page-btn ${p === this.page ? 'active' : ''}" data-pg="${p}">${p}</button>`).join('')}
        <button class="page-btn" id="pg-next" ${this.page === this.total ? 'disabled' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    `;

    c.querySelectorAll('[data-pg]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.page = parseInt(btn.dataset.pg);
        onChange();
      });
    });
    c.querySelector('#pg-prev')?.addEventListener('click', () => {
      if (this.page > 1) { this.page--; onChange(); }
    });
    c.querySelector('#pg-next')?.addEventListener('click', () => {
      if (this.page < this.total) { this.page++; onChange(); }
    });
  }
}

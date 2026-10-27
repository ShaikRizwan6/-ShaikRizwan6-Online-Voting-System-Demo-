/**
 * Main Application Orchestrator
 * Handles navigation rendering, user session synchronization, toasts, and UI helpers
 */
(function (window) {
  'use strict';

  // State
  let currentUser = null;

  // Format datetime into human-friendly representation safely across browsers
  function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    let normalized = dateStr;
    if (typeof dateStr === 'string' && dateStr.includes(' ') && !dateStr.includes('T')) {
      normalized = dateStr.replace(' ', 'T');
    }
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Generate Bootstrap status badge markup
  function getStatusBadge(status) {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'published':
        return '<span class="badge bg-success badge-status">Active</span>';
      case 'closed':
        return '<span class="badge bg-secondary badge-status">Closed</span>';
      case 'draft':
      default:
        return '<span class="badge bg-warning text-dark badge-status">Draft</span>';
    }
  }

  // Display floating Bootstrap Toast alert
  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const bgClass = {
      success: 'bg-success text-white',
      danger: 'bg-danger text-white',
      warning: 'bg-warning text-dark',
      info: 'bg-primary text-white'
    }[type] || 'bg-dark text-white';

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center ${bgClass} border-0 show shadow`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body fw-semibold">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    container.appendChild(toastEl);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => toastEl.remove(), 300);
    }, 4000);
  }

  // Render navigation bar based on authentication status and user role
  async function initNavbar() {
    const navPlaceholder = document.getElementById('navbar-container');
    if (!navPlaceholder) return;

    let user = null;
    try {
      const res = await window.api.get('/api/auth/me');
      if (res.success && res.data && res.data.user) {
        user = res.data.user;
        currentUser = user;
      }
    } catch (e) {
      // User is a guest or unauthenticated
      currentUser = null;
    }

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    let navLinks = '';
    if (user && user.role === 'admin') {
      navLinks = `
        <li class="nav-item"><a class="nav-link ${currentPath === 'admin-dashboard.html' ? 'active' : ''}" href="admin-dashboard.html">Dashboard</a></li>
        <li class="nav-item"><a class="nav-link ${currentPath === 'manage-elections.html' ? 'active' : ''}" href="manage-elections.html">Elections</a></li>
        <li class="nav-item"><a class="nav-link ${currentPath === 'manage-candidates.html' ? 'active' : ''}" href="manage-candidates.html">Candidates</a></li>
        <li class="nav-item"><a class="nav-link ${currentPath === 'manage-voters.html' ? 'active' : ''}" href="manage-voters.html">Voters</a></li>
      `;
    } else if (user && user.role === 'voter') {
      navLinks = `
        <li class="nav-item"><a class="nav-link ${currentPath === 'voter-dashboard.html' ? 'active' : ''}" href="voter-dashboard.html">My Dashboard</a></li>
        <li class="nav-item"><a class="nav-link ${currentPath === 'about.html' ? 'active' : ''}" href="about.html">About</a></li>
      `;
    } else {
      navLinks = `
        <li class="nav-item"><a class="nav-link ${currentPath === 'index.html' || currentPath === '' ? 'active' : ''}" href="index.html">Home</a></li>
        <li class="nav-item"><a class="nav-link ${currentPath === 'about.html' ? 'active' : ''}" href="about.html">About</a></li>
      `;
    }

    let authButtons = '';
    if (user) {
      authButtons = `
        <div class="d-flex align-items-center gap-2">
          <span class="badge bg-light text-dark px-3 py-2 border">
            <i class="bi bi-person-circle me-1"></i> ${user.full_name} (${user.role.toUpperCase()})
          </span>
          <button id="nav-logout-btn" class="btn btn-outline-light btn-sm px-3">
            <i class="bi bi-box-arrow-right me-1"></i> Logout
          </button>
        </div>
      `;
    } else {
      authButtons = `
        <div class="d-flex align-items-center gap-2">
          <a href="login.html" class="btn btn-outline-light btn-sm px-3">Log In</a>
          <a href="register.html" class="btn btn-light text-primary btn-sm px-3 fw-bold">Register</a>
        </div>
      `;
    }

    navPlaceholder.innerHTML = `
      <nav class="navbar navbar-expand-lg navbar-dark navbar-custom sticky-top">
        <div class="container">
          <a class="navbar-brand d-flex align-items-center gap-2" href="${user ? (user.role === 'admin' ? 'admin-dashboard.html' : 'voter-dashboard.html') : 'index.html'}">
            <i class="bi bi-check2-circle fs-4 text-warning"></i>
            <span>VoteSphere</span>
          </a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarContent">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
              ${navLinks}
            </ul>
            ${authButtons}
          </div>
        </div>
      </nav>
    `;

    // Logout listener
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await window.api.post('/api/auth/logout');
          showToast('Logged out successfully.', 'info');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 400);
        } catch (err) {
          showToast(err.message || 'Error logging out', 'danger');
        }
      });
    }
  }

  // Ensure current user satisfies route permissions
  async function requireAuthRedirect(expectedRole = null) {
    try {
      const res = await window.api.get('/api/auth/me');
      if (!res.success || !res.data.user) {
        window.location.href = 'login.html';
        return null;
      }
      const user = res.data.user;
      if (expectedRole && user.role !== expectedRole) {
        window.location.href = user.role === 'admin' ? 'admin-dashboard.html' : 'voter-dashboard.html';
        return null;
      }
      return user;
    } catch (e) {
      window.location.href = 'login.html';
      return null;
    }
  }

  // Render standardized footer
  function initFooter() {
    const footerPlaceholder = document.getElementById('footer-container');
    if (!footerPlaceholder) return;
    footerPlaceholder.innerHTML = `
      <footer>
        <div class="container text-center">
          <p class="mb-1 fw-semibold text-dark">Online Voting System &mdash; Educational Demo Application</p>
          <p class="mb-0 small text-muted">Architected with Node.js LTS, Express, MySQL 8, Bootstrap 5, & Vanilla JavaScript.</p>
        </div>
      </footer>
    `;
  }

  // Bootstrap page hooks
  document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initFooter();
  });

  window.App = {
    formatDateTime,
    getStatusBadge,
    showToast,
    requireAuthRedirect,
    getCurrentUser: () => currentUser
  };
})(window);

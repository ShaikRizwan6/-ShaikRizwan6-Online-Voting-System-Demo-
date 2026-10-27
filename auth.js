/**
 * Authentication Module
 * Handles Login and Registration interactions and Demo Credential Quick-Fill
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Handle Registration
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = document.getElementById('reg-fullname').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;
      const alertContainer = document.getElementById('register-alert');

      if (alertContainer) alertContainer.innerHTML = '';

      if (password !== confirmPassword) {
        if (alertContainer) {
          alertContainer.innerHTML = `
            <div class="alert alert-danger py-2">Passwords do not match. Please re-enter.</div>
          `;
        }
        return;
      }

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const response = await window.api.post('/api/auth/register', {
          full_name: fullName,
          email: email,
          password: password
        });

        if (response.success) {
          if (alertContainer) {
            alertContainer.innerHTML = `
              <div class="alert alert-success py-2">${response.message} Redirecting to login...</div>
            `;
          }
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 1500);
        }
      } catch (err) {
        if (alertContainer) {
          alertContainer.innerHTML = `
            <div class="alert alert-danger py-2">${err.message || 'Registration failed.'}</div>
          `;
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // 2. Handle Login
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const alertContainer = document.getElementById('login-alert');

      if (alertContainer) alertContainer.innerHTML = '';

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const response = await window.api.post('/api/auth/login', {
          email: email,
          password: password
        });

        if (response.success && response.data && response.data.user) {
          const user = response.data.user;
          window.App.showToast(`Welcome back, ${user.full_name}!`, 'success');

          setTimeout(() => {
            if (user.role === 'admin') {
              window.location.href = 'admin-dashboard.html';
            } else {
              window.location.href = 'voter-dashboard.html';
            }
          }, 500);
        }
      } catch (err) {
        if (alertContainer) {
          alertContainer.innerHTML = `
            <div class="alert alert-danger py-2">${err.message || 'Login failed.'}</div>
          `;
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    // 3. Quick-fill buttons for demonstration
    const btnFillAdmin = document.getElementById('btn-fill-admin');
    if (btnFillAdmin) {
      btnFillAdmin.addEventListener('click', () => {
        document.getElementById('login-email').value = 'admin@voting.local';
        document.getElementById('login-password').value = 'AdminPassword123!';
      });
    }

    const btnFillVoter = document.getElementById('btn-fill-voter');
    if (btnFillVoter) {
      btnFillVoter.addEventListener('click', () => {
        document.getElementById('login-email').value = 'alice@voting.local';
        document.getElementById('login-password').value = 'VoterPass123!';
      });
    }
  }
});

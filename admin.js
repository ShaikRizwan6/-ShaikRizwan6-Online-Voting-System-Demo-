/**
 * Administrator Panel Orchestration
 * Manages statistics, election CRUD, candidate roster updates, and voter account status toggles
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Validate administrator role
  const adminUser = await window.App.requireAuthRedirect('admin');
  if (!adminUser) return;

  // 1. Admin Dashboard View (admin-dashboard.html)
  const adminDashboardContainer = document.getElementById('admin-dashboard-container');
  if (adminDashboardContainer) {
    try {
      const res = await window.api.get('/api/admin/dashboard');
      if (!res.success || !res.data) throw new Error(res.message || 'Error fetching stats.');

      const { total_voters, active_elections, closed_elections, draft_elections, total_votes, recent_elections } = res.data;

      // Populate counters
      document.getElementById('stat-total-voters').textContent = total_voters;
      document.getElementById('stat-active-elections').textContent = active_elections;
      document.getElementById('stat-closed-elections').textContent = closed_elections;
      document.getElementById('stat-total-votes').textContent = total_votes;

      // Populate Recent Elections Table
      const recentTableBody = document.getElementById('recent-elections-tbody');
      if (recentTableBody) {
        if (!recent_elections || recent_elections.length === 0) {
          recentTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No elections recorded.</td></tr>';
        } else {
          recentTableBody.innerHTML = recent_elections.map(e => `
            <tr>
              <td class="fw-bold">#${e.id}</td>
              <td>${e.title}</td>
              <td>${window.App.getStatusBadge(e.status)}</td>
              <td><span class="badge bg-light text-dark border">${e.candidate_count || 0} candidates</span></td>
              <td><span class="fw-bold text-primary">${e.total_votes || 0}</span> votes</td>
              <td>
                <div class="btn-group btn-group-sm">
                  <a href="election-details.html?id=${e.id}" class="btn btn-outline-secondary" title="View Details"><i class="bi bi-eye"></i></a>
                  <a href="results.html?id=${e.id}" class="btn btn-outline-primary" title="View Results"><i class="bi bi-bar-chart"></i></a>
                </div>
              </td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      window.App.showToast(err.message, 'danger');
    }
  }

  // 2. Manage Elections View (manage-elections.html)
  const manageElectionsContainer = document.getElementById('manage-elections-container');
  if (manageElectionsContainer) {
    const electionsTbody = document.getElementById('elections-table-tbody');
    const modalEl = document.getElementById('electionModal');
    const electionModal = modalEl ? new bootstrap.Modal(modalEl) : null;
    const electionForm = document.getElementById('election-form');

    async function loadElections() {
      try {
        const res = await window.api.get('/api/elections');
        if (!res.success) throw new Error(res.message);

        const elections = res.data;
        if (elections.length === 0) {
          electionsTbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No elections created yet.</td></tr>';
          return;
        }

        electionsTbody.innerHTML = elections.map(e => `
          <tr>
            <td class="fw-bold">#${e.id}</td>
            <td>
              <div class="fw-bold">${e.title}</div>
              <small class="text-muted">${e.description ? e.description.substring(0, 60) + '...' : 'No description'}</small>
            </td>
            <td>
              <div class="small">Start: ${window.App.formatDateTime(e.start_time)}</div>
              <div class="small text-muted">End: ${window.App.formatDateTime(e.end_time)}</div>
            </td>
            <td>${window.App.getStatusBadge(e.status)}</td>
            <td>
              <span class="badge ${e.results_visible ? 'bg-info text-dark' : 'bg-light text-muted border'}">
                ${e.results_visible ? 'Visible' : 'Hidden'}
              </span>
            </td>
            <td>
              <span class="fw-bold">${e.total_votes || 0}</span> votes
            </td>
            <td>
              <div class="dropdown">
                <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                  Actions
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow">
                  <li><a class="dropdown-item btn-edit-election" href="#" data-election='${JSON.stringify(e)}'><i class="bi bi-pencil me-2"></i>Edit Details</a></li>
                  <li><a class="dropdown-item" href="manage-candidates.html?election_id=${e.id}"><i class="bi bi-people me-2"></i>Manage Candidates</a></li>
                  <li><a class="dropdown-item" href="results.html?id=${e.id}"><i class="bi bi-bar-chart me-2"></i>View Standings</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><h6 class="dropdown-header">Change Lifecycle Status</h6></li>
                  <li><a class="dropdown-item btn-status-change" href="#" data-id="${e.id}" data-status="draft"><i class="bi bi-file-earmark me-2"></i>Set as Draft</a></li>
                  <li><a class="dropdown-item btn-status-change" href="#" data-id="${e.id}" data-status="published"><i class="bi bi-broadcast me-2 text-success"></i>Publish (Open Voting)</a></li>
                  <li><a class="dropdown-item btn-status-change" href="#" data-id="${e.id}" data-status="closed"><i class="bi bi-lock me-2 text-secondary"></i>Close Election</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item text-danger btn-delete-election" href="#" data-id="${e.id}" data-title="${e.title}"><i class="bi bi-trash me-2"></i>Delete Election</a></li>
                </ul>
              </div>
            </td>
          </tr>
        `).join('');

        attachElectionActionListeners();
      } catch (err) {
        window.App.showToast(err.message, 'danger');
      }
    }

    function attachElectionActionListeners() {
      // Edit button trigger
      document.querySelectorAll('.btn-edit-election').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const election = JSON.parse(btn.getAttribute('data-election'));
          document.getElementById('election-id').value = election.id;
          document.getElementById('election-title').value = election.title;
          document.getElementById('election-description').value = election.description || '';

          // Format datetime-local strings
          const toLocalIso = (dStr) => {
            if (!dStr) return '';
            const d = new Date(dStr);
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          };

          document.getElementById('election-start-time').value = toLocalIso(election.start_time);
          document.getElementById('election-end-time').value = toLocalIso(election.end_time);
          document.getElementById('election-status').value = election.status;
          document.getElementById('election-results-visible').checked = Boolean(election.results_visible);

          document.getElementById('electionModalLabel').textContent = 'Edit Election';
          if (electionModal) electionModal.show();
        });
      });

      // Quick Status change trigger
      document.querySelectorAll('.btn-status-change').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const electionId = btn.getAttribute('data-id');
          const newStatus = btn.getAttribute('data-status');
          try {
            await window.api.patch(`/api/elections/${electionId}/status`, { status: newStatus });
            window.App.showToast(`Status updated to ${newStatus}`, 'success');
            loadElections();
          } catch (err) {
            window.App.showToast(err.message, 'danger');
          }
        });
      });

      // Delete election trigger
      document.querySelectorAll('.btn-delete-election').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const electionId = btn.getAttribute('data-id');
          const title = btn.getAttribute('data-title');
          if (confirm(`Are you sure you want to permanently delete "${title}"? All votes and candidates will be deleted.`)) {
            try {
              await window.api.delete(`/api/elections/${electionId}`);
              window.App.showToast('Election deleted successfully', 'success');
              loadElections();
            } catch (err) {
              window.App.showToast(err.message, 'danger');
            }
          }
        });
      });
    }

    // New Election button opens blank modal
    const btnNewElection = document.getElementById('btn-new-election');
    if (btnNewElection) {
      btnNewElection.addEventListener('click', () => {
        if (electionForm) electionForm.reset();
        document.getElementById('election-id').value = '';
        document.getElementById('electionModalLabel').textContent = 'Create New Election';
        if (electionModal) electionModal.show();
      });
    }

    // Submit election modal form (Create or Update)
    if (electionForm) {
      electionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const electionId = document.getElementById('election-id').value;
        const payload = {
          title: document.getElementById('election-title').value.trim(),
          description: document.getElementById('election-description').value.trim(),
          start_time: document.getElementById('election-start-time').value,
          end_time: document.getElementById('election-end-time').value,
          status: document.getElementById('election-status').value,
          results_visible: document.getElementById('election-results-visible').checked
        };

        try {
          if (electionId) {
            await window.api.put(`/api/elections/${electionId}`, payload);
            window.App.showToast('Election updated successfully', 'success');
          } else {
            await window.api.post('/api/elections', payload);
            window.App.showToast('Election created successfully', 'success');
          }
          if (electionModal) electionModal.hide();
          loadElections();
        } catch (err) {
          window.App.showToast(err.message, 'danger');
        }
      });
    }

    loadElections();
  }

  // 3. Manage Candidates View (manage-candidates.html)
  const manageCandidatesContainer = document.getElementById('manage-candidates-container');
  if (manageCandidatesContainer) {
    const electionSelect = document.getElementById('candidate-election-select');
    const candidatesTbody = document.getElementById('candidates-table-tbody');
    const modalEl = document.getElementById('candidateModal');
    const candidateModal = modalEl ? new bootstrap.Modal(modalEl) : null;
    const candidateForm = document.getElementById('candidate-form');
    const btnAddCandidate = document.getElementById('btn-add-candidate');

    async function populateElectionDropdown() {
      try {
        const res = await window.api.get('/api/elections');
        if (!res.success) return;

        const elections = res.data;
        electionSelect.innerHTML = '<option value="">-- Choose an Election --</option>' +
          elections.map(e => `<option value="${e.id}">${e.title} (${e.status})</option>`).join('');

        const urlParams = new URLSearchParams(window.location.search);
        const preselectedId = urlParams.get('election_id');
        if (preselectedId) {
          electionSelect.value = preselectedId;
          loadCandidates(preselectedId);
        }
      } catch (err) {
        window.App.showToast('Error loading elections list', 'danger');
      }
    }

    async function loadCandidates(electionId) {
      if (!electionId) {
        candidatesTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Please select an election from the dropdown above.</td></tr>';
        if (btnAddCandidate) btnAddCandidate.disabled = true;
        return;
      }

      if (btnAddCandidate) btnAddCandidate.disabled = false;

      try {
        const res = await window.api.get(`/api/elections/${electionId}/candidates`);
        if (!res.success) throw new Error(res.message);

        const candidates = res.data;
        if (candidates.length === 0) {
          candidatesTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No candidates registered for this election yet.</td></tr>';
          return;
        }

        candidatesTbody.innerHTML = candidates.map(c => `
          <tr>
            <td>
              ${c.photo ? `
                <img src="${c.photo}" class="rounded" style="width: 48px; height: 48px; object-fit: cover;" alt="${c.name}">
              ` : `
                <div class="bg-light rounded d-flex align-items-center justify-content-center text-muted" style="width: 48px; height: 48px;">
                  <i class="bi bi-person fs-4"></i>
                </div>
              `}
            </td>
            <td>
              <div class="fw-bold text-dark">${c.name}</div>
              <small class="text-muted">${c.description ? c.description.substring(0, 60) + '...' : ''}</small>
            </td>
            <td><span class="badge bg-primary-subtle text-primary">${c.party_name}</span></td>
            <td><span class="small text-muted">${window.App.formatDateTime(c.created_at)}</span></td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-secondary btn-edit-candidate" data-candidate='${JSON.stringify(c)}'>
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger btn-delete-candidate" data-id="${c.id}" data-name="${c.name}">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `).join('');

        attachCandidateActionListeners();
      } catch (err) {
        window.App.showToast(err.message, 'danger');
      }
    }

    function attachCandidateActionListeners() {
      document.querySelectorAll('.btn-edit-candidate').forEach(btn => {
        btn.addEventListener('click', () => {
          const c = JSON.parse(btn.getAttribute('data-candidate'));
          document.getElementById('candidate-id').value = c.id;
          document.getElementById('candidate-name').value = c.name;
          document.getElementById('candidate-party').value = c.party_name;
          document.getElementById('candidate-description').value = c.description || '';
          document.getElementById('candidate-photo').value = c.photo || '';
          document.getElementById('candidateModalLabel').textContent = 'Edit Candidate';
          if (candidateModal) candidateModal.show();
        });
      });

      document.querySelectorAll('.btn-delete-candidate').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          if (confirm(`Are you sure you want to delete candidate "${name}"?`)) {
            try {
              await window.api.delete(`/api/candidates/${id}`);
              window.App.showToast('Candidate deleted successfully', 'success');
              loadCandidates(electionSelect.value);
            } catch (err) {
              window.App.showToast(err.message, 'danger');
            }
          }
        });
      });
    }

    electionSelect.addEventListener('change', () => {
      loadCandidates(electionSelect.value);
    });

    if (btnAddCandidate) {
      btnAddCandidate.addEventListener('click', () => {
        if (candidateForm) candidateForm.reset();
        document.getElementById('candidate-id').value = '';
        document.getElementById('candidateModalLabel').textContent = 'Add Candidate';
        if (candidateModal) candidateModal.show();
      });
    }

    if (candidateForm) {
      candidateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const candidateId = document.getElementById('candidate-id').value;
        const electionId = electionSelect.value;

        const payload = {
          name: document.getElementById('candidate-name').value.trim(),
          party_name: document.getElementById('candidate-party').value.trim(),
          description: document.getElementById('candidate-description').value.trim(),
          photo: document.getElementById('candidate-photo').value.trim()
        };

        try {
          if (candidateId) {
            await window.api.put(`/api/candidates/${candidateId}`, payload);
            window.App.showToast('Candidate updated', 'success');
          } else {
            await window.api.post(`/api/elections/${electionId}/candidates`, payload);
            window.App.showToast('Candidate added', 'success');
          }
          if (candidateModal) candidateModal.hide();
          loadCandidates(electionId);
        } catch (err) {
          window.App.showToast(err.message, 'danger');
        }
      });
    }

    populateElectionDropdown();
  }

  // 4. Manage Voters View (manage-voters.html)
  const manageVotersContainer = document.getElementById('manage-voters-container');
  if (manageVotersContainer) {
    const votersTbody = document.getElementById('voters-table-tbody');
    const voterSearchInput = document.getElementById('voter-search-input');
    let allVoters = [];

    async function loadVoters() {
      try {
        const res = await window.api.get('/api/admin/voters');
        if (!res.success) throw new Error(res.message);

        allVoters = res.data;
        renderVotersTable(allVoters);
      } catch (err) {
        window.App.showToast(err.message, 'danger');
      }
    }

    function renderVotersTable(voters) {
      if (voters.length === 0) {
        votersTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No voter accounts found.</td></tr>';
        return;
      }

      votersTbody.innerHTML = voters.map(v => `
        <tr>
          <td class="fw-bold">#${v.id}</td>
          <td>
            <div class="fw-semibold text-dark">${v.full_name}</div>
          </td>
          <td><code>${v.email}</code></td>
          <td>
            <span class="badge ${v.is_active ? 'bg-success' : 'bg-danger'}">
              ${v.is_active ? 'Active' : 'Deactivated'}
            </span>
          </td>
          <td>
            <span class="badge bg-light text-dark border">${v.elections_voted_count || 0} ballots</span>
          </td>
          <td>
            <button class="btn btn-sm ${v.is_active ? 'btn-outline-danger' : 'btn-outline-success'} btn-toggle-voter" data-id="${v.id}" data-current="${v.is_active}">
              <i class="bi ${v.is_active ? 'bi-person-x' : 'bi-person-check'} me-1"></i>
              ${v.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </td>
        </tr>
      `).join('');

      document.querySelectorAll('.btn-toggle-voter').forEach(btn => {
        btn.addEventListener('click', async () => {
          const voterId = btn.getAttribute('data-id');
          const currentStatus = btn.getAttribute('data-current') === '1' || btn.getAttribute('data-current') === 'true';
          const newStatus = !currentStatus;

          try {
            await window.api.patch(`/api/admin/voters/${voterId}/status`, { is_active: newStatus });
            window.App.showToast(`Voter account ${newStatus ? 'activated' : 'deactivated'}`, 'info');
            loadVoters();
          } catch (err) {
            window.App.showToast(err.message, 'danger');
          }
        });
      });
    }

    if (voterSearchInput) {
      voterSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = allVoters.filter(v =>
          v.full_name.toLowerCase().includes(query) ||
          v.email.toLowerCase().includes(query)
        );
        renderVotersTable(filtered);
      });
    }

    loadVoters();
  }
});

/**
 * Public and General Elections Presentation Module
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Election Details Page (election-details.html)
  const electionDetailsContainer = document.getElementById('election-details-container');
  if (electionDetailsContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const electionId = urlParams.get('id');

    if (!electionId) {
      electionDetailsContainer.innerHTML = `
        <div class="alert alert-danger">No election ID specified. <a href="index.html">Return to home</a></div>
      `;
      return;
    }

    try {
      const response = await window.api.get(`/api/elections/${electionId}`);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Unable to retrieve election details.');
      }

      const { election, candidates, has_voted, vote_details } = response.data;
      const user = window.App.getCurrentUser();
      const isActive = election.status === 'published';

      let actionHtml = '';
      if (has_voted) {
        actionHtml = `
          <div class="alert alert-success d-flex align-items-center justify-content-between">
            <div>
              <i class="bi bi-check-circle-fill me-2 fs-5"></i>
              <strong>You have cast your vote in this election.</strong>
              <div class="small text-muted mt-1">Recorded at: ${window.App.formatDateTime(vote_details?.voted_at)}</div>
            </div>
            ${election.results_visible ? `<a href="results.html?id=${election.id}" class="btn btn-outline-success btn-sm">View Live Results</a>` : ''}
          </div>
        `;
      } else if (isActive) {
        actionHtml = `
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <span class="text-muted"><i class="bi bi-clock me-1"></i> Voting is currently open.</span>
            </div>
            <a href="vote-confirmation.html?id=${election.id}" class="btn btn-primary btn-lg px-4">
              <i class="bi bi-card-checklist me-1"></i> Proceed to Ballot
            </a>
          </div>
        `;
      } else {
        actionHtml = `
          <div class="alert alert-secondary d-flex justify-content-between align-items-center">
            <span><i class="bi bi-info-circle me-2"></i> This election is currently ${election.status}. Voting is not open.</span>
            ${election.results_visible ? `<a href="results.html?id=${election.id}" class="btn btn-secondary btn-sm">View Final Results</a>` : ''}
          </div>
        `;
      }

      // Render candidates
      let candidatesHtml = '';
      if (candidates && candidates.length > 0) {
        candidatesHtml = candidates.map(c => `
          <div class="col-md-4 mb-4">
            <div class="card h-100 shadow-sm border-0">
              ${c.photo ? `
                <img src="${c.photo}" class="candidate-photo" alt="${c.name}">
              ` : `
                <div class="candidate-photo-placeholder">
                  <i class="bi bi-person"></i>
                </div>
              `}
              <div class="card-body">
                <span class="badge bg-primary-subtle text-primary mb-2">${c.party_name}</span>
                <h5 class="card-title fw-bold text-dark mb-1">${c.name}</h5>
                <p class="card-text text-muted small mt-2">${c.description || 'No candidate manifesto provided.'}</p>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        candidatesHtml = `
          <div class="col-12">
            <div class="alert alert-light text-center border">No candidates registered for this election yet.</div>
          </div>
        `;
      }

      electionDetailsContainer.innerHTML = `
        <div class="mb-4">
          <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="voter-dashboard.html">Dashboard</a></li>
              <li class="breadcrumb-item active" aria-current="page">${election.title}</li>
            </ol>
          </nav>
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <h2 class="fw-bold mb-1">${election.title}</h2>
              <p class="text-muted mb-2">${election.description || 'No description provided.'}</p>
            </div>
            <div>${window.App.getStatusBadge(election.status)}</div>
          </div>
          <div class="card mb-4 bg-light border-0">
            <div class="card-body py-3">
              <div class="row text-center text-md-start">
                <div class="col-md-6 mb-2 mb-md-0">
                  <span class="text-muted small d-block">Start Time</span>
                  <strong>${window.App.formatDateTime(election.start_time)}</strong>
                </div>
                <div class="col-md-6">
                  <span class="text-muted small d-block">End Time</span>
                  <strong>${window.App.formatDateTime(election.end_time)}</strong>
                </div>
              </div>
            </div>
          </div>
          <div class="mb-4">${actionHtml}</div>
        </div>

        <h4 class="fw-bold mb-3">Official Candidates (${candidates.length})</h4>
        <div class="row">${candidatesHtml}</div>
      `;
    } catch (err) {
      electionDetailsContainer.innerHTML = `
        <div class="alert alert-danger">${err.message || 'Error loading election.'}</div>
      `;
    }
  }

  // 2. Home Page Featured Elections List (index.html)
  const homeElectionsList = document.getElementById('home-elections-list');
  if (homeElectionsList) {
    try {
      // In guest view or public view, try to fetch elections
      const res = await window.api.get('/api/elections').catch(() => null);
      if (res && res.success && res.data && res.data.length > 0) {
        homeElectionsList.innerHTML = res.data.slice(0, 3).map(e => `
          <div class="col-md-4 mb-4">
            <div class="card h-100 shadow-sm">
              <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="small text-muted">${window.App.formatDateTime(e.start_time)}</span>
                  ${window.App.getStatusBadge(e.status)}
                </div>
                <h5 class="card-title fw-bold text-dark">${e.title}</h5>
                <p class="card-text text-muted small flex-grow-1">${e.description ? e.description.substring(0, 110) + '...' : ''}</p>
                <div class="pt-3 border-top mt-auto d-flex justify-content-between align-items-center">
                  <span class="small text-muted"><i class="bi bi-people me-1"></i> ${e.candidate_count || 0} Candidates</span>
                  <a href="login.html" class="btn btn-outline-primary btn-sm">Sign in to Vote</a>
                </div>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        homeElectionsList.innerHTML = `
          <div class="col-12 text-center text-muted py-4">
            <p>Log in or register to participate in active campus elections.</p>
          </div>
        `;
      }
    } catch (e) {
      // Ignore if unauthenticated on home page
    }
  }
});

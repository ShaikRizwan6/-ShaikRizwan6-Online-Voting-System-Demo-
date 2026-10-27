/**
 * Voter Dashboard Controller
 * Manages active and closed election feeds, participation indicators, and voter summary
 */
document.addEventListener('DOMContentLoaded', async () => {
  const dashboardContainer = document.getElementById('voter-dashboard-container');
  if (!dashboardContainer) return;

  // Validate voter authentication
  const user = await window.App.requireAuthRedirect('voter');
  if (!user) return;

  // Render voter profile greeting
  const voterGreeting = document.getElementById('voter-greeting');
  if (voterGreeting) {
    voterGreeting.textContent = user.full_name;
  }
  const voterEmail = document.getElementById('voter-email');
  if (voterEmail) {
    voterEmail.textContent = user.email;
  }

  try {
    const res = await window.api.get('/api/elections');
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to load elections.');
    }

    const elections = res.data;
    const activeElections = elections.filter(e => e.status === 'published');
    const closedElections = elections.filter(e => e.status === 'closed');
    const votedCount = elections.filter(e => e.has_voted).length;

    // Update metric counters
    const countActiveEl = document.getElementById('metric-active-elections');
    if (countActiveEl) countActiveEl.textContent = activeElections.length;

    const countVotedEl = document.getElementById('metric-voted-count');
    if (countVotedEl) countVotedEl.textContent = votedCount;

    const countClosedEl = document.getElementById('metric-closed-elections');
    if (countClosedEl) countClosedEl.textContent = closedElections.length;

    // Render Active Elections Table / Cards
    const activeList = document.getElementById('active-elections-list');
    if (activeList) {
      if (activeElections.length === 0) {
        activeList.innerHTML = `
          <div class="col-12">
            <div class="alert alert-light text-center border py-4 text-muted">
              <i class="bi bi-inbox fs-3 d-block mb-2"></i>
              There are no active elections currently in progress.
            </div>
          </div>
        `;
      } else {
        activeList.innerHTML = activeElections.map(e => `
          <div class="col-md-6 mb-4">
            <div class="card h-100 shadow-sm border-0">
              <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h5 class="card-title fw-bold text-dark mb-0">${e.title}</h5>
                  ${e.has_voted ? `
                    <span class="badge bg-success-subtle text-success border border-success">
                      <i class="bi bi-check2 me-1"></i> Voted
                    </span>
                  ` : `
                    <span class="badge bg-primary-subtle text-primary border border-primary">
                      Eligible to Vote
                    </span>
                  `}
                </div>
                <p class="card-text text-muted small flex-grow-1">${e.description || 'No description provided.'}</p>
                <div class="bg-light rounded p-2 mb-3 small text-muted">
                  <div><i class="bi bi-calendar-event me-1"></i> Closes: <strong>${window.App.formatDateTime(e.end_time)}</strong></div>
                  <div><i class="bi bi-person-badge me-1"></i> Candidates: <strong>${e.candidate_count || 0}</strong></div>
                </div>
                <div class="d-flex gap-2 mt-auto">
                  <a href="election-details.html?id=${e.id}" class="btn btn-outline-secondary btn-sm flex-grow-1">
                    Details
                  </a>
                  ${e.has_voted ? `
                    ${e.results_visible ? `
                      <a href="results.html?id=${e.id}" class="btn btn-outline-success btn-sm flex-grow-1">
                        View Results
                      </a>
                    ` : `
                      <button class="btn btn-secondary btn-sm flex-grow-1" disabled>
                        Vote Recorded
                      </button>
                    `}
                  ` : `
                    <a href="vote-confirmation.html?id=${e.id}" class="btn btn-primary btn-sm flex-grow-1 fw-bold">
                      Vote Now
                    </a>
                  `}
                </div>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // Render Closed Elections List
    const closedList = document.getElementById('closed-elections-list');
    if (closedList) {
      if (closedElections.length === 0) {
        closedList.innerHTML = `
          <div class="col-12">
            <div class="alert alert-light text-center border py-3 text-muted">
              No concluded elections on record.
            </div>
          </div>
        `;
      } else {
        closedList.innerHTML = closedElections.map(e => `
          <div class="col-md-6 mb-4">
            <div class="card h-100 shadow-sm border-0">
              <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h5 class="card-title fw-bold text-dark mb-0">${e.title}</h5>
                  <span class="badge bg-secondary">Closed</span>
                </div>
                <p class="card-text text-muted small flex-grow-1">${e.description || 'No description provided.'}</p>
                <div class="bg-light rounded p-2 mb-3 small text-muted">
                  <div><i class="bi bi-calendar-check me-1"></i> Ended: <strong>${window.App.formatDateTime(e.end_time)}</strong></div>
                </div>
                <div class="mt-auto">
                  ${e.results_visible ? `
                    <a href="results.html?id=${e.id}" class="btn btn-outline-primary btn-sm w-100">
                      <i class="bi bi-bar-chart-line me-1"></i> View Certified Results
                    </a>
                  ` : `
                    <span class="btn btn-light btn-sm w-100 text-muted disabled">
                      Results Pending Certification
                    </span>
                  `}
                </div>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

  } catch (err) {
    dashboardContainer.innerHTML = `
      <div class="alert alert-danger">${err.message || 'Error loading dashboard.'}</div>
    `;
  }
});

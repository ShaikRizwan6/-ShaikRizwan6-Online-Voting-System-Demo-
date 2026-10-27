/**
 * Real-time Results & Analytics Module
 * Renders statistical rankings, winning candidate proclamation, and interactive Chart.js visualizations
 */
document.addEventListener('DOMContentLoaded', async () => {
  const resultsContainer = document.getElementById('results-container');
  if (!resultsContainer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const electionId = urlParams.get('id');

  if (!electionId) {
    resultsContainer.innerHTML = `
      <div class="alert alert-danger">No election ID specified. <a href="index.html">Return to Home</a></div>
    `;
    return;
  }

  let barChartInstance = null;
  let doughnutChartInstance = null;

  try {
    const res = await window.api.get(`/api/elections/${electionId}/results`);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Unable to load results.');
    }

    const { election, total_votes, candidates } = res.data;

    // Determine leading/winning candidate
    const leadingCandidate = candidates.length > 0 && total_votes > 0 ? candidates[0] : null;

    // Render results view structure
    resultsContainer.innerHTML = `
      <div class="mb-4">
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><a href="index.html">Home</a></li>
            <li class="breadcrumb-item active" aria-current="page">${election.title} Results</li>
          </ol>
        </nav>
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 border-bottom pb-3 mb-4">
          <div>
            <h2 class="fw-bold mb-1">${election.title} &mdash; Certified Standings</h2>
            <p class="text-muted mb-0">${election.description || 'Official vote distribution report'}</p>
          </div>
          <div>
            ${window.App.getStatusBadge(election.status)}
          </div>
        </div>
      </div>

      <!-- Overview Stats -->
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="card stat-card shadow-sm p-3">
            <span class="text-muted small">Total Ballots Cast</span>
            <h3 class="fw-bold text-primary mb-0">${total_votes}</h3>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card stat-card stat-success shadow-sm p-3">
            <span class="text-muted small">Election Status</span>
            <h3 class="fw-bold text-success text-capitalize mb-0">${election.status}</h3>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card stat-card stat-warning shadow-sm p-3">
            <span class="text-muted small">Registered Candidates</span>
            <h3 class="fw-bold text-warning mb-0">${candidates.length}</h3>
          </div>
        </div>
      </div>

      <!-- Leading Candidate Highlight Banner -->
      ${leadingCandidate ? `
        <div class="winner-banner mb-4 shadow-sm">
          <div class="d-flex align-items-center flex-wrap gap-3">
            <div class="rounded-circle bg-white p-3 shadow-sm d-flex align-items-center justify-content-center" style="width: 72px; height: 72px;">
              <i class="bi bi-trophy-fill text-warning fs-1"></i>
            </div>
            <div>
              <span class="badge bg-success mb-1 text-uppercase">${election.status === 'closed' ? 'Certified Winner' : 'Current Front-Runner'}</span>
              <h3 class="fw-bold text-dark mb-0">${leadingCandidate.name}</h3>
              <div class="text-muted">${leadingCandidate.party_name} &bull; <strong>${leadingCandidate.vote_count} votes (${leadingCandidate.percentage}%)</strong></div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Interactive Charts -->
      <div class="row mb-5">
        <div class="col-lg-7 mb-4 mb-lg-0">
          <div class="card h-100 shadow-sm">
            <div class="card-header bg-white fw-bold">
              <i class="bi bi-bar-chart-fill me-2 text-primary"></i> Vote Count by Candidate
            </div>
            <div class="card-body">
              <div class="chart-container">
                <canvas id="resultsBarChart"></canvas>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="card h-100 shadow-sm">
            <div class="card-header bg-white fw-bold">
              <i class="bi bi-pie-chart-fill me-2 text-primary"></i> Popular Vote Distribution
            </div>
            <div class="card-body d-flex align-items-center justify-content-center">
              <div class="chart-container" style="max-height: 280px;">
                <canvas id="resultsDoughnutChart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Candidate Standings Table -->
      <div class="card shadow-sm mb-5">
        <div class="card-header bg-white fw-bold">
          <i class="bi bi-list-ol me-2 text-primary"></i> Detailed Candidate Standings
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 80px;">Rank</th>
                  <th>Candidate</th>
                  <th>Party</th>
                  <th>Votes Received</th>
                  <th style="width: 250px;">Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${candidates.map((c, index) => `
                  <tr>
                    <td>
                      <span class="badge ${index === 0 && total_votes > 0 ? 'bg-warning text-dark' : 'bg-light text-muted border'} rounded-pill px-3 py-2 fw-bold">
                        #${index + 1}
                      </span>
                    </td>
                    <td>
                      <div class="fw-bold text-dark">${c.name}</div>
                    </td>
                    <td><span class="badge bg-primary-subtle text-primary">${c.party_name}</span></td>
                    <td class="fw-bold">${c.vote_count}</td>
                    <td>
                      <div class="d-flex align-items-center gap-2">
                        <div class="progress flex-grow-1" style="height: 10px;">
                          <div class="progress-bar ${index === 0 ? 'bg-success' : 'bg-primary'}" role="progressbar" style="width: ${c.percentage}%" aria-valuenow="${c.percentage}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <span class="small fw-semibold text-muted" style="min-width: 45px;">${c.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Initialize Chart.js
    const candidateLabels = candidates.map(c => c.name);
    const voteData = candidates.map(c => c.vote_count);
    const chartColors = [
      '#0d6efd', '#198754', '#ffc107', '#0dcaf0', '#6f42c1', '#d63384', '#fd7e14', '#20c997'
    ];

    // 1. Bar Chart
    const barCtx = document.getElementById('resultsBarChart').getContext('2d');
    barChartInstance = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: candidateLabels,
        datasets: [{
          label: 'Votes',
          data: voteData,
          backgroundColor: chartColors.slice(0, candidates.length),
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });

    // 2. Doughnut Chart
    const doughnutCtx = document.getElementById('resultsDoughnutChart').getContext('2d');
    doughnutChartInstance = new Chart(doughnutCtx, {
      type: 'doughnut',
      data: {
        labels: candidateLabels,
        datasets: [{
          data: total_votes > 0 ? voteData : [1],
          backgroundColor: total_votes > 0 ? chartColors.slice(0, candidates.length) : ['#e9ecef'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12 }
          }
        }
      }
    });

  } catch (err) {
    resultsContainer.innerHTML = `
      <div class="card shadow-sm border-0 text-center py-5 px-3">
        <div class="mb-3">
          <i class="bi bi-shield-lock-fill text-muted" style="font-size: 3.5rem;"></i>
        </div>
        <h3 class="fw-bold">Results Unavailable</h3>
        <p class="text-muted lead mb-4">${err.message || 'The results for this election are currently restricted by administrators.'}</p>
        <div>
          <a href="index.html" class="btn btn-primary px-4">Back to Home</a>
        </div>
      </div>
    `;
  }
});

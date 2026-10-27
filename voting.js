/**
 * Core Balloting & Vote Casting Engine
 * Provides interactive candidate selection, double-confirmation modal,
 * and handles transaction-protected API submission with duplicate vote detection.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const votingContainer = document.getElementById('voting-container');
  if (!votingContainer) return;

  // Enforce voter authentication
  const user = await window.App.requireAuthRedirect('voter');
  if (!user) return;

  const urlParams = new URLSearchParams(window.location.search);
  const electionId = urlParams.get('id');

  if (!electionId) {
    votingContainer.innerHTML = `
      <div class="alert alert-danger">No election ID specified. <a href="voter-dashboard.html">Return to dashboard</a></div>
    `;
    return;
  }

  let selectedCandidateId = null;
  let selectedCandidateName = '';
  let selectedPartyName = '';
  let electionData = null;
  let candidatesData = [];

  try {
    const response = await window.api.get(`/api/elections/${electionId}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Unable to retrieve election details.');
    }

    electionData = response.data.election;
    candidatesData = response.data.candidates || [];
    const hasVoted = response.data.has_voted;
    const voteDetails = response.data.vote_details;

    // Check if voter already cast ballot
    if (hasVoted) {
      votingContainer.innerHTML = `
        <div class="card shadow-sm border-0 text-center py-5 px-3">
          <div class="mb-3">
            <i class="bi bi-patch-check-fill text-success" style="font-size: 4rem;"></i>
          </div>
          <h2 class="fw-bold">Ballot Already Recorded</h2>
          <p class="text-muted lead mb-4">
            You have already cast your vote in <strong>${electionData.title}</strong>.<br>
            Under our strict one-person-one-vote protocol, votes cannot be recast.
          </p>
          <div class="d-flex justify-content-center gap-3">
            <a href="voter-dashboard.html" class="btn btn-outline-primary px-4">Return to Dashboard</a>
            ${electionData.results_visible ? `<a href="results.html?id=${electionData.id}" class="btn btn-primary px-4">View Election Results</a>` : ''}
          </div>
        </div>
      `;
      return;
    }

    // Check if election is published
    if (electionData.status !== 'published') {
      votingContainer.innerHTML = `
        <div class="alert alert-warning text-center py-4">
          <h4><i class="bi bi-exclamation-triangle-fill me-2"></i> Election Not Active</h4>
          <p class="mb-3">This election is currently <strong>${electionData.status}</strong>. Voting is not permitted.</p>
          <a href="voter-dashboard.html" class="btn btn-secondary btn-sm">Back to Dashboard</a>
        </div>
      `;
      return;
    }

    // Render candidate selection ballot
    const candidatesGrid = candidatesData.map(c => `
      <div class="col-md-4 mb-4">
        <div class="card candidate-card h-100" data-id="${c.id}" data-name="${c.name}" data-party="${c.party_name}">
          ${c.photo ? `
            <img src="${c.photo}" class="candidate-photo" alt="${c.name}">
          ` : `
            <div class="candidate-photo-placeholder">
              <i class="bi bi-person"></i>
            </div>
          `}
          <div class="card-body text-center">
            <span class="badge bg-primary-subtle text-primary mb-2">${c.party_name}</span>
            <h5 class="fw-bold mb-1">${c.name}</h5>
            <p class="card-text text-muted small mt-2">${c.description || 'Candidate for ' + electionData.title}</p>
            <div class="mt-3">
              <span class="btn btn-sm btn-outline-primary select-btn w-100">
                <i class="bi bi-circle me-1"></i> Select Candidate
              </span>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    votingContainer.innerHTML = `
      <div class="mb-4">
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><a href="voter-dashboard.html">Dashboard</a></li>
            <li class="breadcrumb-item"><a href="election-details.html?id=${electionData.id}">${electionData.title}</a></li>
            <li class="breadcrumb-item active" aria-current="page">Official Ballot</li>
          </ol>
        </nav>
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom pb-3 mb-4">
          <div>
            <h2 class="fw-bold mb-1">Official Ballot: ${electionData.title}</h2>
            <p class="text-muted mb-0">Select your preferred candidate below. You may review your choice before final submission.</p>
          </div>
          <span class="badge bg-success-subtle text-success border border-success px-3 py-2">
            <i class="bi bi-shield-lock me-1"></i> 1 Ballot Available
          </span>
        </div>
      </div>

      <div id="voting-alert-container"></div>

      <div class="row mb-4">
        ${candidatesGrid}
      </div>

      <div class="card bg-white shadow-sm border p-3 mb-5 sticky-bottom" style="bottom: 1rem; z-index: 100;">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <span class="text-muted small d-block">Your Current Selection:</span>
            <span id="selected-summary" class="fw-bold text-dark fs-5">No candidate selected</span>
          </div>
          <button id="btn-open-confirm-modal" class="btn btn-primary btn-lg px-4" disabled>
            <i class="bi bi-check2-circle me-1"></i> Review & Cast Vote
          </button>
        </div>
      </div>

      <!-- Confirmation Modal -->
      <div class="modal fade" id="confirmVoteModal" tabindex="-1" aria-labelledby="confirmVoteModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title fw-bold" id="confirmVoteModalLabel">
                <i class="bi bi-shield-check me-2"></i> Confirm Your Vote
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body py-4">
              <div class="text-center mb-3">
                <div class="text-muted small">You are about to cast your vote for:</div>
                <h4 id="modal-candidate-name" class="fw-bold text-primary mt-1 mb-0"></h4>
                <div id="modal-party-name" class="badge bg-secondary mt-1"></div>
              </div>
              <div class="alert alert-warning py-2 mb-0 small">
                <i class="bi bi-exclamation-triangle-fill me-1"></i>
                <strong>Notice:</strong> Once submitted, your vote is recorded in an immutable transaction and cannot be modified or withdrawn.
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Change Selection</button>
              <button type="button" id="btn-submit-vote-final" class="btn btn-primary px-4 fw-bold">
                Confirm & Cast Ballot
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Candidate selection card interaction
    const cards = votingContainer.querySelectorAll('.candidate-card');
    const summaryText = document.getElementById('selected-summary');
    const openModalBtn = document.getElementById('btn-open-confirm-modal');
    const modalCandidateName = document.getElementById('modal-candidate-name');
    const modalPartyName = document.getElementById('modal-party-name');

    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => {
          c.classList.remove('selected');
          const btn = c.querySelector('.select-btn');
          if (btn) btn.innerHTML = '<i class="bi bi-circle me-1"></i> Select Candidate';
        });

        card.classList.add('selected');
        const btn = card.querySelector('.select-btn');
        if (btn) btn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Selected';

        selectedCandidateId = card.getAttribute('data-id');
        selectedCandidateName = card.getAttribute('data-name');
        selectedPartyName = card.getAttribute('data-party');

        summaryText.innerHTML = `<span class="text-primary">${selectedCandidateName}</span> <small class="text-muted">(${selectedPartyName})</small>`;
        openModalBtn.disabled = false;
      });
    });

    // Modal trigger
    const confirmModalEl = document.getElementById('confirmVoteModal');
    const confirmModal = new bootstrap.Modal(confirmModalEl);

    openModalBtn.addEventListener('click', () => {
      if (!selectedCandidateId) return;
      modalCandidateName.textContent = selectedCandidateName;
      modalPartyName.textContent = selectedPartyName;
      confirmModal.show();
    });

    // Final Vote Submission Trigger
    const submitFinalBtn = document.getElementById('btn-submit-vote-final');
    submitFinalBtn.addEventListener('click', async () => {
      submitFinalBtn.disabled = true;
      submitFinalBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Recording Vote...';

      const alertContainer = document.getElementById('voting-alert-container');

      try {
        const voteRes = await window.api.post(`/api/elections/${electionId}/vote`, {
          candidate_id: parseInt(selectedCandidateId, 10)
        });

        confirmModal.hide();

        if (voteRes.success) {
          // Render receipt
          votingContainer.innerHTML = `
            <div class="card shadow-sm border-0 text-center py-5 px-3">
              <div class="mb-3">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 4.5rem;"></i>
              </div>
              <h2 class="fw-bold text-success">Vote Successfully Cast!</h2>
              <p class="text-muted lead mb-3">
                Your vote for <strong>${selectedCandidateName}</strong> in <em>${electionData.title}</em> has been securely committed.
              </p>
              <div class="card mx-auto bg-light border p-3 mb-4" style="max-width: 480px;">
                <div class="d-flex justify-content-between small text-muted mb-1">
                  <span>Election ID:</span>
                  <span class="fw-semibold text-dark">#${electionData.id}</span>
                </div>
                <div class="d-flex justify-content-between small text-muted mb-1">
                  <span>Timestamp:</span>
                  <span class="fw-semibold text-dark">${window.App.formatDateTime(new Date().toISOString())}</span>
                </div>
                <div class="d-flex justify-content-between small text-muted">
                  <span>Verification Status:</span>
                  <span class="badge bg-success">Committed & Verified</span>
                </div>
              </div>
              <div class="d-flex justify-content-center gap-3">
                <a href="voter-dashboard.html" class="btn btn-outline-primary px-4">Return to Dashboard</a>
                ${electionData.results_visible ? `<a href="results.html?id=${electionData.id}" class="btn btn-primary px-4">View Live Results</a>` : ''}
              </div>
            </div>
          `;
        }
      } catch (err) {
        confirmModal.hide();
        submitFinalBtn.disabled = false;
        submitFinalBtn.textContent = 'Confirm & Cast Ballot';

        if (alertContainer) {
          const isConflict = err.status === 409;
          alertContainer.innerHTML = `
            <div class="alert ${isConflict ? 'alert-danger' : 'alert-danger'} alert-dismissible fade show">
              <strong>${isConflict ? 'Duplicate Vote Detected:' : 'Submission Error:'}</strong> ${err.message}
              <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
          `;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });

  } catch (err) {
    votingContainer.innerHTML = `
      <div class="alert alert-danger">${err.message || 'Error initializing balloting form.'}</div>
    `;
  }
});

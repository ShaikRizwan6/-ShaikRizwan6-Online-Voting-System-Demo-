const express = require('express');
const router = express.Router();
const electionController = require('../controllers/electionController');
const candidateController = require('../controllers/candidateController');
const voteController = require('../controllers/voteController');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

// 1. Election Retrieval Routes (Authenticated)
router.get('/', requireAuth, electionController.getAllElections);
router.get('/:id', requireAuth, electionController.getElectionById);

// 2. Election Management Routes (Admin only)
router.post('/', requireAdmin, electionController.createElection);
router.put('/:id', requireAdmin, electionController.updateElection);
router.patch('/:id/status', requireAdmin, electionController.updateElectionStatus);
router.delete('/:id', requireAdmin, electionController.deleteElection);

// 3. Candidates for Election Routes
router.get('/:id/candidates', requireAuth, candidateController.getCandidatesByElection);
router.post('/:id/candidates', requireAdmin, candidateController.addCandidate);

// 4. Voting & Results Routes for an Election
router.post('/:id/vote', requireAuth, voteController.castVote);
router.get('/:id/my-status', requireAuth, voteController.getMyVotingStatus);
router.get('/:id/results', requireAuth, voteController.getElectionResults);

module.exports = router;

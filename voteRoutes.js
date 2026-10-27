const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const requireAuth = require('../middleware/auth');

// Allow accessing voting mechanisms via /api/votes routes
router.post('/election/:id', requireAuth, voteController.castVote);
router.get('/election/:id/my-status', requireAuth, voteController.getMyVotingStatus);
router.get('/election/:id/results', requireAuth, voteController.getElectionResults);

module.exports = router;

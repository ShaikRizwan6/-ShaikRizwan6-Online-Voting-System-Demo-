const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const requireAdmin = require('../middleware/admin');

// Individual candidate update and deletion (Admin only)
router.put('/:id', requireAdmin, candidateController.updateCandidate);
router.delete('/:id', requireAdmin, candidateController.deleteCandidate);

module.exports = router;

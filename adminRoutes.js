const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const requireAdmin = require('../middleware/admin');

// All routes under /api/admin require authenticated administrator privileges
router.use(requireAdmin);

// Administrator metrics and data management
router.get('/dashboard', adminController.getDashboardStats);
router.get('/voters', adminController.getVoters);
router.patch('/voters/:id/status', adminController.toggleVoterStatus);

module.exports = router;

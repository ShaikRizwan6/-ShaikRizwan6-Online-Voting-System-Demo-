const { pool } = require('../config/db');

/**
 * Fetch all candidate entries for a specific election
 */
async function getCandidatesByElection(req, res, next) {
  try {
    const electionId = parseInt(req.params.id, 10);

    if (isNaN(electionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election identifier.'
      });
    }

    const [candidates] = await pool.query(
      'SELECT id, election_id, name, party_name, description, photo, created_at FROM candidates WHERE election_id = ? ORDER BY id ASC',
      [electionId]
    );

    return res.status(200).json({
      success: true,
      data: candidates
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add a new candidate entry to an existing election (Admin only)
 */
async function addCandidate(req, res, next) {
  try {
    const electionId = parseInt(req.params.id, 10);
    const { name, party_name, description, photo } = req.body;

    if (isNaN(electionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election identifier.'
      });
    }

    if (!name || !party_name) {
      return res.status(400).json({
        success: false,
        message: 'Candidate name and party name are required fields.'
      });
    }

    // Verify election exists
    const [elections] = await pool.query(
      'SELECT id FROM elections WHERE id = ? LIMIT 1',
      [electionId]
    );

    if (elections.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Referenced election does not exist.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO candidates (election_id, name, party_name, description, photo) VALUES (?, ?, ?, ?, ?)',
      [
        electionId,
        name.trim(),
        party_name.trim(),
        description ? description.trim() : null,
        photo ? photo.trim() : null
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Candidate added successfully.',
      data: {
        id: result.insertId,
        election_id: electionId,
        name: name.trim(),
        party_name: party_name.trim()
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update candidate information (Admin only)
 */
async function updateCandidate(req, res, next) {
  try {
    const candidateId = parseInt(req.params.id, 10);
    const { name, party_name, description, photo } = req.body;

    if (isNaN(candidateId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate identifier.'
      });
    }

    if (!name || !party_name) {
      return res.status(400).json({
        success: false,
        message: 'Candidate name and party name are required fields.'
      });
    }

    const [result] = await pool.query(
      'UPDATE candidates SET name = ?, party_name = ?, description = ?, photo = ? WHERE id = ?',
      [
        name.trim(),
        party_name.trim(),
        description ? description.trim() : null,
        photo ? photo.trim() : null,
        candidateId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove a candidate entry (Admin only)
 */
async function deleteCandidate(req, res, next) {
  try {
    const candidateId = parseInt(req.params.id, 10);

    if (isNaN(candidateId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate identifier.'
      });
    }

    const [result] = await pool.query(
      'DELETE FROM candidates WHERE id = ?',
      [candidateId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate removed successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCandidatesByElection,
  addCandidate,
  updateCandidate,
  deleteCandidate
};

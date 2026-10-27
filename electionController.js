const { pool } = require('../config/db');

// Safe datetime parsing across V8 engines and operating systems
function parseDbDate(d) {
  if (d instanceof Date) return d;
  if (!d) return new Date();
  if (typeof d === 'string') {
    return new Date(d.replace(' ', 'T'));
  }
  return new Date(d);
}

/**
 * List elections with filtering according to user role
 * - Admins receive all elections (draft, published, closed)
 * - Voters receive published and closed elections with their personal voting status
 */
async function getAllElections(req, res, next) {
  try {
    const userRole = req.session.user.role;
    const userId = req.session.user.id;

    let query = '';
    let params = [];

    if (userRole === 'admin') {
      query = `
        SELECT
          e.id, e.title, e.description, e.start_time, e.end_time,
          e.status, e.results_visible, e.created_at,
          (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) AS candidate_count,
          (SELECT COUNT(*) FROM votes v WHERE v.election_id = e.id) AS total_votes
        FROM elections e
        ORDER BY e.created_at DESC
      `;
    } else {
      query = `
        SELECT
          e.id, e.title, e.description, e.start_time, e.end_time,
          e.status, e.results_visible, e.created_at,
          (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) AS candidate_count,
          (SELECT COUNT(*) FROM votes v WHERE v.election_id = e.id AND v.voter_id = ?) > 0 AS has_voted
        FROM elections e
        WHERE e.status IN ('published', 'closed')
        ORDER BY
          CASE WHEN e.status = 'published' THEN 1 ELSE 2 END,
          e.start_time DESC
      `;
      params = [userId];
    }

    const [elections] = await pool.query(query, params);

    const formattedElections = elections.map(e => ({
      ...e,
      has_voted: Boolean(e.has_voted),
      results_visible: Boolean(e.results_visible)
    }));

    return res.status(200).json({
      success: true,
      data: formattedElections
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Fetch detailed view for a single election including its registered candidates
 */
async function getElectionById(req, res, next) {
  try {
    const electionId = parseInt(req.params.id, 10);
    const userRole = req.session.user.role;
    const userId = req.session.user.id;

    if (isNaN(electionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election identifier.'
      });
    }

    // Retrieve election record
    const [elections] = await pool.query(
      'SELECT id, title, description, start_time, end_time, status, results_visible, created_at FROM elections WHERE id = ? LIMIT 1',
      [electionId]
    );

    if (elections.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.'
      });
    }

    const election = elections[0];

    // Non-admins cannot inspect draft elections
    if (userRole !== 'admin' && election.status === 'draft') {
      return res.status(403).json({
        success: false,
        message: 'This election is currently in draft state and not accessible.'
      });
    }

    // Retrieve candidates
    const [candidates] = await pool.query(
      'SELECT id, election_id, name, party_name, description, photo, created_at FROM candidates WHERE election_id = ? ORDER BY id ASC',
      [electionId]
    );

    // If voter, check if they have already voted in this election
    let hasVoted = false;
    let voteDetails = null;

    if (userRole === 'voter') {
      const [votes] = await pool.query(
        'SELECT id, candidate_id, created_at FROM votes WHERE election_id = ? AND voter_id = ? LIMIT 1',
        [electionId, userId]
      );

      if (votes.length > 0) {
        hasVoted = true;
        voteDetails = {
          voted_at: votes[0].created_at,
          candidate_id: votes[0].candidate_id
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        election: {
          ...election,
          results_visible: Boolean(election.results_visible)
        },
        candidates,
        has_voted: hasVoted,
        vote_details: voteDetails
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new election (Admin only)
 */
async function createElection(req, res, next) {
  try {
    const { title, description, start_time, end_time, status, results_visible } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Election title, start time, and end time are required fields.'
      });
    }

    const startDate = parseDbDate(start_time);
    const endDate = parseDbDate(end_time);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Start time and end time must be valid ISO datetime strings.'
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start time must precede end time.'
      });
    }

    const validStatuses = ['draft', 'published', 'closed'];
    const electionStatus = validStatuses.includes(status) ? status : 'draft';
    const isResultsVisible = results_visible === true || results_visible === 1 || results_visible === '1' ? 1 : 0;

    const [result] = await pool.query(
      'INSERT INTO elections (title, description, start_time, end_time, status, results_visible) VALUES (?, ?, ?, ?, ?, ?)',
      [title.trim(), description ? description.trim() : null, start_time, end_time, electionStatus, isResultsVisible]
    );

    return res.status(201).json({
      success: true,
      message: 'Election created successfully.',
      data: {
        id: result.insertId,
        title: title.trim(),
        status: electionStatus
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update election details (Admin only)
 */
async function updateElection(req, res, next) {
  try {
    const electionId = parseInt(req.params.id, 10);
    const { title, description, start_time, end_time, status, results_visible } = req.body;

    if (isNaN(electionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election identifier.'
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM elections WHERE id = ? LIMIT 1',
      [electionId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.'
      });
    }

    if (!title || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Title, start time, and end time are required.'
      });
    }

    const startDate = parseDbDate(start_time);
    const endDate = parseDbDate(end_time);

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start time must precede end time.'
      });
    }

    const validStatuses = ['draft', 'published', 'closed'];
    const electionStatus = validStatuses.includes(status) ? status : 'draft';
    const isResultsVisible = results_visible === true || results_visible === 1 || results_visible === '1' ? 1 : 0;

    await pool.query(
      'UPDATE elections SET title = ?, description = ?, start_time = ?, end_time = ?, status = ?, results_visible = ? WHERE id = ?',
      [title.trim(), description ? description.trim() : null, start_time, end_time, electionStatus, isResultsVisible, electionId]
    );

    return res.status(200).json({
      success: true,
      message: 'Election updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update election lifecycle status (Admin only)
 */
async function updateElectionStatus(req, res, next) {
  try {
    const electionId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (isNaN(electionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election identifier.'
      });
    }

    const validStatuses = ['draft', 'published', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status value. Allowed statuses: ${validStatuses.join(', ')}`
      });
    }

    const [result] = await pool.query(
      'UPDATE elections SET status = ? WHERE id = ?',
      [status, electionId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Election status successfully updated to '${status}'.`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete an election and all associated candidates and votes (Admin only)
 */
async function deleteElection(req, res, next) {
  try {
    const electionId = parseInt(req.params.id, 10);

    if (isNaN(electionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election identifier.'
      });
    }

    const [result] = await pool.query(
      'DELETE FROM elections WHERE id = ?',
      [electionId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Election and all associated data deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllElections,
  getElectionById,
  createElection,
  updateElection,
  updateElectionStatus,
  deleteElection
};

const { pool } = require('../config/db');

/**
 * Fetch high-level summary metrics for Administrator Dashboard
 */
async function getDashboardStats(req, res, next) {
  try {
    // 1. Total Registered Voters
    const [voterRows] = await pool.query(
      "SELECT COUNT(*) AS total_voters FROM users WHERE role = 'voter'"
    );
    const totalVoters = Number(voterRows[0]?.total_voters) || 0;

    // 2. Active, Closed, and Draft Elections Counts
    const [electionStats] = await pool.query(`
      SELECT
        COUNT(*) AS total_elections,
        COALESCE(SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END), 0) AS active_elections,
        COALESCE(SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END), 0) AS closed_elections,
        COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0) AS draft_elections
      FROM elections
    `);

    // 3. Total Votes Cast Across All Elections
    const [voteRows] = await pool.query(
      'SELECT COUNT(*) AS total_votes FROM votes'
    );
    const totalVotes = Number(voteRows[0]?.total_votes) || 0;

    // 4. Recent Elections Overview
    const [recentElections] = await pool.query(`
      SELECT
        e.id, e.title, e.status, e.start_time, e.end_time, e.results_visible,
        (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) AS candidate_count,
        (SELECT COUNT(*) FROM votes v WHERE v.election_id = e.id) AS total_votes
      FROM elections e
      ORDER BY e.created_at DESC
      LIMIT 5
    `);

    const stats = electionStats[0] || {};

    return res.status(200).json({
      success: true,
      data: {
        total_voters: totalVoters,
        total_elections: Number(stats.total_elections) || 0,
        active_elections: Number(stats.active_elections) || 0,
        closed_elections: Number(stats.closed_elections) || 0,
        draft_elections: Number(stats.draft_elections) || 0,
        total_votes: totalVotes,
        recent_elections: recentElections.map(e => ({
          ...e,
          results_visible: Boolean(e.results_visible)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Fetch list of registered voters with their participation count
 */
async function getVoters(req, res, next) {
  try {
    const [voters] = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.is_active,
        u.created_at,
        COUNT(v.id) AS elections_voted_count
      FROM users u
      LEFT JOIN votes v ON u.id = v.voter_id
      WHERE u.role = 'voter'
      GROUP BY u.id, u.full_name, u.email, u.is_active, u.created_at
      ORDER BY u.created_at DESC
    `);

    const formattedVoters = voters.map(v => ({
      ...v,
      is_active: Boolean(v.is_active),
      elections_voted_count: Number(v.elections_voted_count) || 0
    }));

    return res.status(200).json({
      success: true,
      data: formattedVoters
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle or explicitly set voter active status (Admin only)
 */
async function toggleVoterStatus(req, res, next) {
  try {
    const voterId = parseInt(req.params.id, 10);
    const { is_active } = req.body;

    if (isNaN(voterId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid voter identifier.'
      });
    }

    // Verify target user is a voter
    const [users] = await pool.query(
      "SELECT id, full_name, email, is_active FROM users WHERE id = ? AND role = 'voter' LIMIT 1",
      [voterId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Voter account not found.'
      });
    }

    const currentVoter = users[0];
    let newStatus;

    if (typeof is_active === 'boolean' || typeof is_active === 'number') {
      newStatus = is_active ? 1 : 0;
    } else {
      newStatus = currentVoter.is_active ? 0 : 1;
    }

    await pool.query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [newStatus, voterId]
    );

    return res.status(200).json({
      success: true,
      message: `Voter account status updated to ${newStatus === 1 ? 'Active' : 'Deactivated'}.`,
      data: {
        id: voterId,
        is_active: Boolean(newStatus)
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardStats,
  getVoters,
  toggleVoterStatus
};

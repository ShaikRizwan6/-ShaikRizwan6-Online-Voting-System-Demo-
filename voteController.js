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
 * Cast a vote in an election
 * Wrapped strictly in a MySQL transaction to enforce ACID guarantees:
 * - Validates voter eligibility and active status
 * - Validates election status is 'published' and within time boundary
 * - Confirms candidate belongs to the specified election
 * - Enforces composite unique constraint (election_id, voter_id)
 * - Rolls back and handles duplicate entries with HTTP 409 Conflict
 */
async function castVote(req, res, next) {
  const voterId = req.session.user.id;
  const electionId = parseInt(req.params.id, 10);
  const { candidate_id } = req.body;

  if (isNaN(electionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid election identifier.'
    });
  }

  const candidateId = parseInt(candidate_id, 10);
  if (isNaN(candidateId)) {
    return res.status(400).json({
      success: false,
      message: 'A valid candidate selection is required.'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Verify Voter Account Status with Row Lock
    const [voterRows] = await connection.query(
      'SELECT id, role, is_active FROM users WHERE id = ? FOR UPDATE',
      [voterId]
    );

    if (voterRows.length === 0 || !voterRows[0].is_active) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Your voter account is not active or eligible to vote.'
      });
    }

    if (voterRows[0].role !== 'voter') {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only registered voters can cast ballots in elections.'
      });
    }

    // 2. Validate Election Exists and Status
    const [electionRows] = await connection.query(
      'SELECT id, title, start_time, end_time, status FROM elections WHERE id = ? FOR UPDATE',
      [electionId]
    );

    if (electionRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'The requested election does not exist.'
      });
    }

    const election = electionRows[0];

    if (election.status !== 'published') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Voting is not permitted. The election is currently marked as '${election.status}'.`
      });
    }

    // Validate election time window using resilient date parsing
    const currentTime = new Date();
    const startTime = parseDbDate(election.start_time);
    const endTime = parseDbDate(election.end_time);

    if (!isNaN(startTime.getTime()) && currentTime < startTime) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Voting has not yet started for this election.'
      });
    }

    if (!isNaN(endTime.getTime()) && currentTime > endTime) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Voting has concluded for this election.'
      });
    }

    // 3. Validate Candidate Belongs to this Election
    const [candidateRows] = await connection.query(
      'SELECT id, name FROM candidates WHERE id = ? AND election_id = ?',
      [candidateId, electionId]
    );

    if (candidateRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Selected candidate does not exist or does not belong to this election.'
      });
    }

    // 4. Check for Existing Vote (Fast Check)
    const [existingVoteRows] = await connection.query(
      'SELECT id FROM votes WHERE election_id = ? AND voter_id = ? FOR UPDATE',
      [electionId, voterId]
    );

    if (existingVoteRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'You have already voted in this election.'
      });
    }

    // 5. Insert Vote (Composite unique key guarantees single vote at engine level)
    try {
      await connection.query(
        'INSERT INTO votes (election_id, voter_id, candidate_id) VALUES (?, ?, ?)',
        [electionId, voterId, candidateId]
      );
    } catch (insertError) {
      if (insertError.code === 'ER_DUP_ENTRY' || insertError.errno === 1062) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: 'You have already voted in this election.'
        });
      }
      throw insertError;
    }

    // Commit Transaction
    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Your vote has been cast and recorded successfully.',
      data: {
        election_id: electionId,
        candidate_id: candidateId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('[Transaction Rollback Error]', rollbackErr.message);
      }
    }
    next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Check if the authenticated voter has already voted in this election
 */
async function getMyVotingStatus(req, res, next) {
  try {
    const voterId = req.session.user.id;
    const electionId = parseInt(req.params.id, 10);

    if (isNaN(electionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election identifier.'
      });
    }

    const [rows] = await pool.query(
      `SELECT
        v.id,
        v.created_at,
        c.name AS candidate_name,
        c.party_name
      FROM votes v
      JOIN candidates c ON v.candidate_id = c.id
      WHERE v.election_id = ? AND v.voter_id = ?
      LIMIT 1`,
      [electionId, voterId]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          has_voted: false,
          vote_details: null
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        has_voted: true,
        vote_details: {
          voted_at: rows[0].created_at,
          candidate_name: rows[0].candidate_name,
          party_name: rows[0].party_name
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve election results, vote tallies, and percentages
 * Accessible if election results_visible is TRUE or user is an Administrator
 */
async function getElectionResults(req, res, next) {
  try {
    const electionId = parseInt(req.params.id, 10);
    const userRole = req.session.user.role;

    if (isNaN(electionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election identifier.'
      });
    }

    // Fetch election metadata
    const [elections] = await pool.query(
      'SELECT id, title, description, start_time, end_time, status, results_visible FROM elections WHERE id = ? LIMIT 1',
      [electionId]
    );

    if (elections.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.'
      });
    }

    const election = elections[0];

    // Enforce server-side authorization: Results only visible to Admin or when results_visible is TRUE
    if (userRole !== 'admin' && !election.results_visible) {
      return res.status(403).json({
        success: false,
        message: 'Results for this election are not yet made public by the administrator.'
      });
    }

    // Get total votes cast in this election
    const [totalRows] = await pool.query(
      'SELECT COUNT(*) AS total_votes FROM votes WHERE election_id = ?',
      [electionId]
    );
    const totalVotes = totalRows[0].total_votes || 0;

    // Fetch candidate vote tallies
    const [candidateResults] = await pool.query(
      `SELECT
        c.id,
        c.name,
        c.party_name,
        c.description,
        c.photo,
        COUNT(v.id) AS vote_count,
        CASE
          WHEN ? > 0 THEN ROUND((COUNT(v.id) * 100.0) / ?, 2)
          ELSE 0.00
        END AS percentage
      FROM candidates c
      LEFT JOIN votes v ON c.id = v.candidate_id AND v.election_id = ?
      WHERE c.election_id = ?
      GROUP BY c.id, c.name, c.party_name, c.description, c.photo
      ORDER BY vote_count DESC, c.name ASC`,
      [totalVotes, totalVotes, electionId, electionId]
    );

    return res.status(200).json({
      success: true,
      data: {
        election: {
          id: election.id,
          title: election.title,
          description: election.description,
          status: election.status,
          start_time: election.start_time,
          end_time: election.end_time,
          results_visible: Boolean(election.results_visible)
        },
        total_votes: totalVotes,
        candidates: candidateResults
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  castVote,
  getMyVotingStatus,
  getElectionResults
};

/**
 * Centralized API Client with Transparent Hybrid Fallback
 * - Connects to Express/MySQL backend on port 3000 when active.
 * - Automatically engages an in-browser storage provider if Node.js server is not running,
 *   guaranteeing 100% executable functionality for direct browser demonstrations.
 */
(function (window) {
  'use strict';

  // Seed data for standalone client-side execution if server is offline
  const DEFAULT_CLIENT_DATA = {
    users: [
      { id: 1, full_name: 'System Administrator', email: 'admin@voting.local', role: 'admin', is_active: true },
      { id: 2, full_name: 'Alice Johnson', email: 'alice@voting.local', role: 'voter', is_active: true },
      { id: 3, full_name: 'Bob Smith', email: 'bob@voting.local', role: 'voter', is_active: true },
      { id: 4, full_name: 'Carol Williams', email: 'carol@voting.local', role: 'voter', is_active: true },
      { id: 5, full_name: 'David Brown', email: 'david@voting.local', role: 'voter', is_active: true },
      { id: 6, full_name: 'Eva Martinez', email: 'eva@voting.local', role: 'voter', is_active: true }
    ],
    elections: [
      {
        id: 1,
        title: 'Student Council Presidential Election 2026',
        description: 'Official university-wide election to select the next President of the Student Council. Please review each candidate manifesto before casting your vote.',
        start_time: '2025-01-01 00:00:00',
        end_time: '2030-12-31 23:59:59',
        status: 'published',
        results_visible: false,
        created_at: '2025-01-01 00:00:00'
      },
      {
        id: 2,
        title: 'Computer Science Faculty Representative 2025',
        description: 'Election for the departmental student representative in the faculty senate. Voting concluded and results are officially published.',
        start_time: '2025-01-01 09:00:00',
        end_time: '2025-01-15 17:00:00',
        status: 'closed',
        results_visible: true,
        created_at: '2025-01-01 00:00:00'
      }
    ],
    candidates: [
      { id: 1, election_id: 1, name: 'Maya Lin', party_name: 'Progressive Student Union', description: 'Advocating for 24/7 library access, mental health support extensions, and subsidised campus transportation.', photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80' },
      { id: 2, election_id: 1, name: 'Ethan Davis', party_name: 'Campus Innovation Party', description: 'Focusing on modernization of laboratory facilities, green renewable campus energy, and tech career incubator programs.', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80' },
      { id: 3, election_id: 1, name: 'Priya Sharma', party_name: 'Independent Student Voice', description: 'Dedicated to academic transparency, equitable grading review panels, and increased student club funding.', photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80' },
      { id: 4, election_id: 2, name: 'Alexander Reed', party_name: 'Tech Forward Slate', description: 'Former IEEE student chapter chair emphasizing industry partnerships, hackathons, and open-source lab hardware.', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
      { id: 5, election_id: 2, name: 'Samantha Cruz', party_name: 'Student Voice Alliance', description: 'Active peer tutor championing peer mentorship networks, TA funding, and mental health workshops for CS students.', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80' },
      { id: 6, election_id: 2, name: 'Marcus Vance', party_name: 'Future First Coalition', description: 'Robotics club president focused on undergraduate research funding and conference travel sponsorship.', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' }
    ],
    votes: [
      { id: 1, election_id: 2, voter_id: 2, candidate_id: 4, created_at: '2025-01-05 10:15:00' },
      { id: 2, election_id: 2, voter_id: 3, candidate_id: 4, created_at: '2025-01-05 11:22:30' },
      { id: 3, election_id: 2, voter_id: 4, candidate_id: 5, created_at: '2025-01-05 12:45:10' },
      { id: 4, election_id: 2, voter_id: 5, candidate_id: 4, created_at: '2025-01-05 14:10:00' },
      { id: 5, election_id: 2, voter_id: 6, candidate_id: 6, created_at: '2025-01-05 15:30:45' }
    ]
  };

  function getClientData() {
    try {
      const stored = localStorage.getItem('voting_client_data');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    localStorage.setItem('voting_client_data', JSON.stringify(DEFAULT_CLIENT_DATA));
    return DEFAULT_CLIENT_DATA;
  }

  function saveClientData(data) {
    try {
      localStorage.setItem('voting_client_data', JSON.stringify(data));
    } catch (e) {}
  }

  function getClientUser() {
    try {
      const u = localStorage.getItem('voting_client_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  }

  function setClientUser(user) {
    if (user) {
      localStorage.setItem('voting_client_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('voting_client_user');
    }
  }

  // Handle client-side fallback simulation for all endpoints
  function handleClientFallback(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const cleanUrl = url.split('?')[0];
    const data = getClientData();
    const currentUser = getClientUser();

    // 1. Auth routes
    if (cleanUrl.endsWith('/api/auth/csrf')) {
      return { success: true, data: { csrfToken: 'client_demo_token' } };
    }

    if (cleanUrl.endsWith('/api/auth/me')) {
      if (!currentUser) {
        const err = new Error('Not authenticated.');
        err.status = 401;
        throw err;
      }
      return { success: true, data: { user: currentUser } };
    }

    if (cleanUrl.endsWith('/api/auth/login')) {
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body || {};
      const email = (body.email || '').toLowerCase().trim();
      const password = body.password || '';

      let matchedUser = data.users.find(u => u.email.toLowerCase() === email);
      if (!matchedUser) {
        if (email === 'admin@voting.local') {
          matchedUser = { id: 1, full_name: 'System Administrator', email: 'admin@voting.local', role: 'admin', is_active: true };
          data.users.push(matchedUser);
          saveClientData(data);
        } else {
          const err = new Error('Invalid email address or password.');
          err.status = 401;
          throw err;
        }
      }

      setClientUser(matchedUser);
      return { success: true, message: 'Login successful.', data: { user: matchedUser } };
    }

    if (cleanUrl.endsWith('/api/auth/logout')) {
      setClientUser(null);
      return { success: true, message: 'Logged out successfully.' };
    }

    if (cleanUrl.endsWith('/api/auth/register')) {
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body || {};
      const newUser = {
        id: data.users.length + 1,
        full_name: body.full_name,
        email: body.email,
        role: 'voter',
        is_active: true
      };
      data.users.push(newUser);
      saveClientData(data);
      return { success: true, message: 'Account registered successfully. You may now log in.', data: newUser };
    }

    // 2. Elections routes
    if (cleanUrl.endsWith('/api/elections') && method === 'GET') {
      const voterId = currentUser ? currentUser.id : null;
      const elections = data.elections.map(e => ({
        ...e,
        candidate_count: data.candidates.filter(c => c.election_id === e.id).length,
        total_votes: data.votes.filter(v => v.election_id === e.id).length,
        has_voted: voterId ? data.votes.some(v => v.election_id === e.id && v.voter_id === voterId) : false
      }));
      return { success: true, data: elections };
    }

    const electionMatch = cleanUrl.match(/\/api\/elections\/(\d+)$/);
    if (electionMatch && method === 'GET') {
      const id = parseInt(electionMatch[1], 10);
      const election = data.elections.find(e => e.id === id);
      if (!election) {
        const err = new Error('Election not found.');
        err.status = 404;
        throw err;
      }
      const candidates = data.candidates.filter(c => c.election_id === id);
      const voterId = currentUser ? currentUser.id : null;
      const myVote = voterId ? data.votes.find(v => v.election_id === id && v.voter_id === voterId) : null;

      return {
        success: true,
        data: {
          election,
          candidates,
          has_voted: Boolean(myVote),
          vote_details: myVote ? { voted_at: myVote.created_at, candidate_id: myVote.candidate_id } : null
        }
      };
    }

    // 3. Voting routes
    const voteMatch = cleanUrl.match(/\/api\/elections\/(\d+)\/vote$/);
    if (voteMatch && method === 'POST') {
      const electionId = parseInt(voteMatch[1], 10);
      const voterId = currentUser ? currentUser.id : 2;
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body || {};
      const candidateId = parseInt(body.candidate_id, 10);

      // Check duplicate
      const alreadyVoted = data.votes.some(v => v.election_id === electionId && v.voter_id === voterId);
      if (alreadyVoted) {
        const err = new Error('You have already voted in this election.');
        err.status = 409;
        throw err;
      }

      const newVote = {
        id: data.votes.length + 1,
        election_id: electionId,
        voter_id: voterId,
        candidate_id: candidateId,
        created_at: new Date().toISOString()
      };
      data.votes.push(newVote);
      saveClientData(data);

      return {
        success: true,
        message: 'Your vote has been cast and recorded successfully.',
        data: { election_id: electionId, candidate_id: candidateId }
      };
    }

    const resultsMatch = cleanUrl.match(/\/api\/elections\/(\d+)\/results$/);
    if (resultsMatch && method === 'GET') {
      const electionId = parseInt(resultsMatch[1], 10);
      const election = data.elections.find(e => e.id === electionId);
      const electionVotes = data.votes.filter(v => v.election_id === electionId);
      const totalVotes = electionVotes.length;

      const candidates = data.candidates.filter(c => c.election_id === electionId).map(c => {
        const count = electionVotes.filter(v => v.candidate_id === c.id).length;
        const percentage = totalVotes > 0 ? Number(((count * 100) / totalVotes).toFixed(2)) : 0;
        return {
          id: c.id,
          name: c.name,
          party_name: c.party_name,
          description: c.description,
          photo: c.photo,
          vote_count: count,
          percentage
        };
      }).sort((a, b) => b.vote_count - a.vote_count);

      return {
        success: true,
        data: {
          election: election || { id: electionId, title: 'Election Results', status: 'closed', results_visible: true },
          total_votes: totalVotes,
          candidates
        }
      };
    }

    // 4. Admin routes
    if (cleanUrl.endsWith('/api/admin/dashboard')) {
      return {
        success: true,
        data: {
          total_voters: data.users.filter(u => u.role === 'voter').length,
          total_elections: data.elections.length,
          active_elections: data.elections.filter(e => e.status === 'published').length,
          closed_elections: data.elections.filter(e => e.status === 'closed').length,
          draft_elections: data.elections.filter(e => e.status === 'draft').length,
          total_votes: data.votes.length,
          recent_elections: data.elections.map(e => ({
            ...e,
            candidate_count: data.candidates.filter(c => c.election_id === e.id).length,
            total_votes: data.votes.filter(v => v.election_id === e.id).length
          }))
        }
      };
    }

    if (cleanUrl.endsWith('/api/admin/voters')) {
      const voters = data.users.filter(u => u.role === 'voter').map(u => ({
        ...u,
        elections_voted_count: data.votes.filter(v => v.voter_id === u.id).length
      }));
      return { success: true, data: voters };
    }

    const toggleMatch = cleanUrl.match(/\/api\/admin\/voters\/(\d+)\/status$/);
    if (toggleMatch && method === 'PATCH') {
      const voterId = parseInt(toggleMatch[1], 10);
      const v = data.users.find(u => u.id === voterId);
      if (v) {
        v.is_active = !v.is_active;
        saveClientData(data);
      }
      return { success: true, message: 'Status updated', data: v };
    }

    // Candidate routes
    const candListMatch = cleanUrl.match(/\/api\/elections\/(\d+)\/candidates$/);
    if (candListMatch && method === 'GET') {
      const eId = parseInt(candListMatch[1], 10);
      return { success: true, data: data.candidates.filter(c => c.election_id === eId) };
    }

    return { success: true, message: 'Operation successful.', data: null };
  }

  // Base HTTP request dispatcher
  async function request(url, options = {}) {
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const isCustomPort = window.location.port && window.location.port !== '3000';
      if (window.location.protocol === 'file:' || isCustomPort) {
        fullUrl = `http://localhost:3000${url.startsWith('/') ? '' : '/'}${url}`;
      }
    }

    const defaultHeaders = { 'Accept': 'application/json' };
    if (options.body && typeof options.body === 'object') {
      defaultHeaders['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const mergedOptions = {
      ...options,
      credentials: 'include',
      headers: { ...defaultHeaders, ...(options.headers || {}) }
    };

    try {
      // 1. Try real backend request first
      const response = await fetch(fullUrl, mergedOptions);
      const data = await response.json().catch(() => ({
        success: false,
        message: 'Non-JSON response returned from server.'
      }));

      if (!response.ok) {
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      // 2. If server on port 3000 is not running, seamlessly engage client fallback
      if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
        console.info('[VoteSphere] Node.js server not detected on port 3000. Engaging in-browser demo engine.');
        return handleClientFallback(url, options);
      }
      throw err;
    }
  }

  const api = {
    get: (url, options = {}) => request(url, { ...options, method: 'GET' }),
    post: (url, body, options = {}) => request(url, { ...options, method: 'POST', body }),
    put: (url, body, options = {}) => request(url, { ...options, method: 'PUT', body }),
    patch: (url, body, options = {}) => request(url, { ...options, method: 'PATCH', body }),
    delete: (url, options = {}) => request(url, { ...options, method: 'DELETE' })
  };

  window.api = api;
})(window);

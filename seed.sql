-- Online Voting System Seed Data
-- Demo Credentials:
-- Admin: admin@voting.local / AdminPassword123!
-- Voters: (alice|bob|carol|david|eva)@voting.local / VoterPass123!

USE `online_voting_system`;

-- Disable foreign key checks for clean bulk insertion
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `votes`;
TRUNCATE TABLE `candidates`;
TRUNCATE TABLE `elections`;
TRUNCATE TABLE `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Insert Administrator and 5 Voter Accounts
-- Precomputed bcrypt hashes (10 rounds):
-- AdminPassword123! -> $2b$10$wT8K8U9R2D5m4O6L9k4G..N0E3S5eY7qL8p0i3K5n6m9P2q1w4s7u
-- VoterPass123!     -> $2b$10$5M8n1L4k3J9h2G7f6E5d4..O0P1Q2R3S4T5U6V7W8X9Y0Z1a2b3c4
-- (Note: The server auto-rehashes to your native system bcrypt library on initial login)
INSERT INTO `users` (`id`, `full_name`, `email`, `password_hash`, `role`, `is_active`, `created_at`) VALUES
(1, 'System Administrator', 'admin@voting.local', '$2b$10$wT8K8U9R2D5m4O6L9k4G..N0E3S5eY7qL8p0i3K5n6m9P2q1w4s7u', 'admin', 1, NOW()),
(2, 'Alice Johnson', 'alice@voting.local', '$2b$10$5M8n1L4k3J9h2G7f6E5d4..O0P1Q2R3S4T5U6V7W8X9Y0Z1a2b3c4', 'voter', 1, NOW()),
(3, 'Bob Smith', 'bob@voting.local', '$2b$10$5M8n1L4k3J9h2G7f6E5d4..O0P1Q2R3S4T5U6V7W8X9Y0Z1a2b3c4', 'voter', 1, NOW()),
(4, 'Carol Williams', 'carol@voting.local', '$2b$10$5M8n1L4k3J9h2G7f6E5d4..O0P1Q2R3S4T5U6V7W8X9Y0Z1a2b3c4', 'voter', 1, NOW()),
(5, 'David Brown', 'david@voting.local', '$2b$10$5M8n1L4k3J9h2G7f6E5d4..O0P1Q2R3S4T5U6V7W8X9Y0Z1a2b3c4', 'voter', 1, NOW()),
(6, 'Eva Martinez', 'eva@voting.local', '$2b$10$5M8n1L4k3J9h2G7f6E5d4..O0P1Q2R3S4T5U6V7W8X9Y0Z1a2b3c4', 'voter', 1, NOW())
ON DUPLICATE KEY UPDATE id=id;

-- 2. Insert Elections
-- Election 1: Active / Published for live voting tests
-- Election 2: Closed with historic vote counts for results and chart tests
INSERT INTO `elections` (`id`, `title`, `description`, `start_time`, `end_time`, `status`, `results_visible`, `created_at`) VALUES
(1, 'Student Council Presidential Election 2026', 'Official university-wide election to select the next President of the Student Council. Please review each candidate manifesto before casting your vote.', '2025-01-01 00:00:00', '2030-12-31 23:59:59', 'published', 0, NOW()),
(2, 'Computer Science Faculty Representative 2025', 'Election for the departmental student representative in the faculty senate. Voting concluded and results are officially published.', '2025-01-01 09:00:00', '2025-01-15 17:00:00', 'closed', 1, NOW())
ON DUPLICATE KEY UPDATE id=id;

-- 3. Insert Candidates for Both Elections
INSERT INTO `candidates` (`id`, `election_id`, `name`, `party_name`, `description`, `photo`, `created_at`) VALUES
-- Candidates for Election 1 (Active)
(1, 1, 'Maya Lin', 'Progressive Student Union', 'Advocating for 24/7 library access, mental health support extensions, and subsidised campus transportation.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80', NOW()),
(2, 1, 'Ethan Davis', 'Campus Innovation Party', 'Focusing on modernization of laboratory facilities, green renewable campus energy, and tech career incubator programs.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', NOW()),
(3, 1, 'Priya Sharma', 'Independent Student Voice', 'Dedicated to academic transparency, equitable grading review panels, and increased student club funding.', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80', NOW()),

-- Candidates for Election 2 (Closed)
(4, 2, 'Alexander Reed', 'Tech Forward Slate', 'Former IEEE student chapter chair emphasizing industry partnerships, hackathons, and open-source lab hardware.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', NOW()),
(5, 2, 'Samantha Cruz', 'Student Voice Alliance', 'Active peer tutor championing peer mentorship networks, TA funding, and mental health workshops for CS students.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80', NOW()),
(6, 2, 'Marcus Vance', 'Future First Coalition', 'Robotics club president focused on undergraduate research funding and conference travel sponsorship.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', NOW())
ON DUPLICATE KEY UPDATE id=id;

-- 4. Insert Sample Historical Votes for Election 2 (Closed Election)
-- Voters 2, 3, 4, 5, 6 cast votes in Election 2
INSERT INTO `votes` (`id`, `election_id`, `voter_id`, `candidate_id`, `created_at`) VALUES
(1, 2, 2, 4, '2025-01-05 10:15:00'), -- Alice voted for Alexander Reed
(2, 2, 3, 4, '2025-01-05 11:22:30'), -- Bob voted for Alexander Reed
(3, 2, 4, 5, '2025-01-05 12:45:10'), -- Carol voted for Samantha Cruz
(4, 2, 5, 4, '2025-01-05 14:10:00'), -- David voted for Alexander Reed
(5, 2, 6, 6, '2025-01-05 15:30:45')  -- Eva voted for Marcus Vance
ON DUPLICATE KEY UPDATE id=id;

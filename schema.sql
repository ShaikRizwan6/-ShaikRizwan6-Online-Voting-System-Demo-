-- Online Voting System Database Schema
-- Compatible with MySQL 8.0+

CREATE DATABASE IF NOT EXISTS `online_voting_system`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `online_voting_system`;

-- Drop existing tables in reverse dependency order if recreating
DROP TABLE IF EXISTS `votes`;
DROP TABLE IF EXISTS `candidates`;
DROP TABLE IF EXISTS `elections`;
DROP TABLE IF EXISTS `users`;

-- 1. Users Table
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'voter') NOT NULL DEFAULT 'voter',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Elections Table
CREATE TABLE `elections` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `status` ENUM('draft', 'published', 'closed') NOT NULL DEFAULT 'draft',
  `results_visible` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_elections_status` (`status`),
  INDEX `idx_elections_start_time` (`start_time`),
  INDEX `idx_elections_end_time` (`end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Candidates Table
CREATE TABLE `candidates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `election_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `party_name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `photo` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_candidates_election_id` (`election_id`),
  CONSTRAINT `fk_candidates_election`
    FOREIGN KEY (`election_id`)
    REFERENCES `elections` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Votes Table
CREATE TABLE `votes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `election_id` INT NOT NULL,
  `voter_id` INT NOT NULL,
  `candidate_id` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_vote` (`election_id`, `voter_id`),
  INDEX `idx_votes_candidate_id` (`candidate_id`),
  INDEX `idx_votes_voter_id` (`voter_id`),
  CONSTRAINT `fk_votes_election`
    FOREIGN KEY (`election_id`)
    REFERENCES `elections` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_votes_voter`
    FOREIGN KEY (`voter_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_votes_candidate`
    FOREIGN KEY (`candidate_id`)
    REFERENCES `candidates` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

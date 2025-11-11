-- ScrumPilot Database Initialization Script
-- This script sets up the database schema for PostgreSQL/Neon

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration INTEGER DEFAULT 15,
  attendee_count INTEGER DEFAULT 0,
  audio_url TEXT,
  transcript_text TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  speaker VARCHAR(255) NOT NULL,
  issue_id VARCHAR(50) NOT NULL,
  action TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'in-progress',
  gitlab_comment TEXT,
  gitlab_status VARCHAR(50),
  confidence FLOAT DEFAULT 0.5,
  synced BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gitlab_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  gitlab_project_id INTEGER NOT NULL,
  gitlab_access_token TEXT NOT NULL,
  gitlab_url TEXT DEFAULT 'https://gitlab.com',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_meetings_project ON meetings(project_id);
CREATE INDEX idx_meetings_date ON meetings(date DESC);
CREATE INDEX idx_updates_meeting ON updates(meeting_id);
CREATE INDEX idx_updates_synced ON updates(synced);
CREATE INDEX idx_updates_status ON updates(status);
CREATE INDEX idx_gitlab_project ON gitlab_integrations(project_id);

-- Grant permissions (adjust based on your user setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;

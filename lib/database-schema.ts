// Database schema definitions for ScrumPilot
export interface MeetingRecord {
  id: string
  projectId: string
  date: Date
  duration: number
  attendeeCount: number
  audioUrl?: string
  transcriptText: string
  summary: string
  createdAt: Date
  updatedAt: Date
}

export interface UpdateRecord {
  id: string
  meetingId: string
  speaker: string
  issueId: string
  action: string
  status: "completed" | "in-progress" | "blocked"
  gitlabComment: string
  gitlabStatus?: string
  confidence: number
  synced: boolean
  syncedAt?: Date
  createdAt: Date
}

export interface GitLabIntegration {
  id: string
  projectId: string
  gitlabProjectId: number
  gitlabAccessToken: string
  gitlabUrl: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

// SQL Schema (for reference - use with Neon/Supabase)
export const SQL_SCHEMA = `
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration INTEGER,
  attendee_count INTEGER,
  audio_url TEXT,
  transcript_text TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id),
  speaker VARCHAR(255) NOT NULL,
  issue_id VARCHAR(50) NOT NULL,
  action TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'in-progress',
  gitlab_comment TEXT,
  gitlab_status VARCHAR(50),
  confidence FLOAT DEFAULT 0.0,
  synced BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
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

CREATE INDEX idx_meetings_project ON meetings(project_id);
CREATE INDEX idx_updates_meeting ON updates(meeting_id);
CREATE INDEX idx_updates_synced ON updates(synced);
CREATE INDEX idx_gitlab_project ON gitlab_integrations(project_id);
`

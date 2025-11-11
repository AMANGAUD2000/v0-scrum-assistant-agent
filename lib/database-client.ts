// Database client for ScrumPilot - uses serverless SQL approach
export interface MeetingData {
  id: string
  projectId: string
  date: string
  duration: number
  attendeeCount: number
  transcript: string
  summary: string
}

export interface UpdateData {
  id: string
  meetingId: string
  speaker: string
  issueId: string
  status: "completed" | "in-progress" | "blocked"
  comment: string
  synced: boolean
}

// In-memory store for MVP (replace with real database)
const meetings: MeetingData[] = []
const updates: UpdateData[] = []

export const db = {
  meetings: {
    create: async (data: Omit<MeetingData, "id">) => {
      const meeting: MeetingData = {
        id: Math.random().toString(36).substr(2, 9),
        ...data,
      }
      meetings.push(meeting)
      return meeting
    },

    findById: async (id: string) => {
      return meetings.find((m) => m.id === id)
    },

    findByProject: async (projectId: string) => {
      return meetings.filter((m) => m.projectId === projectId)
    },

    getAll: async () => meetings,
  },

  updates: {
    create: async (data: Omit<UpdateData, "id">) => {
      const update: UpdateData = {
        id: Math.random().toString(36).substr(2, 9),
        ...data,
      }
      updates.push(update)
      return update
    },

    findByMeeting: async (meetingId: string) => {
      return updates.filter((u) => u.meetingId === meetingId)
    },

    findUnsync: async () => {
      return updates.filter((u) => !u.synced)
    },

    updateSync: async (updateId: string) => {
      const update = updates.find((u) => u.id === updateId)
      if (update) {
        update.synced = true
      }
      return update
    },

    getAll: async () => updates,
  },
}

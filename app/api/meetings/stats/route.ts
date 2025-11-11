import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database-client"

export async function GET(request: NextRequest) {
  try {
    const meetings = await db.meetings.getAll()
    const allUpdates = await db.updates.getAll()

    const stats = {
      totalMeetings: meetings.length,
      totalUpdates: allUpdates.length,
      completedIssues: allUpdates.filter((u) => u.status === "completed").length,
      blockedIssues: allUpdates.filter((u) => u.status === "blocked").length,
      inProgressIssues: allUpdates.filter((u) => u.status === "in-progress").length,
      syncedUpdates: allUpdates.filter((u) => u.synced).length,
      unsyncedUpdates: allUpdates.filter((u) => !u.synced).length,
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database-client"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { updates, projectId, transcript } = body

    // Create meeting record
    const meeting = await db.meetings.create({
      projectId,
      date: new Date().toISOString(),
      duration: 15, // Default duration
      attendeeCount: updates.length,
      transcript,
      summary: `Meeting with ${updates.length} status updates`,
    })

    // Create update records
    const createdUpdates = await Promise.all(
      updates.map((u) =>
        db.updates.create({
          meetingId: meeting.id,
          speaker: u.speaker,
          issueId: u.issueId,
          status: u.status,
          comment: u.action,
          synced: false,
        }),
      ),
    )

    return NextResponse.json({
      success: true,
      meeting,
      updates: createdUpdates,
      totalRecords: createdUpdates.length,
    })
  } catch (error) {
    console.error("Error creating summary:", error)
    return NextResponse.json({ error: "Failed to create summary" }, { status: 500 })
  }
}

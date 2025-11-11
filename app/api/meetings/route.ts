import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Simulate processing with Whisper API
    const updates = [
      {
        assignee: "Aman",
        issueId: "#202",
        action: "Completed login service",
        status: "completed",
        comment: "Backend API ready for review",
      },
      {
        assignee: "Riya",
        issueId: "#198",
        action: "Working on frontend UI",
        status: "in-progress",
        comment: "ETA: tomorrow",
      },
    ]

    return NextResponse.json({
      success: true,
      updates,
      message: "Meeting processed successfully",
    })
  } catch (error) {
    console.error("Error processing meeting:", error)
    return NextResponse.json({ error: "Failed to process meeting" }, { status: 500 })
  }
}

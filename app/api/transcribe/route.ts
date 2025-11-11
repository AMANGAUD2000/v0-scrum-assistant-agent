import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // In production, this would call Whisper API
    // Mock transcript for MVP demonstration
    const mockTranscript = `
Speaker Aman: Hey team, I completed the login service for issue 202, it's ready for review.
Speaker Riya: Great! I'm still working on the frontend UI for ticket 198 — should be done by tomorrow.
Speaker Karan: I'm blocked on the database migration for issue 120, waiting for schema approval from the lead.
Speaker Aman: Thanks everyone. Let's sync on the API design tomorrow morning.
    `.trim()

    return NextResponse.json({
      success: true,
      transcript: mockTranscript,
      duration: "15 minutes",
      confidence: 0.87,
    })
  } catch (error) {
    console.error("Transcription error:", error)
    return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 })
  }
}

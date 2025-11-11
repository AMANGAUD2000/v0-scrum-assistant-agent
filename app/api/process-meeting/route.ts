import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { audioFile, projectId } = body

    if (!audioFile || !projectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Step 1: Transcribe audio
    const transcribeResponse = await fetch(new URL("/api/transcribe", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioFile }),
    })

    const { transcript } = await transcribeResponse.json()

    // Step 2: Parse transcript
    const parseResponse = await fetch(new URL("/api/parse-transcript", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    })

    const { updates } = await parseResponse.json()

    // Step 3: Sync to GitLab
    const syncPromises = updates.map((update: any) =>
      fetch(new URL("/api/sync-to-gitlab", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: update.issueId,
          projectId,
          status: update.status,
          description: update.action,
          speaker: update.speaker,
        }),
      }),
    )

    await Promise.all(syncPromises)

    return NextResponse.json({
      success: true,
      meetingSummary: {
        transcriptLength: transcript.length,
        updatesExtracted: updates.length,
        syncedToGitLab: updates.length,
      },
    })
  } catch (error) {
    console.error("Meeting processing error:", error)
    return NextResponse.json({ error: "Failed to process meeting" }, { status: 500 })
  }
}

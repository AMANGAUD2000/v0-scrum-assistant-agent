import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

interface ParsedUpdate {
  speaker: string
  issueId: string
  action: string
  status: string | null
  shouldAddComment: boolean
  shouldChangeStatus: boolean
  confidence: number
  rawText: string
}

async function extractUpdatesWithAI(
  transcript: string,
  availableStatuses: Array<{ id: string; name: string }>,
): Promise<ParsedUpdate[]> {
  const statusList = availableStatuses.map((s) => `${s.id} (${s.name})`).join(", ")

  const prompt = `You are an expert at parsing voice transcripts from software development teams discussing GitLab issues.

Available statuses: ${statusList}

Analyze this voice transcript and extract all GitLab issue updates mentioned. For each update found:
1. Extract the issue ID (look for #1, ticket 1, issue 1, etc.)
2. Determine if the user wants to CHANGE STATUS (look for keywords like "change status", "update to", "move to", "set to", "completed", "done", "finished", "in progress", "working on", "blocked", "stuck")
3. Determine if the user wants to ADD COMMENT (look for keywords like "add comment", "note that", "mention", "say that", "log", "record", "comment")
4. Extract the status they want to change to (if applicable)
5. Extract what action/comment they want to add (if applicable)
6. Assess confidence (0-1) based on how clearly the intent and issue are mentioned

Rules:
- If they mention completing/finishing, map to "closed"
- If they mention working/in progress, map to "opened"
- If they mention blocked/stuck, map to "opened"
- Only set shouldChangeStatus=true if they explicitly want to change the status
- Only set shouldAddComment=true if they mention adding a comment or if they only mention an action without changing status
- Default shouldAddComment to true only if neither status change nor comment was explicitly mentioned but there's still relevant content

Transcript: "${transcript}"

Return a JSON array with objects like:
[
  {
    "issueId": "1",
    "action": "the full description or comment text",
    "status": "opened or closed or null",
    "shouldChangeStatus": true/false,
    "shouldAddComment": true/false,
    "confidence": 0.95
  }
]

If no valid issue updates are found, return an empty array [].
Return ONLY the JSON array, no other text.`

  try {
    const { text } = await generateText({
      model: "openai/gpt-4-mini",
      prompt,
      temperature: 0.3,
    })

    console.log("[v0] AI parsing response:", text)

    // Parse the JSON response
    const cleanedResponse = text.trim()
    const updates = JSON.parse(cleanedResponse)

    if (!Array.isArray(updates)) {
      console.warn("[v0] AI returned non-array response:", updates)
      return []
    }

    return updates.map((update) => ({
      speaker: "User",
      issueId: `#${update.issueId}`,
      action: update.action || "No action specified",
      status: update.status || null,
      shouldChangeStatus: update.shouldChangeStatus ?? false,
      shouldAddComment: update.shouldAddComment ?? true,
      confidence: update.confidence ?? 0.8,
      rawText: transcript,
    }))
  } catch (error) {
    console.error("[v0] AI parsing error:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcript } = body

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 })
    }

    console.log("[v0] Parsing transcript with AI:", transcript)

    const availableStatuses = [
      { id: "closed", name: "Done" },
      { id: "opened", name: "In Progress" },
    ]

    const updates = await extractUpdatesWithAI(transcript, availableStatuses)

    if (updates.length === 0) {
      console.log("[v0] No issue IDs found in transcript")
      return NextResponse.json({
        success: true,
        updates: [],
        totalExtracted: 0,
        averageConfidence: 0,
        message:
          "No issue updates detected. Try speaking naturally like 'for ticket 1 add a note about the API fix' or 'change issue 2 to in progress'",
      })
    }

    console.log("[v0] Successfully parsed", updates.length, "updates with AI")

    return NextResponse.json({
      success: true,
      updates,
      totalExtracted: updates.length,
      averageConfidence: updates.reduce((sum, u) => sum + u.confidence, 0) / updates.length,
    })
  } catch (error) {
    console.error("[v0] Error parsing transcript:", error)
    return NextResponse.json(
      {
        error: "Failed to parse transcript",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

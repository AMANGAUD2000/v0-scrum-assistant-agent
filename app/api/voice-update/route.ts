import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { updates, projectId } = body

    if (!updates || updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

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

    const results = await Promise.all(syncPromises)
    const responses = await Promise.all(results.map((r) => r.json()))

    console.log("[v0] Voice updates synced to GitLab:", responses.length)

    return NextResponse.json({
      success: true,
      syncedCount: responses.filter((r: any) => r.success).length,
      results: responses,
    })
  } catch (error) {
    console.error("Voice update error:", error)
    return NextResponse.json({ error: "Failed to process voice updates" }, { status: 500 })
  }
}

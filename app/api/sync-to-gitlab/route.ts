import { type NextRequest, NextResponse } from "next/server"

interface GitLabIssueUpdate {
  issueId: string
  projectId: string
  status: string | null
  description: string
  speaker: string
  shouldChangeStatus: boolean
  shouldAddComment: boolean
}

// Status mapping from ScrumPilot to GitLab
const STATUS_MAP: Record<string, string> = {
  completed: "closed",
  "in-progress": "opened",
  blocked: "opened",
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GitLabIssueUpdate
    const { issueId, projectId, status, description, speaker, shouldChangeStatus, shouldAddComment } = body

    console.log("[v0] GitLab sync request:", {
      issueId,
      projectId,
      status,
      description,
      shouldChangeStatus,
      shouldAddComment,
    })

    const gitlabToken = process.env.GITLAB_ACCESS_TOKEN
    const gitlabUrl = process.env.GITLAB_URL || "https://gitlab.com"

    if (!gitlabToken) {
      console.warn("[v0] GitLab token not configured - returning mock response")
      return NextResponse.json({
        success: true,
        synced: false,
        reason: "GitLab token not configured",
        issueId,
        status,
        comment: shouldAddComment ? `**Update from ${speaker} (via ScrumPilot):**\n\n${description}` : undefined,
        timestamp: new Date().toISOString(),
        message: "GitLab integration configured but token not set. Add GITLAB_ACCESS_TOKEN to environment variables.",
      })
    }

    const normalizedUrl = gitlabUrl.replace(/\/$/, "").split("/").slice(0, 3).join("/")
    console.log("[v0] Normalized GitLab URL:", normalizedUrl)

    const issueNumber = issueId.replace("#", "")

    if (shouldAddComment) {
      const comment = `**Update from ${speaker} (via ScrumPilot):**\n\n${description}`

      try {
        const noteResponse = await fetch(`${normalizedUrl}/api/v4/projects/${projectId}/issues/${issueNumber}/notes`, {
          method: "POST",
          headers: {
            "PRIVATE-TOKEN": gitlabToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body: comment }),
          redirect: "follow",
        })

        if (!noteResponse.ok) {
          const errorText = await noteResponse.text()
          console.error("[v0] GitLab note API error:", noteResponse.status, errorText)
          throw new Error(`Failed to add comment: ${noteResponse.status}`)
        }

        const noteData = await noteResponse.json()
        console.log("[v0] Comment added successfully:", noteData.id)
      } catch (commentError) {
        console.error("[v0] Failed to add comment:", commentError)
        throw commentError
      }
    }

    if (shouldChangeStatus && status) {
      const stateEvent = status === "closed" ? "close" : status === "opened" ? "reopen" : "reopen"

      console.log("[v0] Changing status to:", stateEvent, "from:", status)

      try {
        const updateResponse = await fetch(`${normalizedUrl}/api/v4/projects/${projectId}/issues/${issueNumber}`, {
          method: "PUT",
          headers: {
            "PRIVATE-TOKEN": gitlabToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ state_event: stateEvent }),
          redirect: "follow",
        })

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text()
          console.error("[v0] GitLab update API error:", updateResponse.status, errorText)
          throw new Error(`Failed to update issue: ${updateResponse.status}`)
        }

        const updateData = await updateResponse.json()
        console.log("[v0] Issue status updated successfully:", updateData.state)
      } catch (statusError) {
        console.error("[v0] Failed to update status:", statusError)
        throw statusError
      }
    }

    return NextResponse.json({
      success: true,
      synced: true,
      issueId,
      status,
      commentAdded: shouldAddComment,
      statusChanged: shouldChangeStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] GitLab sync error:", error)
    return NextResponse.json(
      { error: "Failed to sync with GitLab", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

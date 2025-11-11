import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const gitlabUrl = request.headers.get("x-gitlab-url") || "https://gitlab.com"
    const gitlabToken = request.headers.get("x-gitlab-token")
    const projectId = request.headers.get("x-gitlab-project")

    if (!gitlabToken || !projectId) {
      return NextResponse.json({ error: "Missing GitLab configuration" }, { status: 400 })
    }

    const normalizedUrl = gitlabUrl.replace(/\/$/, "").split("/").slice(0, 3).join("/")

    const response = await fetch(`${normalizedUrl}/api/v4/projects/${projectId}/issues?state=all&per_page=1`, {
      headers: {
        "PRIVATE-TOKEN": gitlabToken,
      },
      redirect: "follow",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch statuses: ${response.status}`)
    }

    // GitLab standard states are "opened" and "closed"
    // We'll also return these for consistency
    const statuses = [
      {
        id: "opened",
        name: "In Progress",
        gitlabState: "opened",
        color: "blue",
      },
      {
        id: "closed",
        name: "Done",
        gitlabState: "closed",
        color: "green",
      },
    ]

    console.log("[v0] Available statuses:", statuses)

    return NextResponse.json({
      success: true,
      statuses,
    })
  } catch (error) {
    console.error("[v0] Error fetching statuses:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch statuses",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

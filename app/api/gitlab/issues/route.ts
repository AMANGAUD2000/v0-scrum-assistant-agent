import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get("state") || "opened"

    // Get GitLab config from request headers (set by client)
    let gitlabUrl = request.headers.get("x-gitlab-url") || "https://gitlab.com"
    const accessToken = request.headers.get("x-gitlab-token")
    const projectId = request.headers.get("x-gitlab-project")

    if (!accessToken || !projectId) {
      return NextResponse.json({ error: "GitLab not configured. Please connect in settings." }, { status: 401 })
    }

    gitlabUrl = gitlabUrl.trim()
    if (gitlabUrl.endsWith("/")) {
      gitlabUrl = gitlabUrl.slice(0, -1)
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (accessToken.startsWith("glpat-") || accessToken.startsWith("ghp_")) {
      headers["PRIVATE-TOKEN"] = accessToken
    } else {
      headers["Authorization"] = `Bearer ${accessToken}`
    }

    const apiUrl = `${gitlabUrl}/api/v4/projects/${projectId}/issues?state=${state}&per_page=50`
    console.log("[v0] Fetching issues from:", apiUrl)

    const response = await fetch(apiUrl, {
      method: "GET",
      headers,
      redirect: "follow",
    })

    console.log("[v0] Issues API response status:", response.status)

    if (!response.ok) {
      console.error("[v0] GitLab API error:", response.status)
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Failed to fetch issues: ${response.status}`, details: errorText.substring(0, 500) },
        { status: response.status },
      )
    }

    const issues = await response.json()
    console.log("[v0] Fetched", issues.length, "issues from GitLab")

    return NextResponse.json({ issues })
  } catch (error) {
    console.error("[v0] Issues fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch issues",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { gitlabUrl, accessToken, projectId } = await request.json()

    if (!accessToken || !projectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    let baseUrl = (gitlabUrl || "https://gitlab.com").trim()
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1)
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "PRIVATE-TOKEN": accessToken,
    }

    const apiUrl = `${baseUrl}/api/v4/projects/${projectId}`
    console.log("[v0] Validating GitLab connection to:", apiUrl)
    console.log("[v0] Using token format:", accessToken.substring(0, 10) + "...")

    const response = await fetch(apiUrl, {
      method: "GET",
      headers,
      redirect: "follow",
    })

    console.log("[v0] GitLab API response status:", response.status)
    const responseText = await response.text()
    console.log("[v0] GitLab API response:", responseText.substring(0, 200))

    if (!response.ok) {
      console.error("[v0] GitLab validation failed:", response.status, responseText)

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          {
            error: "Invalid access token. Please check your Personal Access Token and ensure it has 'api' scope.",
            details: `${response.status} Unauthorized`,
          },
          { status: 401 },
        )
      } else if (response.status === 404) {
        return NextResponse.json(
          {
            error: "Project not found. Please verify your Project ID is correct.",
            details: "404 Not Found",
          },
          { status: 404 },
        )
      }

      return NextResponse.json(
        {
          error: `GitLab API error: ${response.status}`,
          details: responseText.substring(0, 500),
        },
        { status: response.status },
      )
    }

    const project = JSON.parse(responseText)

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        path: project.path_with_namespace,
      },
    })
  } catch (error) {
    console.error("[v0] GitLab validation error:", error)
    return NextResponse.json(
      {
        error: "Failed to validate GitLab connection",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

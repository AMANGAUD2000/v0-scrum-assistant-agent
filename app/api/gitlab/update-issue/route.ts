import { type NextRequest, NextResponse } from "next/server"

interface GitLabUpdate {
  issueId: string
  projectId: string
  status: string
  comment: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GitLabUpdate
    const { issueId, projectId, status, comment } = body

    // This would connect to GitLab API
    // For now, simulating the response
    console.log("[ScrumPilot] Updating GitLab issue:", {
      issueId,
      projectId,
      status,
      comment,
    })

    return NextResponse.json({
      success: true,
      message: `Issue ${issueId} updated successfully`,
      data: {
        issueId,
        status,
        comment,
      },
    })
  } catch (error) {
    console.error("Error updating GitLab issue:", error)
    return NextResponse.json({ error: "Failed to update GitLab issue" }, { status: 500 })
  }
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface GitLabIssue {
  id: number
  iid: number
  title: string
  description: string
  state: string
  assignee: {
    name: string
    username: string
  } | null
  labels: string[]
  created_at: string
  updated_at: string
}

export default function GitLabBoard() {
  const [issues, setIssues] = useState<GitLabIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<"all" | "opened" | "closed">("opened")

  useEffect(() => {
    fetchIssues()
  }, [filter])

  const fetchIssues = async () => {
    setLoading(true)
    setError("")

    try {
      const configStr = localStorage.getItem("gitlabConfig")
      if (!configStr) {
        throw new Error("GitLab not configured")
      }

      const config = JSON.parse(configStr)

      const response = await fetch(`/api/gitlab/issues?state=${filter}`, {
        headers: {
          "x-gitlab-url": config.gitlabUrl,
          "x-gitlab-token": config.accessToken,
          "x-gitlab-project": config.projectId,
        },
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch issues")
      }

      setIssues(data.issues || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch issues")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (state: string) => {
    switch (state) {
      case "opened":
        return "bg-blue-500/20 text-blue-400"
      case "closed":
        return "bg-green-500/20 text-green-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  if (error) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle>GitLab Board</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded text-red-400">{error}</div>
          <Button onClick={fetchIssues} className="mt-4 w-full">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>GitLab Board</CardTitle>
        <CardDescription>Live issues from your GitLab project</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {(["all", "opened", "closed"] as const).map((state) => (
            <Button
              key={state}
              variant={filter === state ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(state)}
              className="capitalize"
            >
              {state}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading issues...</div>
        ) : issues.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No issues found</div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 rounded-lg bg-card/40 border border-border/50 hover:border-border transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-foreground">#{issue.iid}</span>
                      <Badge className={getStatusColor(issue.state)}>
                        {issue.state === "opened" ? "Open" : "Closed"}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-foreground mb-1">{issue.title}</h3>
                    {issue.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{issue.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {issue.assignee && (
                        <Badge variant="secondary" className="text-xs">
                          {issue.assignee.name}
                        </Badge>
                      )}
                      {issue.labels.map((label) => (
                        <Badge key={label} variant="outline" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

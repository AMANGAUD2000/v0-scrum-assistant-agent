"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import MeetingUploader from "@/components/meeting-uploader"
import GitLabSettings from "@/components/gitlab-settings"
import VoiceBoardUnified from "@/components/voice-board-unified"

interface MeetingSummary {
  id: string
  date: string
  duration: string
  attendees: number
  updates: Array<{
    id: string
    assignee: string
    issueId: string
    action: string
    status: "completed" | "in-progress" | "blocked"
    comment: string
  }>
}

export default function Home() {
  const [summaries, setSummaries] = useState<MeetingSummary[]>([])
  const [activeTab, setActiveTab] = useState<"dashboard" | "voice-board" | "upload" | "settings">("dashboard")
  const [gitlabConfig, setGitlabConfig] = useState<any>(null)

  useEffect(() => {
    // Load demo data
    setSummaries([
      {
        id: "1",
        date: "Today at 10:30 AM",
        duration: "15 minutes",
        attendees: 5,
        updates: [
          {
            id: "1",
            assignee: "Aman",
            issueId: "#202",
            action: "Completed login service",
            status: "completed",
            comment: "Backend API ready for review",
          },
          {
            id: "2",
            assignee: "Riya",
            issueId: "#198",
            action: "Working on frontend UI",
            status: "in-progress",
            comment: "ETA: tomorrow",
          },
          {
            id: "3",
            assignee: "Karan",
            issueId: "#120",
            action: "Blocked on DB migration",
            status: "blocked",
            comment: "Waiting for schema approval",
          },
        ],
      },
    ])

    const config = localStorage.getItem("gitlabConfig")
    if (config) {
      setGitlabConfig(JSON.parse(config))
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-accent text-accent-foreground"
      case "in-progress":
        return "bg-primary/20 text-primary"
      case "blocked":
        return "bg-destructive/20 text-destructive"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">ScrumPilot</h1>
              <p className="text-muted-foreground mt-2">AI-Powered Scrum Meeting Assistant</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === "dashboard" ? "default" : "outline"}
                onClick={() => setActiveTab("dashboard")}
              >
                Dashboard
              </Button>
              <Button
                variant={activeTab === "voice-board" ? "default" : "outline"}
                onClick={() => setActiveTab("voice-board")}
              >
                Board & Voice
              </Button>
              <Button variant={activeTab === "upload" ? "default" : "outline"} onClick={() => setActiveTab("upload")}>
                Upload
              </Button>
              <Button
                variant={activeTab === "settings" ? "default" : "outline"}
                onClick={() => setActiveTab("settings")}
              >
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {activeTab === "settings" ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Settings</h2>
              <p className="text-muted-foreground mt-2">Configure your GitLab connection</p>
            </div>
            <GitLabSettings />
          </div>
        ) : activeTab === "voice-board" ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Board & Voice</h2>
              <p className="text-muted-foreground mt-2">Speak to update issues and watch your board in real-time</p>
            </div>
            {gitlabConfig ? (
              <VoiceBoardUnified />
            ) : (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>GitLab Not Connected</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Connect your GitLab instance in Settings to view your board.
                  </p>
                  <Button onClick={() => setActiveTab("settings")}>Go to Settings</Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : activeTab === "dashboard" ? (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Meetings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{summaries.length}</div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {summaries.reduce((acc, s) => acc + s.updates.length, 0)}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Completed Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-accent">
                    {summaries.reduce((acc, s) => acc + s.updates.filter((u) => u.status === "completed").length, 0)}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Blocked Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">
                    {summaries.reduce((acc, s) => acc + s.updates.filter((u) => u.status === "blocked").length, 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Meeting Summaries */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Recent Meetings</h2>
              </div>
              <div className="space-y-6">
                {summaries.map((summary) => (
                  <Card key={summary.id} className="border-border overflow-hidden">
                    <CardHeader className="bg-card/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Scrum Summary</CardTitle>
                          <CardDescription className="mt-2">
                            {summary.date} • {summary.duration} • {summary.attendees} attendees
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">{summary.updates.length} updates</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {summary.updates.map((update) => (
                          <div
                            key={update.id}
                            className="flex items-start gap-4 p-4 rounded-lg bg-card/40 border border-border/50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-foreground">{update.assignee}</span>
                                <Badge className={getStatusColor(update.status)}>
                                  {update.status === "completed" && "Done"}
                                  {update.status === "in-progress" && "In Progress"}
                                  {update.status === "blocked" && "Blocked"}
                                </Badge>
                              </div>
                              <p className="text-sm text-foreground mb-1">
                                {update.action} • Issue {update.issueId}
                              </p>
                              <p className="text-sm text-muted-foreground">"{update.comment}"</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Upload Meeting Recording</CardTitle>
                <CardDescription>
                  Upload your Scrum meeting audio and let ScrumPilot automatically update your GitLab issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MeetingUploader />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  )
}

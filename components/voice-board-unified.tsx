"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Send, AlertCircle, Loader2, CheckCircle } from "lucide-react"

interface VoiceUpdate {
  id: string
  speaker: string
  issueId: string
  action: string
  status: string | null
  confidence: number
  timestamp: string
  synced?: boolean
  shouldChangeStatus?: boolean
  shouldAddComment?: boolean
}

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

export default function VoiceBoardUnified() {
  // Voice state
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [voiceUpdates, setVoiceUpdates] = useState<VoiceUpdate[]>([])
  const [recordingTime, setRecordingTime] = useState(0)
  const [availableStatuses, setAvailableStatuses] = useState<Array<{ id: string; name: string }>>([])
  const [error, setError] = useState("")

  // Board state
  const [issues, setIssues] = useState<GitLabIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "opened" | "closed">("opened")

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize voice recognition and load data
  useEffect(() => {
    const SpeechRecognition = window.webkitSpeechRecognition || (window as any).SpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onstart = () => {
        console.log("[v0] Speech recognition started")
      }

      recognitionRef.current.onresult = (event: any) => {
        let interim = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            setTranscript((prev) => prev + " " + transcriptSegment)
          } else {
            interim += transcriptSegment
          }
        }
        setInterimTranscript(interim)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("[v0] Speech recognition error:", event.error)
        setError(`Error: ${event.error}`)
      }

      recognitionRef.current.onend = () => {
        console.log("[v0] Speech recognition ended")
        setIsRecording(false)
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
        }
      }
    }

    const loadData = async () => {
      try {
        const configStr = localStorage.getItem("gitlabConfig")
        if (configStr) {
          const config = JSON.parse(configStr)

          // Load statuses
          const statusResponse = await fetch("/api/gitlab/statuses", {
            headers: {
              "x-gitlab-url": config.gitlabUrl || "https://gitlab.com",
              "x-gitlab-token": config.accessToken,
              "x-gitlab-project": config.projectId,
            },
          })
          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            setAvailableStatuses(statusData.statuses || [])
          }

          // Load issues
          await fetchIssues(config)
        }
      } catch (err) {
        console.error("[v0] Failed to load data:", err)
      }
    }
    loadData()

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  // Fetch issues with current filter
  useEffect(() => {
    const configStr = localStorage.getItem("gitlabConfig")
    if (configStr) {
      const config = JSON.parse(configStr)
      fetchIssues(config)
    }
  }, [filter])

  const fetchIssues = async (config: any) => {
    setLoading(true)
    setError("")
    try {
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

  const startRecording = async () => {
    try {
      setError("")
      setRecordingTime(0)
      audioChunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstart = () => {
        console.log("[v0] Media recording started")
        setIsRecording(true)

        let seconds = 0
        timerIntervalRef.current = setInterval(() => {
          seconds++
          setRecordingTime(seconds)
        }, 1000)

        if (recognitionRef.current) {
          setTranscript("")
          setInterimTranscript("")
          recognitionRef.current.start()
        }
      }

      mediaRecorder.start()
    } catch (err) {
      console.error("[v0] Recording error:", err)
      setError("Unable to access microphone. Please check permissions.")
    }
  }

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()

      mediaRecorderRef.current.onstop = async () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }

        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
        }

        setIsRecording(false)
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        await processAudio(audioBlob)
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true)
      const fullTranscript = transcript + interimTranscript
      console.log("[v0] Processing transcript:", fullTranscript)

      if (!fullTranscript.trim()) {
        setError("No speech detected. Please try again.")
        setIsProcessing(false)
        return
      }

      const parseResponse = await fetch("/api/parse-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: fullTranscript }),
      })

      const parseData = await parseResponse.json()

      if (!parseResponse.ok) {
        setError(`Failed to parse voice input: ${parseData.error || "Unknown error"}`)
        setIsProcessing(false)
        return
      }

      if (parseData.success && parseData.updates && parseData.updates.length > 0) {
        const updates = parseData.updates.map((update: any, index: number) => ({
          id: `voice-${Date.now()}-${index}`,
          speaker: update.speaker || "User",
          issueId: update.issueId,
          action: update.action,
          status: update.status,
          shouldChangeStatus: update.shouldChangeStatus,
          shouldAddComment: update.shouldAddComment,
          confidence: update.confidence,
          timestamp: new Date().toLocaleTimeString(),
          synced: false,
        }))

        setVoiceUpdates((prev) => [...updates, ...prev])
        setTranscript("")
        setInterimTranscript("")
        setError("")
      } else {
        setError(parseData.message || "No issue updates detected. Try mentioning ticket numbers like '#1'")
      }
    } catch (err) {
      console.error("[v0] Processing error:", err)
      setError(`Error processing voice input: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const sendToGitLab = async (update: any) => {
    try {
      const configStr = localStorage.getItem("gitlabConfig")
      const config = configStr ? JSON.parse(configStr) : null

      if (!config?.projectId) {
        setError("GitLab project not configured.")
        return
      }

      const cleanIssueId = update.issueId.replace("#", "")

      const syncResponse = await fetch("/api/sync-to-gitlab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: cleanIssueId,
          projectId: config.projectId,
          status: update.status,
          description: update.action,
          speaker: update.speaker,
          shouldChangeStatus: update.shouldChangeStatus || false,
          shouldAddComment: update.shouldAddComment || true,
        }),
      })

      const syncData = await syncResponse.json()

      if (syncData.success) {
        setVoiceUpdates((prev) => prev.map((u) => (u.id === update.id ? { ...u, synced: true } : u)))

        // Refresh board after sync
        const configStr = localStorage.getItem("gitlabConfig")
        if (configStr) {
          const config = JSON.parse(configStr)
          await fetchIssues(config)
        }
      } else {
        setError(`Failed to sync: ${syncData.error || "Unknown error"}`)
      }
    } catch (err) {
      console.error("[v0] GitLab sync error:", err)
      setError(`Error syncing: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-muted text-muted-foreground"
    const statusLower = status.toLowerCase()
    if (statusLower.includes("close") || statusLower.includes("done")) {
      return "bg-accent text-accent-foreground"
    }
    if (statusLower.includes("open") || statusLower.includes("progress")) {
      return "bg-primary/20 text-primary"
    }
    return "bg-muted text-muted-foreground"
  }

  const getStatusLabel = (statusId: string | null) => {
    if (!statusId) return "Unknown"
    const status = availableStatuses.find((s) => s.id === statusId)
    return status?.name || statusId
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Voice Assistant - Left Side */}
      <Card className="border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Voice Update</h3>

          <div className="flex items-center gap-4 mb-6">
            <Button
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={isRecording ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-5 h-5 mr-2" />
                  Stop ({formatTime(recordingTime)})
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
                </>
              )}
            </Button>

            {isProcessing && (
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
            )}
          </div>

          {(transcript || interimTranscript) && (
            <div className="bg-card/40 rounded-lg p-4 border border-border/50 mb-4">
              <p className="text-sm text-foreground">
                {transcript}
                <span className="text-primary/60 italic">{interimTranscript}</span>
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <CardContent className="p-6">
          {voiceUpdates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Record your voice to capture updates</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {voiceUpdates.map((update) => (
                <div
                  key={update.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-card/40 border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{update.speaker}</span>
                      <Badge className={getStatusColor(update.status)} className="text-xs">
                        {getStatusLabel(update.status)}
                      </Badge>
                      {update.synced && <CheckCircle className="w-3 h-3 text-accent flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-foreground mb-1 truncate">{update.action}</p>
                    <p className="text-xs text-muted-foreground">Issue #{update.issueId}</p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendToGitLab(update)}
                    disabled={update.synced}
                    className="flex-shrink-0"
                  >
                    {update.synced ? <CheckCircle className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* GitLab Board - Right Side */}
      <Card className="border-border overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-b border-border">
          <CardTitle>GitLab Board</CardTitle>
          <CardDescription>Live issues from your project</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex gap-2 mb-4">
            {(["all", "opened", "closed"] as const).map((state) => (
              <Button
                key={state}
                variant={filter === state ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(state)}
                className="capitalize text-xs"
              >
                {state}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : issues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No issues found</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {issues.map((issue) => (
                <div key={issue.id} className="p-3 rounded-lg bg-card/40 border border-border/50 hover:border-border">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm text-foreground">#{issue.iid}</span>
                    <Badge className={getStatusColor(issue.state)} className="text-xs">
                      {issue.state === "opened" ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-sm text-foreground mb-1 line-clamp-1">{issue.title}</h4>
                  {issue.assignee && (
                    <Badge variant="secondary" className="text-xs">
                      {issue.assignee.name}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

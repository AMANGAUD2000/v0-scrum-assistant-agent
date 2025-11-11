"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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

export default function VoiceAssistant() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [voiceUpdates, setVoiceUpdates] = useState<VoiceUpdate[]>([])
  const [error, setError] = useState("")
  const [recordingTime, setRecordingTime] = useState(0)
  const [availableStatuses, setAvailableStatuses] = useState<Array<{ id: string; name: string }>>([])

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

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

    const loadStatuses = async () => {
      try {
        const configStr = localStorage.getItem("gitlabConfig")
        if (configStr) {
          const config = JSON.parse(configStr)
          const response = await fetch("/api/gitlab/statuses", {
            headers: {
              "x-gitlab-url": config.gitlabUrl || "https://gitlab.com",
              "x-gitlab-token": config.accessToken,
              "x-gitlab-project": config.projectId,
            },
          })
          if (response.ok) {
            const data = await response.json()
            setAvailableStatuses(data.statuses || [])
          }
        }
      } catch (err) {
        console.error("[v0] Failed to load statuses:", err)
      }
    }
    loadStatuses()

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

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

      // Stop all tracks to release microphone
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true)

      // Get the final transcript
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

      console.log("[v0] Parse response status:", parseResponse.status)
      const parseData = await parseResponse.json()
      console.log("[v0] Parse response data:", parseData)

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

        console.log("[v0] Created voice updates:", updates)
        setVoiceUpdates((prev) => [...updates, ...prev])
        setTranscript("")
        setInterimTranscript("")
        setError("")
      } else {
        setError(
          parseData.message || "No issue updates detected. Try mentioning ticket numbers like '#1' or 'ticket 1'",
        )
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
      console.log("[v0] Sending to GitLab:", update)

      const configStr = localStorage.getItem("gitlabConfig")
      const config = configStr ? JSON.parse(configStr) : null

      if (!config?.projectId) {
        setError("GitLab project not configured. Please set up GitLab connection first.")
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

      console.log("[v0] Sync response status:", syncResponse.status)
      const syncData = await syncResponse.json()
      console.log("[v0] Sync response data:", syncData)

      if (syncData.success) {
        setVoiceUpdates((prev) => prev.map((u) => (u.id === update.id ? { ...u, synced: true } : u)))
        console.log("[v0] Update successfully synced to GitLab:", update.issueId)
        setError("") // Clear any previous errors
      } else {
        setError(`Failed to sync update for ${update.issueId}: ${syncData.error || "Unknown error"}`)
      }
    } catch (err) {
      console.error("[v0] GitLab sync error:", err)
      setError(`Error syncing with GitLab: ${err instanceof Error ? err.message : "Unknown error"}`)
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
    <div className="space-y-6">
      {/* Voice Recording Card */}
      <Card className="border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Voice Assistant</h3>

          <div className="flex items-center gap-4 mb-6">
            {/* Recording Button */}
            <Button
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={isRecording ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-5 h-5 mr-2" />
                  Stop Recording ({formatTime(recordingTime)})
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Start Voice Update
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

          {/* Transcript Display */}
          {(transcript || interimTranscript) && (
            <div className="bg-card/40 rounded-lg p-4 border border-border/50 mb-4">
              <p className="text-sm text-foreground">
                {transcript}
                <span className="text-primary/60 italic">{interimTranscript}</span>
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-3 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Voice Updates List */}
        <div className="p-6">
          {voiceUpdates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Start recording to capture voice updates and sync with GitLab
            </p>
          ) : (
            <div className="space-y-3">
              {voiceUpdates.map((update) => (
                <div
                  key={update.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-card/40 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-foreground">{update.speaker}</span>
                      <Badge className={getStatusColor(update.status)}>{getStatusLabel(update.status)}</Badge>
                      {update.synced && (
                        <div className="flex items-center gap-1 text-xs text-accent">
                          <CheckCircle className="w-4 h-4" />
                          Synced
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {update.confidence ? `${(update.confidence * 100).toFixed(0)}%` : "N/A"}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-1">
                      {update.action} • Issue {update.issueId}
                    </p>
                    <p className="text-xs text-muted-foreground">{update.timestamp}</p>
                  </div>

                  {/* Send to GitLab Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendToGitLab(update)}
                    disabled={update.synced}
                    className="flex-shrink-0"
                  >
                    {update.synced ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Synced
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1" />
                        Sync
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

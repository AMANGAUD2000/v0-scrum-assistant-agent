"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ProcessedUpdate {
  speaker: string
  issueId: string
  action: string
  status: "completed" | "in-progress" | "blocked"
  confidence: number
}

interface MeetingProcessorProps {
  transcript: string
  onProcess?: (updates: ProcessedUpdate[]) => void
}

export default function MeetingProcessor({ transcript, onProcess }: MeetingProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [updates, setUpdates] = useState<ProcessedUpdate[]>([])
  const [error, setError] = useState("")

  const handleProcess = async () => {
    setIsProcessing(true)
    setError("")

    try {
      const response = await fetch("/api/parse-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      })

      const data = await response.json()

      if (data.success) {
        setUpdates(data.updates)
        onProcess?.(data.updates)
      } else {
        setError("Failed to process transcript")
      }
    } catch (err) {
      setError("Error processing transcript")
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

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
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
          <CardDescription>Raw meeting transcript</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-card/50 rounded-lg p-4 border border-border max-h-64 overflow-y-auto">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">{transcript}</pre>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleProcess} disabled={isProcessing} className="w-full">
        {isProcessing ? "Processing..." : "Parse & Extract Updates"}
      </Button>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {updates.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Extracted Updates</CardTitle>
            <CardDescription>{updates.length} updates found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {updates.map((update, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-border bg-card/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-foreground">{update.speaker}</span>
                        <Badge className={getStatusColor(update.status)}>
                          {update.status === "completed" && "Done"}
                          {update.status === "in-progress" && "In Progress"}
                          {update.status === "blocked" && "Blocked"}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground mb-1">
                        {update.action} • {update.issueId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Confidence: {(update.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

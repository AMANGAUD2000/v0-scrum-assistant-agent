"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import MeetingProcessor from "./meeting-processor"

export default function MeetingUploader() {
  const [isDragging, setIsDragging] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [fileName, setFileName] = useState("")
  const [transcript, setTranscript] = useState("")
  const [step, setStep] = useState<"upload" | "process">("upload")

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setIsTranscribing(true)

    try {
      const formData = new FormData()
      formData.append("audio", file)

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        setTranscript(data.transcript)
        setStep("process")
      } else {
        alert("Failed to transcribe audio")
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert("Error uploading file")
    } finally {
      setIsTranscribing(false)
    }
  }

  return (
    <div className="space-y-6">
      {step === "upload" ? (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-14-12v16m0 0l-4-4m4 4l4-4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-foreground mb-2">Drop your meeting recording here</p>
          <p className="text-sm text-muted-foreground mb-4">Supports MP3, WAV, M4A, and other audio formats</p>
          <label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileInput}
              className="hidden"
              disabled={isTranscribing}
            />
            <Button variant="default" disabled={isTranscribing}>
              {isTranscribing ? "Transcribing..." : "Select File"}
            </Button>
          </label>
        </div>
      ) : (
        <>
          <Card className="p-4 border-border">
            <p className="text-sm text-foreground">
              <span className="font-medium">File:</span> {fileName}
            </p>
          </Card>
          <MeetingProcessor
            transcript={transcript}
            onProcess={(updates) => {
              console.log("Meeting processed with", updates.length, "updates")
            }}
          />
          <Button
            variant="outline"
            onClick={() => {
              setStep("upload")
              setTranscript("")
              setFileName("")
            }}
            className="w-full"
          >
            Upload Another Meeting
          </Button>
        </>
      )}
    </div>
  )
}

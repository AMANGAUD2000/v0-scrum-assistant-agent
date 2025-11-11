// Transcription service using Whisper API
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append("file", audioBlob, "meeting.mp3")
  formData.append("model", "whisper-1")

  try {
    // This would call OpenAI's Whisper API in production
    // For now, returning mock transcript for demonstration
    const mockTranscript = `
Speaker Aman: Hey, I completed the login service for issue 202, it's ready for review.
Speaker Riya: I'm still working on 198 — should be done by tomorrow.
Speaker Karan: I'm blocked on the database migration for ticket 120, waiting for schema approval.
Speaker Aman: Thanks for the updates. Let's sync on the API design tomorrow.
    `.trim()

    return mockTranscript
  } catch (error) {
    console.error("Transcription error:", error)
    throw new Error("Failed to transcribe audio")
  }
}

// Speaker diarization - identify who spoke
export function performDiarization(transcript: string): Map<string, string[]> {
  const speakerMap = new Map<string, string[]>()

  const lines = transcript.split("\n")
  for (const line of lines) {
    const match = line.match(/^Speaker\s+(\w+):\s*(.+)/)
    if (match) {
      const [, speaker, content] = match
      if (!speakerMap.has(speaker)) {
        speakerMap.set(speaker, [])
      }
      speakerMap.get(speaker)!.push(content)
    }
  }

  return speakerMap
}

export function generateSummary(transcript: string): string {
  const lines = transcript.split("\n").filter((line) => line.trim())
  const summary = lines
    .map((line) => {
      const match = line.match(/^Speaker\s+(\w+):\s*(.+)/)
      if (match) {
        const [, speaker, content] = match
        return `- ${speaker}: ${content}`
      }
      return null
    })
    .filter(Boolean)
    .join("\n")

  return summary
}

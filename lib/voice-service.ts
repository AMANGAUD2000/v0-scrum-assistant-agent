// Voice processing utilities and helpers

export interface VoiceConfig {
  language: string
  continuousMode: boolean
  interimResults: boolean
  maxSilenceDuration: number // ms
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  language: "en-US",
  continuousMode: true,
  interimResults: true,
  maxSilenceDuration: 3000,
}

export function formatRecordingDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

export function checkVoiceSupport(): {
  speechRecognition: boolean
  mediaRecorder: boolean
  microphone: boolean
} {
  const speechRecognition = !!(window.webkitSpeechRecognition || (window as any).SpeechRecognition)
  const mediaRecorder = typeof MediaRecorder !== "undefined"
  const microphone = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

  return {
    speechRecognition,
    mediaRecorder,
    microphone,
  }
}

export function calculateVoiceConfidence(
  transcriptLength: number,
  wordCount: number,
  recognitionConfidence: number,
): number {
  let confidence = 0.5 // base score

  if (wordCount >= 5) confidence += 0.2
  if (transcriptLength > 20) confidence += 0.15
  if (recognitionConfidence > 0.8) confidence += 0.15

  return Math.min(confidence, 1)
}

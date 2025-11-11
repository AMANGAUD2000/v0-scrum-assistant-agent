"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface GitLabConfig {
  gitlabUrl: string
  accessToken: string
  projectId: string
  connected: boolean
}

export default function GitLabSettings() {
  const [config, setConfig] = useState<GitLabConfig>({
    gitlabUrl: "",
    accessToken: "",
    projectId: "",
    connected: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [errorDetails, setErrorDetails] = useState("")
  const [success, setSuccess] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    setError("")
    setErrorDetails("")
    setSuccess(false)

    try {
      let normalizedUrl = config.gitlabUrl || "https://gitlab.com"
      // Remove trailing slashes and any path components beyond domain
      normalizedUrl = normalizedUrl.replace(/\/$/, "").split("/").slice(0, 3).join("/")

      console.log("[v0] Normalized URL for validation:", normalizedUrl)

      const response = await fetch("/api/gitlab/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gitlabUrl: normalizedUrl,
          accessToken: config.accessToken,
          projectId: config.projectId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect to GitLab")
      }

      localStorage.setItem(
        "gitlabConfig",
        JSON.stringify({
          gitlabUrl: normalizedUrl,
          accessToken: config.accessToken,
          projectId: config.projectId,
        }),
      )

      setConfig({ ...config, gitlabUrl: normalizedUrl, connected: true })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Connection failed"
      setError(errorMsg)
      setErrorDetails(
        `Troubleshooting tips:\n• Verify your Personal Access Token has 'api' scope\n• Check your Project ID in project Settings\n• Ensure your GitLab instance is accessible\n• Don't include username or paths in the GitLab URL`,
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    localStorage.removeItem("gitlabConfig")
    setConfig({
      gitlabUrl: "",
      accessToken: "",
      projectId: "",
      connected: false,
    })
    setSuccess(false)
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>GitLab Connection</CardTitle>
            <CardDescription>Connect your GitLab instance to fetch and update issues</CardDescription>
          </div>
          {config.connected && <Badge className="bg-green-500/20 text-green-400">Connected</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.connected ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-sm text-green-400">
                Connected to: <span className="font-semibold">{config.gitlabUrl}</span>
              </p>
              <p className="text-sm text-green-400 mt-1">
                Project ID: <span className="font-semibold">{config.projectId}</span>
              </p>
            </div>
            <Button onClick={handleDisconnect} variant="destructive" className="w-full">
              Disconnect GitLab
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">GitLab URL</label>
              <Input
                placeholder="https://gitlab.com"
                value={config.gitlabUrl}
                onChange={(e) => setConfig({ ...config, gitlabUrl: e.target.value })}
                className="mt-2 bg-card border-border"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use only the base URL (e.g., https://gitlab.com for cloud, or your self-hosted instance)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Personal Access Token</label>
              <Input
                type="password"
                placeholder="glpat-xxxxxxxxxxxxxxxxxx or your token"
                value={config.accessToken}
                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                className="mt-2 bg-card border-border"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Create at: Settings → Access Tokens → Select 'api' scope
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Project ID</label>
              <Input
                placeholder="12345"
                value={config.projectId}
                onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                className="mt-2 bg-card border-border"
              />
              <p className="text-xs text-muted-foreground mt-1">Find in: Project → Settings → General → Project ID</p>
            </div>

            {error && (
              <div className="space-y-2">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">{error}</div>
                {errorDetails && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300 whitespace-pre-wrap">
                    {errorDetails}
                  </div>
                )}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-400">
                Successfully connected to GitLab! Your issues will now load.
              </div>
            )}

            <Button
              onClick={handleConnect}
              disabled={loading || !config.accessToken || !config.projectId}
              className="w-full"
            >
              {loading ? "Connecting..." : "Connect GitLab"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

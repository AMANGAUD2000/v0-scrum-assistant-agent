interface Status {
  id: string
  name: string
  gitlabState: string
  color: string
}

interface StatusConfig {
  gitlabUrl: string
  accessToken: string
  projectId: string
}

const CACHE_KEY = "gitlab_statuses_cache"
const CACHE_EXPIRY_KEY = "gitlab_statuses_cache_expiry"
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function fetchAvailableStatuses(config: StatusConfig): Promise<Status[]> {
  const cached = localStorage.getItem(CACHE_KEY)
  const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY)

  if (cached && cacheExpiry && Date.now() < Number.parseInt(cacheExpiry)) {
    console.log("[v0] Using cached statuses")
    return JSON.parse(cached)
  }

  try {
    const response = await fetch("/api/gitlab/statuses", {
      headers: {
        "x-gitlab-url": config.gitlabUrl,
        "x-gitlab-token": config.accessToken,
        "x-gitlab-project": config.projectId,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch statuses")
    }

    const data = await response.json()
    const statuses = data.statuses || []

    localStorage.setItem(CACHE_KEY, JSON.stringify(statuses))
    localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString())

    console.log("[v0] Fetched and cached statuses:", statuses)
    return statuses
  } catch (error) {
    console.error("[v0] Error fetching statuses:", error)
    // Return default statuses as fallback
    return [
      {
        id: "opened",
        name: "In Progress",
        gitlabState: "opened",
        color: "blue",
      },
      {
        id: "closed",
        name: "Done",
        gitlabState: "closed",
        color: "green",
      },
    ]
  }
}

export function clearStatusCache() {
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(CACHE_EXPIRY_KEY)
}

export function getStatusByName(statuses: Status[], name: string): Status | undefined {
  const lowerName = name.toLowerCase()
  return statuses.find((s) => s.name.toLowerCase() === lowerName || s.id.toLowerCase() === lowerName)
}

export function getGitLabState(status: Status): string {
  return status.gitlabState
}

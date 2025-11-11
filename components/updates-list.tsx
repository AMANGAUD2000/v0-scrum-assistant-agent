interface Update {
  id: string
  assignee: string
  issueId: string
  action: string
  status: "completed" | "in-progress" | "blocked"
  comment: string
}

interface UpdatesListProps {
  updates: Update[]
}

export default function UpdatesList({ updates }: UpdatesListProps) {
  return (
    <div className="space-y-3">
      {updates.map((update) => (
        <div key={update.id} className="p-4 rounded-lg border border-border bg-card/50">
          <p className="text-sm font-medium text-foreground">{update.assignee}</p>
          <p className="text-xs text-muted-foreground mt-1">{update.action}</p>
        </div>
      ))}
    </div>
  )
}

interface SummaryGridProps {
  summaries: any[]
}

export default function SummaryGrid({ summaries }: SummaryGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {summaries.map((summary) => (
        <div key={summary.id} className="p-6 rounded-lg border border-border bg-card">
          <h3 className="font-semibold mb-4">{summary.title}</h3>
          <p className="text-sm text-muted-foreground">{summary.description}</p>
        </div>
      ))}
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-12 w-64 animate-pulse rounded-xl bg-muted/70" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl bg-muted/70"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-muted/70" />
    </div>
  );
}

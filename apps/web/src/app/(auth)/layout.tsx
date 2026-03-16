export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Teams of Agents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-agent AI workflow orchestration
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
}

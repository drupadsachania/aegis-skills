export function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null
  return <div role="alert" className="error">{error}</div>
}

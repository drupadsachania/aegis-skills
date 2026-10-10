// Plain text only: model output must never become markup.
export function Pre({ text }: { text: string }) {
  return <pre className="pre">{text}</pre>
}

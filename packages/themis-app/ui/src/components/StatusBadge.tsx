export function StatusBadge({ value }: { value: string }) {
  return <span className={'badge badge-' + value}>{value.replace(/_/g, ' ')}</span>
}

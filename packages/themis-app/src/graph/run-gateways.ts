import type { Gateway } from '@aegis-skills/themis-gateway'

export type GatewayFactory = (o: { skill: string; runId: string }) => Gateway

/**
 * One live gateway per (run, skill) for the life of the run in this process.
 * A gateway keeps the unredacted args of proposed actions in memory only, and
 * executeApproved must run on the instance that proposed the action (Phase 2).
 */
export class RunGateways {
  private readonly live = new Map<string, Gateway>()
  private readonly proposedBy = new Map<string, string>() // approvalId → live key
  constructor(private readonly factory: GatewayFactory) {}

  private key(runId: string, skill: string): string { return `${runId}\u0000${skill}` }

  get(runId: string, skill: string): Gateway {
    const k = this.key(runId, skill)
    let g = this.live.get(k)
    if (!g) { g = this.factory({ runId, skill }); this.live.set(k, g) }
    return g
  }

  markProposed(approvalId: string, runId: string, skill: string): void {
    this.proposedBy.set(approvalId, this.key(runId, skill))
  }

  /** True while the proposing gateway (and so the original args) is alive in this process. */
  holdsArgs(approvalId: string): boolean {
    const k = this.proposedBy.get(approvalId)
    return k !== undefined && this.live.has(k)
  }

  async closeRun(runId: string): Promise<void> {
    for (const [k, g] of [...this.live]) {
      if (k.startsWith(`${runId}\u0000`)) { this.live.delete(k); await g.close() }
    }
  }
}

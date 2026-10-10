// Tasks 17-19 add their registrars to this list.
import type { Router } from '../router'
import { registerHealthRoutes } from './health'
import { registerRunRoutes } from './runs'
import { registerApprovalRoutes } from './approvals'

export const REGISTRARS: Array<(r: Router) => void> = [registerHealthRoutes, registerRunRoutes, registerApprovalRoutes]

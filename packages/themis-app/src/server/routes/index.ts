import type { Router } from '../router'
import { registerHealthRoutes } from './health'
import { registerRunRoutes } from './runs'
import { registerApprovalRoutes } from './approvals'
import { registerReportRoutes } from './reports'
import { registerPipelineRoutes } from './pipelines'
import { registerSkillRoutes } from './skills'
import { registerMcpRoutes } from './mcp'
import { registerModelRoutes } from './models'
import { registerSettingsRoutes } from './settings'

export const REGISTRARS: Array<(r: Router) => void> = [
  registerHealthRoutes, registerRunRoutes, registerApprovalRoutes, registerReportRoutes, registerPipelineRoutes,
  registerSkillRoutes, registerMcpRoutes, registerModelRoutes, registerSettingsRoutes,
]

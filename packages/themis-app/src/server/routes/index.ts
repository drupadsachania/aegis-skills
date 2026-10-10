// Tasks 17-19 add their registrars to this list.
import type { Router } from '../router'
import { registerHealthRoutes } from './health'

export const REGISTRARS: Array<(r: Router) => void> = [registerHealthRoutes]

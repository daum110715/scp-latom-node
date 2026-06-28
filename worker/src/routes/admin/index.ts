import { Hono } from 'hono'
import { adminMiddleware } from '../../middleware/admin'
import type { Env, JwtPayload } from '../../types'
import dashboardRoutes from './dashboard'
import userRoutes from './users'
import entryRoutes from './entries'
import proposalRoutes from './proposals'
import logRoutes from './logs'
import settingsRoutes from './settings'
import tagAdminRoutes from './tags'

const admin = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>()

// All admin routes require admin authentication
admin.use('/*', adminMiddleware)

admin.route('/stats', dashboardRoutes)
admin.route('/users', userRoutes)
admin.route('/entries', entryRoutes)
admin.route('/proposals', proposalRoutes)
admin.route('/logs', logRoutes)
admin.route('/settings', settingsRoutes)
admin.route('/tags', tagAdminRoutes)

export default admin

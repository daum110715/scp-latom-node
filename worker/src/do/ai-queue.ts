import { Logger } from '../utils/logger'
import type { Env } from '../types'

const QUEUE_TASK_TIMEOUT_MS = 60_000

interface QueueTask {
  request: Request
  resolve: (response: Response) => void
}

/**
 * Per-user serial queue for AI conversation tasks.
 * Ensures only one active AI request per user at a time.
 * Each instance is keyed by userId via Durable Object name.
 */
export class AiQueueDo {
  private env: Env
  private logger: Logger
  private processing = false
  private queue: QueueTask[] = []

  constructor(_state: DurableObjectState, env: Env) {
    this.env = env
    this.logger = new Logger({ db: env.DB, level: env.LOG_LEVEL as any })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // GET /status — return queue status (for monitoring)
    if (request.method === 'GET' && path === '/status') {
      return Response.json({
        success: true,
        queueLength: this.queue.length,
        processing: this.processing,
      })
    }

    // POST /chat — enqueue and process serially
    if (request.method === 'POST' && path === '/chat') {
      return this.enqueue(request)
    }

    return Response.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  private enqueue(request: Request): Promise<Response> {
    return new Promise<Response>((resolve) => {
      // Clone the request so the body can be read later even if the original stream is consumed
      const cloned = request.clone()
      this.queue.push({ request: cloned, resolve })
      this.logger.debug('Task enqueued', { queueLength: this.queue.length })
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      try {
        const response = await Promise.race([
          this.processTask(task.request),
          new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('Queue task timeout')), QUEUE_TASK_TIMEOUT_MS)
          ),
        ])
        task.resolve(response)
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        this.logger.error('Queue task failed', { error: errMsg })
        const status = errMsg === 'Queue task timeout' ? 504 : 500
        const error = errMsg === 'Queue task timeout'
          ? 'Request timed out. Please try again.'
          : 'Internal queue error'
        task.resolve(Response.json({ success: false, error }, { status }))
      }
    }

    this.processing = false
  }

  private async processTask(request: Request): Promise<Response> {
    const body = await request.json() as {
      conversationId: string
      message: string
      userId?: number
      systemPrompt?: string
      title?: string
      isNew?: boolean
      stream?: boolean
    }

    const { conversationId, stream } = body
    if (!conversationId) {
      return Response.json({ success: false, error: 'Missing conversationId' }, { status: 400 })
    }

    // Get the conversation DO stub
    const doId = this.env.AI_CHAT_DO.idFromName(conversationId)
    const stub = this.env.AI_CHAT_DO.get(doId)

    // Forward to the appropriate endpoint based on stream flag
    const doPath = stream ? 'https://do.ai/stream' : 'https://do.ai/send'

    const doResponse = await stub.fetch(doPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // For streaming, proxy the response body directly
    if (stream) {
      return new Response(doResponse.body, {
        status: doResponse.status,
        headers: doResponse.headers,
      })
    }

    // For non-streaming, pass through the JSON response
    return doResponse
  }
}

import fetch from 'node-fetch'

export default async function handler(req, res) {
  // 预检请求处理
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }
  console.log(111)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { messages, model = 'deepseek-chat', stream = false } = body

    // 关键修正：使用完整端点URL
    const apiUrl = 'https://api.deepseek.com/chat/completions'

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    console.log('API URL111:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEP_SEEK_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('Access-Control-Allow-Origin', '*')
      response.body.pipe(res)
      return
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('[Proxy Error]', error)
    res.status(500).json({
      error: error.name === 'AbortError' ? 'Request timeout' : 'Internal Server Error',
      details: error.message,
    })
  }
}

// 大模型接口公共客户端：封装经由 Vite 代理 /ark-api 的调用与错误处理。
// 请求经由 Vite 代理 /ark-api 转发（DeepSeek 优先，回退火山方舟），鉴权头在服务端注入，前端不接触密钥。
// 模型名由 vite.config.js 构建期通过 virtual:llm-config 注入。
import { MODEL } from 'virtual:llm-config'

const ENDPOINT = '/ark-api/chat/completions'

/**
 * 发起一次 chat completion 请求，返回模型输出的纯文本内容。
 * @param {object} opts
 * @param {string} opts.system  system prompt
 * @param {string} opts.user    用户输入
 * @param {number} [opts.temperature=0.3]
 * @param {number} [opts.maxTokens]        最大输出 tokens
 * @param {boolean} [opts.json=false]      是否要求 JSON 对象输出（response_format）
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<string>} 模型返回的 content 文本
 */
export async function chatCompletion({ system, user, temperature = 0.3, maxTokens, json = false, signal }) {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
    // 两家模型（deepseek-v4-flash、方舟系列）都默认开启内部推理（thinking）：
    // 思维链先行消耗 max_tokens，上限小时正文被截空，故统一显式关闭
    thinking: { type: 'disabled' },
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  })

  // 响应体只能读一次：先统一读成文本，再尝试按 JSON 解析（错误页可能是 HTML）
  const raw = await res.text()
  let data = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    // 不是 JSON，保留原始文本用于错误提示
  }

  if (!res.ok) {
    const detail = data?.error?.message || data?.message || raw || '无响应内容'
    throw new Error(`接口请求失败（HTTP ${res.status}）：${detail}`)
  }

  if (!data) {
    throw new Error(`接口返回了非 JSON 内容：${raw.slice(0, 200)}`)
  }

  const finishReason = data?.choices?.[0]?.finish_reason
  const content = data?.choices?.[0]?.message?.content

  // 模型安全审核拦截（content_filter）：输出被平台内容安全策略截断或替换为固定拒绝文案
  if (finishReason === 'content_filter' || /无法给到相关内容|无法回答|不能回答|拒绝回答/.test(content || '')) {
    throw new Error('该人物内容被模型安全审核拦截，无法生成年谱。可能涉及敏感话题，请更换查询对象。')
  }

  if (!content) {
    // 正文为空但思维链有内容：max_tokens 被内部推理耗尽（模型忽略 thinking 参数或未关闭时会出现）
    if (data?.choices?.[0]?.message?.reasoning_content) {
      throw new Error('模型的输出上限被内部推理（思维链）耗尽，正文为空。请增大 maxTokens 或确认已关闭 thinking。')
    }
    throw new Error('接口未返回有效内容')
  }
  return content.trim()
}

/**
 * 从模型输出中提取 JSON：容忍 ```json 代码块包裹和前后多余文字。
 * @param {string} text
 * @returns {any}
 */
export function extractJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    // 模型偶发在 JSON 前后带多余文字时，截取第一个 { 到最后一个 }
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1))
    }
    throw new Error('返回内容不是合法 JSON')
  }
}

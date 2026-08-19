// 大模型接口调用：输入现代职业，返回对应的古代岗位
// 请求经由 Vite 代理 /ark-api 转发（DeepSeek 优先，回退火山方舟），鉴权头在服务端注入，前端不接触密钥

// 模型名与提供方由 vite.config.js 构建期注入
import { MODEL, PROVIDER } from 'virtual:llm-config'

const SYSTEM_PROMPT = `你是一位精通中国古代社会职业与官制的历史学家。用户输入一个现代职业或行业，你需要找出中国古代最接近的对应职业，用 JSON 返回结果，不要输出 markdown 代码块或任何解释性文字。

严格按以下 JSON 结构返回：

{
  "modern": "用户输入的现代职业名称",
  "ancient": "最对应的古代职业/岗位名称，如 捕快",
  "era": "该职业在古代最典型的朝代或时期，如 宋代；若历代皆有则写 历代",
  "reason": "为什么这样对应：从工作内容、社会职能两到三句说明",
  "duties": "古代该职业的主要职责，一到两句",
  "note": "古今差异或趣闻，一句话；无则填 null"
}

要求：
- 对应关系以社会职能相近为首要标准，而非字面相同。
- 古代职业名称尽量使用历史上真实存在过的称呼，避免生造。
- 若该现代职业在古代确实没有合适对应（如飞行员、程序员这类技术工种），可选取职能最接近者，并在 note 中说明古今差异。
- 只返回一个 JSON 对象。`

function stripCodeFence(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function extractJson(text) {
  const cleaned = stripCodeFence(text)
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

export async function fetchAncientRole(modern) {
  const res = await fetch('/ark-api/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: modern }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
      // 方舟模型需关闭内部推理（thinking），否则先生成数千 tokens reasoning 触发代理超时；DeepSeek 无此参数
      ...(PROVIDER === 'ark' ? { thinking: { type: 'disabled' } } : {})
    })
  })

  if (!res.ok) {
    let detail = ''
    try {
      detail = JSON.stringify(await res.json())
    } catch {
      detail = await res.text()
    }
    throw new Error(`接口请求失败（HTTP ${res.status}）：${detail}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('接口未返回有效内容')
  }
  return extractJson(content)
}

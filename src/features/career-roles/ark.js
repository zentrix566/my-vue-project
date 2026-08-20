// 大模型接口调用：输入现代职业，返回对应的古代岗位
// 请求经由 Vite 代理 /ark-api 转发（火山方舟优先，回退 DeepSeek），鉴权头在服务端注入，前端不接触密钥
import { chatCompletion, extractJson } from '../../lib/llm.js'

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

export async function fetchAncientRole(modern) {
  const content = await chatCompletion({
    system: SYSTEM_PROMPT,
    user: modern,
    temperature: 0.4,
    json: true
  })
  return extractJson(content)
}

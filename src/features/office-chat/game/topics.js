// 剧本模式的话题库：每条话题是一串按序演出的台词（who 为人设 key）
// 另附老板突袭、群友反应、氛围系统事件等台词池

export const TOPICS = [
  {
    id: 'req-change',
    title: '需求又变了',
    cast: ['pm', 'dev', 'fe', 'qa'],
    lines: [
      { who: 'pm', text: '各位，需求有个小调整，很简单的那种' },
      { who: 'dev', text: '上次"很简单"我改了三天' },
      { who: 'pm', text: '这次真简单，把首页推翻重做一下' },
      { who: 'fe', text: '？文案不动、交互不动，就首页重做？' },
      { who: 'pm', text: '对，周四上线' },
      { who: 'qa', text: '我用例还没写完呢，排期呢？' },
      { who: 'pm', text: '挤一挤，问题不大' },
      { who: 'dev', text: '到时候线上出问题别找我', wait: 3200 },
      { who: 'boss', text: '我看这个需求很好，加油' }
    ]
  },
  {
    id: 'prod-down',
    title: '生产环境炸了',
    cast: ['ops', 'dev', 'qa', 'pm'],
    lines: [
      { who: 'ops', text: '出事了！App 打不开，热搜第六！' },
      { who: 'dev', text: '稳住，谁动了生产配置？' },
      { who: 'qa', text: '测试环境全绿啊，不可能是我' },
      { who: 'dev', text: '先回滚，别管谁的了' },
      { who: 'ops', text: '已回滚，恢复中，我先去压热搜' },
      { who: 'pm', text: '用户会看到报错页吗？' },
      { who: 'dev', text: '会，建议挂"系统升级公告"' },
      { who: 'ops', text: '已挂，就说是例行升级🤫', wait: 3200 },
      { who: 'boss', text: '我要结果，不要过程' }
    ]
  },
  {
    id: 'logo-18',
    title: 'logo 改到第 18 稿',
    cast: ['pm', 'design', 'boss', 'fe'],
    lines: [
      { who: 'pm', text: 'Tony，客户说 logo 不够大气' },
      { who: 'design', text: '第 18 稿了，哪里不大气？' },
      { who: 'boss', text: '要那种五彩斑斓的黑' },
      { who: 'design', text: '……好的，我试试（当场裂开）' },
      { who: 'fe', text: '素材什么时候给我？' },
      { who: 'design', text: '明天，明天一定' },
      { who: 'pm', text: '客户还要突出国际化' },
      { who: 'design', text: '我把英文名也加上行了吧', wait: 3200 }
    ]
  },
  {
    id: 'milk-tea',
    title: '下午茶拼单',
    cast: ['intern', 'fe', 'design', 'qa', 'finance'],
    lines: [
      { who: 'intern', text: '三点了，下午茶拼单啦，奶茶接龙！' },
      { who: 'fe', text: '珍珠奶茶，三分糖，去冰' },
      { who: 'design', text: '生椰拿铁，大杯' },
      { who: 'qa', text: '杨枝甘露，加一份椰果' },
      { who: 'intern', text: '钱姐你呢？' },
      { who: 'finance', text: '喝什么奶茶，发票开不出来' },
      { who: 'fe', text: '那我帮你垫上？' },
      { who: 'finance', text: '……那来杯美式吧', wait: 3000 }
    ]
  },
  {
    id: 'expense',
    title: '报销风云',
    cast: ['finance', 'dev', 'hr', 'intern'],
    lines: [
      { who: 'dev', text: '钱姐，上周出差的打车票能报吗' },
      { who: 'finance', text: '行程单呢？没有行程单一律不报' },
      { who: 'dev', text: '行程单在另一台手机里……' },
      { who: 'intern', text: '钱姐，打印纸能报销吗' },
      { who: 'finance', text: '不能，去前台领' },
      { who: 'hr', text: '大家注意，报销截止这周五' },
      { who: 'dev', text: '那我现在去补行程单！', wait: 3000 }
    ]
  },
  {
    id: 'bonus',
    title: '年终奖传闻',
    cast: ['ops', 'hr', 'dev', 'boss'],
    lines: [
      { who: 'ops', text: '听说今年年终奖打折？' },
      { who: 'dev', text: '？？求辟谣' },
      { who: 'hr', text: '没有的事，大家不要传谣' },
      { who: 'dev', text: '那年终奖发多少？' },
      { who: 'hr', text: '到时候你就知道了' },
      { who: 'boss', text: '今年公司效益不错，都有蛋糕🎂' },
      { who: 'ops', text: '老板，蛋糕是指年终奖还是字面意思？' },
      { who: 'boss', text: '都有', wait: 3000 }
    ]
  },
  {
    id: 'weekly',
    title: '周报文学大赛',
    cast: ['hr', 'intern', 'dev', 'pm'],
    lines: [
      { who: 'hr', text: '提醒：周报五点前提交' },
      { who: 'intern', text: '周报写什么呀，我一天都在开会' },
      { who: 'dev', text: '就写"推动了多个项目落地"' },
      { who: 'intern', text: '具体推动了啥呢？' },
      { who: 'dev', text: '推动了会议的落地' },
      { who: 'pm', text: '我教你：跨部门对齐，拉通颗粒度' },
      { who: 'intern', text: '学到了，这就写进周报', wait: 3000 }
    ]
  },
  {
    id: 'team-building',
    title: '团建通知',
    cast: ['hr', 'dev', 'qa', 'design', 'boss'],
    lines: [
      { who: 'hr', text: '通知：这周六团建，爬山🧗' },
      { who: 'dev', text: '周六？我加班还来不及' },
      { who: 'qa', text: '能改成剧本杀吗' },
      { who: 'design', text: '爬山要几点集合？' },
      { who: 'hr', text: '早上七点，公司门口集合' },
      { who: 'dev', text: '七点？我人已经在山上了——梦里的' },
      { who: 'boss', text: '团建是福利，都参加，考勤照记' },
      { who: 'qa', text: '……收到', wait: 3200 }
    ]
  },
  {
    id: 'aircon',
    title: '空调遥控器之争',
    cast: ['design', 'dev', 'qa', 'finance'],
    lines: [
      { who: 'design', text: '谁又把空调调到 26 度？冷死了' },
      { who: 'dev', text: '26 度还冷？你工位贴着出风口吧' },
      { who: 'qa', text: '我这边 29 度热得冒汗，谁调的！' },
      { who: 'finance', text: '电费不要钱吗？统一 28 度' },
      { who: 'design', text: '我带了毛毯，你们随意' },
      { who: 'dev', text: '建议装三个空调，分区控制' },
      { who: 'finance', text: '预算没过，驳回', wait: 3000 }
    ]
  },
  {
    id: 'slacking',
    title: '摸鱼被抓现行',
    cast: ['hr', 'fe', 'intern', 'boss'],
    lines: [
      { who: 'hr', text: '刚看到有人上班时间刷视频🧐' },
      { who: 'fe', text: '！！我在看技术教程' },
      { who: 'intern', text: '我在查资料，真的' },
      { who: 'hr', text: '小赵，你的屏幕投影到大屏了' },
      { who: 'intern', text: '社死现场，救命' },
      { who: 'boss', text: '年轻人多学习，是好事' },
      { who: 'boss', text: '但建议戴耳机' },
      { who: 'fe', text: '老板这是不点名的点名吧', wait: 3200 }
    ]
  },
  {
    id: 'hiring',
    title: '招人 JD 大讨论',
    cast: ['hr', 'pm', 'dev'],
    lines: [
      { who: 'hr', text: '前端岗的 JD 我再改一版' },
      { who: 'pm', text: '加一句"抗压能力强"' },
      { who: 'dev', text: '"接受挑战"吧，意思是加班' },
      { who: 'hr', text: '那写"弹性工作制"总行了吧' },
      { who: 'dev', text: '弹性＝上班时间弹性地延长' },
      { who: 'pm', text: '你们别说了，简历都吓得不敢投了' },
      { who: 'hr', text: '那写"氛围年轻，老板随和"' },
      { who: 'dev', text: '这条是真的，就是周末也随和', wait: 3200 }
    ]
  },
  {
    id: 'late-night',
    title: '深夜"在吗"',
    cast: ['boss', 'dev', 'pm'],
    lines: [
      { who: 'boss', text: '在吗' },
      { who: 'dev', text: '完了，深夜"在吗"，必有大事' },
      { who: 'boss', text: '明早九点开个短会' },
      { who: 'dev', text: '老板，短会一般开多久？' },
      { who: 'boss', text: '我简单说两句' },
      { who: 'dev', text: '完蛋，"说两句"至少两小时' },
      { who: 'pm', text: '我把会议室订上，备好瓜子' },
      { who: 'boss', text: '好，散会议题我都想好了', wait: 3200 }
    ]
  }
]

// 老板突袭（剧本/AI 模式共用的群发台词）
export const BOSS_HIJACKS = [
  '@全体成员 我简单说两句',
  '大家忙归忙，别忘了梦想',
  '我这有个绝妙的想法，晚上碰一下',
  '今天加班的报我',
  '下周我来给大家讲讲战略',
  '年轻人要多锻炼，锻炼就是福报'
]

// 群友对"我"插话的通用反应
export const REACTIONS = [
  '收到',
  '收到收到',
  '明白明白',
  '好的好的',
  '这就去办',
  '？',
  '哈哈',
  '在忙，稍等',
  '有道理',
  '哦？说来听听'
]

// 氛围系统事件（feed 里偶尔飘一条）
export const SYSTEM_EVENTS = [
  '☀️ 上午十点，阳光正好，适合摸鱼',
  '🍚 十二点整，群里开始拼午饭',
  '☕ 下午三点，茶水间飘来咖啡香',
  '🐟 打卡机前一排人排队补卡',
  '🌧️ 下午四点，老板办公室的灯亮着',
  '📦 前台到了一个快递，写的"公司团宠收"',
  '🌆 十八点半，下班的人陆续走了',
  '🌙 晚上九点，程序员刚吃上外卖'
]

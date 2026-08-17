// 当代人物追踪 —— 种子数据
// 说明：本文件是人物数据的唯一来源。想新增 / 修改人物，直接编辑此文件即可。
// 字段含义：
//   id         唯一标识（用于路由与本地观察记录关联，建议用英文短横线）
//   name       本名
//   stageName  艺名 / 常用名（可空）
//   field      所属领域，对应下方 fields 的 key
//   group      所属团体 / 机构（可空）
//   birthDate  出生日期，格式 YYYY-MM-DD（用于计算年龄与距生日天数）
//   birthPlace 出生地（可空）
//   education  学历 / 背景（可空）
//   bio        一句话简介
//   events     主要事迹时间轴，按时间从早到晚；date 可为年份或完整日期

export const fields = [
  { key: 'star', label: '明星' },
  { key: 'tech', label: '科技 / 企业家' },
  { key: 'sports', label: '体育' },
  { key: 'culture', label: '文化 / 作家' },
  { key: 'society', label: '社会热点人物' }
]

export const fieldLabel = (key) =>
  fields.find((f) => f.key === key)?.label || key

export const figures = [
  // ===== 明星（来自参考素材） =====
  {
    id: 'oner-yueminghui',
    name: '岳明辉',
    stageName: '岳岳',
    field: 'star',
    group: 'ONER',
    birthDate: '1992-07-11',
    birthPlace: '',
    education: '南京航空航天大学；英国格拉斯哥大学硕士',
    bio: 'ONER 队长，2016 年与木子洋、卜凡、灵超共同开启两年练习生训练。',
    events: [
      { date: '2016', text: '与木子洋、卜凡、灵超开启为期两年的练习生训练' },
      { date: '2018', text: '随 ONER 发行首张音乐 EP《过敏》正式出道' }
    ]
  },
  {
    id: 'oner-muziyang',
    name: '李振洋',
    stageName: '木子洋',
    field: 'star',
    group: 'ONER',
    birthDate: '1994-04-21',
    birthPlace: '山东菏泽',
    education: '北京服装学院',
    bio: 'ONER 成员，坤音三子之一。',
    events: [{ date: '2018', text: '随 ONER 发行首张音乐 EP《过敏》出道' }]
  },
  {
    id: 'oner-lingchao',
    name: '李英超',
    stageName: '灵超',
    field: 'star',
    group: 'ONER',
    birthDate: '2001-01-09',
    birthPlace: '河北',
    education: '上海戏剧学院（2019 年毕业）',
    bio: 'ONER 成员，坤音三子之一。',
    events: [{ date: '2018', text: '随 ONER 发行首张音乐 EP《过敏》出道' }]
  },
  {
    id: 'wanglujie',
    name: '王橹杰',
    stageName: '',
    field: 'star',
    group: 'TF 家族（第四代练习生）',
    birthDate: '2010-01-08',
    birthPlace: '',
    education: '',
    bio: 'TF 家族第四代练习生，与穆祉丞组成热门 CP。',
    events: [
      { date: '2026-07-06', text: '发行单曲《全世界陪我出发》' },
      {
        date: '2026-08-16',
        text: '领衔主演的青春校园剧《我们的少年时代2》播出，饰演付彬言'
      }
    ]
  },
  {
    id: 'muzhicheng',
    name: '穆祉丞',
    stageName: '',
    field: 'star',
    group: 'TF 家族（第三代）',
    birthDate: '2007-11-16',
    birthPlace: '重庆',
    education: '',
    bio: '中国内地男歌手、演员，TF 家族第三代，与王橹杰组成热门 CP。',
    events: [{ date: '2026', text: '作为 TF 家族第三代持续发布音乐与演出作品' }]
  },

  // ===== 科技 / 企业家（示例，可替换为真实追踪对象） =====
  {
    id: 'elon-musk',
    name: 'Elon Musk',
    stageName: '埃隆·马斯克',
    field: 'tech',
    group: 'Tesla / SpaceX / xAI',
    birthDate: '1971-06-28',
    birthPlace: '南非比勒陀利亚',
    education: '宾夕法尼亚大学',
    bio: '企业家，横跨电动汽车、航天与人工智能领域。',
    events: [
      { date: '2002', text: '创办航天公司 SpaceX' },
      { date: '2004', text: '投资并加入特斯拉，推动电动汽车普及' },
      { date: '2023', text: '创立人工智能公司 xAI' }
    ]
  },

  // ===== 体育（示例） =====
  {
    id: 'gu-ailing',
    name: '谷爱凌',
    stageName: 'Eileen Gu',
    field: 'sports',
    group: '',
    birthDate: '2003-09-03',
    birthPlace: '美国旧金山',
    education: '斯坦福大学',
    bio: '自由式滑雪运动员，北京冬奥会多枚奖牌得主。',
    events: [
      { date: '2022', text: '北京冬奥会自由式滑雪获得两金一银' },
      { date: '2023', text: '世界杯与世锦赛持续取得奖牌' }
    ]
  },

  // ===== 文化 / 作家（示例） =====
  {
    id: 'liu-cixin',
    name: '刘慈欣',
    stageName: '',
    field: 'culture',
    group: '',
    birthDate: '1963-06-23',
    birthPlace: '北京',
    education: '华北水利水电学院',
    bio: '科幻作家，《三体》作者。',
    events: [
      { date: '2006', text: '长篇科幻小说《三体》开始连载' },
      { date: '2015', text: '《三体》获雨果奖最佳长篇，亚洲首次' }
    ]
  }
]

export const findFigure = (id) => figures.find((f) => f.id === id)

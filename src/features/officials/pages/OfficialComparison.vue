<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'

// 王朝（表格列）。以后增删王朝只需改这里
const dynasties = [
  { key: 'qinhan', label: '秦汉' },
  { key: 'suitang', label: '隋唐' },
  { key: 'song', label: '宋' },
  { key: 'yuan', label: '元' },
  { key: 'ming', label: '明' },
  { key: 'qing', label: '清' }
]

// 级别分组，用于筛选
const categories = [
  { key: 'central', label: '中央中枢' },
  { key: 'local', label: '地方行政' },
  { key: 'ministry', label: '中央部门' },
  { key: 'special', label: '专项（监察·军事·司法）' }
]

// 对照数据：每行 = 一个现代职位，按王朝列出大致相当的古代官职
// 古今官制差异很大，仅为大致对应、非严格一对一
const rows = [
  {
    modern: '国务院总理',
    level: '国家级正职',
    category: 'central',
    qinhan: '丞相 / 相国',
    suitang: '尚书令·中书令·侍中（三省长官）',
    song: '同中书门下平章事',
    yuan: '中书省丞相',
    ming: '内阁首辅（大学士）',
    qing: '内阁大学士 / 军机大臣（领班）'
  },
  {
    modern: '国务院副总理',
    level: '国家级副职',
    category: 'central',
    qinhan: '御史大夫（副丞相）',
    suitang: '尚书左右仆射',
    song: '参知政事',
    yuan: '平章政事',
    ming: '内阁次辅·群辅',
    qing: '协办大学士 / 军机大臣'
  },
  {
    modern: '省委书记 / 省长',
    level: '省部级正职',
    category: 'local',
    qinhan: '州刺史（汉末州牧）/ 郡守',
    suitang: '节度使 / 观察使（道）',
    song: '路安抚使 / 转运使',
    yuan: '行中书省平章政事',
    ming: '巡抚 / 布政使',
    qing: '总督 / 巡抚'
  },
  {
    modern: '副省长 / 省委常委',
    level: '省部级副职',
    category: 'local',
    qinhan: '郡丞 / 州别驾',
    suitang: '节度副使 / 州长史',
    song: '转运副使 / 提点刑狱',
    yuan: '行省参知政事',
    ming: '布政使司参政 / 按察使',
    qing: '布政使 / 按察使'
  },
  {
    modern: '市委书记 / 市长',
    level: '厅局级正职',
    category: 'local',
    qinhan: '郡太守',
    suitang: '州刺史',
    song: '知府 / 知州',
    yuan: '路总管 / 府达鲁花赤',
    ming: '知府',
    qing: '知府'
  },
  {
    modern: '县委书记 / 县长',
    level: '县处级正职',
    category: 'local',
    qinhan: '县令 / 县长',
    suitang: '县令',
    song: '知县 / 县令',
    yuan: '县尹',
    ming: '知县',
    qing: '知县'
  },
  {
    modern: '乡镇党委书记 / 乡镇长',
    level: '乡科级正职',
    category: 'local',
    qinhan: '亭长 / 乡啬夫 / 三老',
    suitang: '里正 / 乡长',
    song: '里正 / 保正',
    yuan: '社长',
    ming: '里长（里甲）/ 粮长',
    qing: '里长 / 保甲长'
  },
  {
    modern: '中央部委部长',
    level: '省部级正职',
    category: 'ministry',
    qinhan: '九卿（太常·廷尉等）',
    suitang: '六部尚书',
    song: '六部尚书 / 三司使',
    yuan: '六部尚书',
    ming: '六部尚书',
    qing: '六部尚书'
  },
  {
    modern: '中组部部长（组织·人事）',
    level: '省部级正职',
    category: 'ministry',
    qinhan: '尚书选部',
    suitang: '吏部尚书',
    song: '吏部尚书 / 审官院',
    yuan: '吏部尚书',
    ming: '吏部尚书（天官）',
    qing: '吏部尚书'
  },
  {
    modern: '财政部长',
    level: '省部级正职',
    category: 'ministry',
    qinhan: '治粟内史 / 大司农',
    suitang: '户部尚书 / 度支',
    song: '三司使（计相）',
    yuan: '户部尚书',
    ming: '户部尚书',
    qing: '户部尚书'
  },
  {
    modern: '外交部长',
    level: '省部级正职',
    category: 'ministry',
    qinhan: '大鸿胪',
    suitang: '鸿胪寺卿 / 礼部',
    song: '鸿胪寺 / 礼部',
    yuan: '礼部尚书',
    ming: '礼部尚书 / 鸿胪寺',
    qing: '理藩院 / 礼部'
  },
  {
    modern: '中央纪委书记 / 监察委主任',
    level: '国家级副职',
    category: 'special',
    qinhan: '御史大夫',
    suitang: '御史大夫（御史台）',
    song: '御史中丞',
    yuan: '御史大夫',
    ming: '左都御史（都察院）',
    qing: '左都御史（都察院）'
  },
  {
    modern: '中央军委 / 国防部长',
    level: '国家级正职',
    category: 'special',
    qinhan: '太尉 / 大司马',
    suitang: '兵部尚书',
    song: '枢密使',
    yuan: '知枢密院事',
    ming: '兵部尚书',
    qing: '兵部尚书 / 军机处'
  },
  {
    modern: '最高人民法院院长',
    level: '国家级副职',
    category: 'special',
    qinhan: '廷尉',
    suitang: '大理寺卿',
    song: '大理寺卿',
    yuan: '大宗正府',
    ming: '大理寺卿 / 刑部',
    qing: '大理寺卿 / 刑部'
  }
]

// 级别权重：数字越小职位越高，用于从高到低排序
const levelRank = {
  国家级正职: 1,
  国家级副职: 2,
  省部级正职: 3,
  省部级副职: 4,
  厅局级正职: 5,
  县处级正职: 6,
  乡科级正职: 7
}

// 筛选状态
const activeDynasties = ref(dynasties.map((d) => d.key))
const activeCategory = ref('all')
const keyword = ref('')

function toggleDynasty(key) {
  const idx = activeDynasties.value.indexOf(key)
  if (idx === -1) {
    activeDynasties.value.push(key)
  } else if (activeDynasties.value.length > 1) {
    // 至少保留一个王朝列
    activeDynasties.value.splice(idx, 1)
  }
}

const visibleDynasties = computed(() =>
  dynasties.filter((d) => activeDynasties.value.includes(d.key))
)

const visibleRows = computed(() => {
  const kw = keyword.value.trim()
  return rows
    .filter((row) => {
      if (activeCategory.value !== 'all' && row.category !== activeCategory.value) {
        return false
      }
      if (kw && !row.modern.includes(kw)) {
        return false
      }
      return true
    })
    .slice()
    .sort((a, b) => (levelRank[a.level] ?? 99) - (levelRank[b.level] ?? 99))
})

function categoryLabel(key) {
  return categories.find((c) => c.key === key)?.label ?? key
}
</script>

<template>
  <main class="page">
    <header class="head">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <h1>中国官职 · 古今对比</h1>
      <p class="lead">
        以现代行政级别为轴，横向比较各王朝大致相当的官职。例如「省委书记 / 省长 ≈ 清代总督 / 巡抚」。
      </p>
      <p class="note">
        ⚠ 古今官制体系差异很大，职权范围、隶属关系并不完全相同，下表仅为大致对应、便于直观理解，非严格一对一。
      </p>
    </header>

    <section class="filters">
      <div class="filter-block">
        <span class="filter-label">王朝</span>
        <div class="chips">
          <button
            v-for="d in dynasties"
            :key="d.key"
            class="chip"
            :class="{ active: activeDynasties.includes(d.key) }"
            @click="toggleDynasty(d.key)"
          >
            {{ d.label }}
          </button>
        </div>
      </div>

      <div class="filter-block">
        <span class="filter-label">级别分组</span>
        <select v-model="activeCategory" class="select">
          <option value="all">全部</option>
          <option v-for="c in categories" :key="c.key" :value="c.key">
            {{ c.label }}
          </option>
        </select>
      </div>

      <div class="filter-block grow">
        <span class="filter-label">搜索现代职位</span>
        <input
          v-model="keyword"
          class="search"
          type="text"
          placeholder="如：省委书记、纪委、市长…"
        />
      </div>
    </section>

    <div class="table-wrap">
      <table class="cmp">
        <thead>
          <tr>
            <th class="sticky-col">现代职位</th>
            <th v-for="d in visibleDynasties" :key="d.key">{{ d.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in visibleRows" :key="i">
            <th class="sticky-col modern">
              <span class="modern-name">{{ row.modern }}</span>
              <span class="level">{{ row.level }}</span>
              <span class="cat">{{ categoryLabel(row.category) }}</span>
            </th>
            <td v-for="d in visibleDynasties" :key="d.key">
              {{ row[d.key] }}
            </td>
          </tr>
          <tr v-if="visibleRows.length === 0">
            <td class="empty" :colspan="visibleDynasties.length + 1">
              没有匹配的职位，换个关键词或分组试试。
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="foot">
      <span>© 2026 zentrix566 · 仅供学习参考</span>
    </footer>
  </main>
</template>

<style scoped>
.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}

.back {
  display: inline-block;
  margin-bottom: 16px;
  font-size: 14px;
}

.head h1 {
  margin: 0 0 10px;
  font-size: 30px;
}

.lead {
  margin: 0 0 10px;
  color: var(--color-text);
  line-height: 1.6;
}

.note {
  margin: 0 0 8px;
  padding: 10px 14px;
  background: rgba(212, 69, 47, 0.07);
  border-left: 3px solid var(--color-danger);
  border-radius: 6px;
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1.6;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 18px 28px;
  align-items: flex-end;
  margin: 24px 0;
  padding: 18px 20px;
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.filter-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-block.grow {
  flex: 1;
  min-width: 200px;
}

.filter-label {
  font-size: 12px;
  color: var(--color-muted);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 6px 14px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 999px;
  background: transparent;
  color: var(--color-muted);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}

.select,
.search {
  height: 36px;
  padding: 0 12px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  color: var(--color-text);
}

.search {
  width: 100%;
}

.table-wrap {
  overflow-x: auto;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  background: var(--color-card);
}

.cmp {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.cmp th,
.cmp td {
  padding: 12px 14px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  line-height: 1.55;
}

.cmp thead th {
  position: sticky;
  top: 0;
  background: #f0ece1;
  font-weight: 600;
  white-space: nowrap;
  z-index: 2;
}

.sticky-col {
  position: sticky;
  left: 0;
  background: var(--color-card);
  z-index: 1;
  min-width: 180px;
}

.cmp thead .sticky-col {
  background: #f0ece1;
  z-index: 3;
}

.modern {
  display: table-cell;
}

.modern-name {
  display: block;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.level,
.cat {
  display: inline-block;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 999px;
  margin-right: 4px;
}

.level {
  color: var(--color-primary);
  background: rgba(47, 111, 237, 0.1);
}

.cat {
  color: var(--color-muted);
  background: rgba(0, 0, 0, 0.05);
}

.cmp tbody tr:hover td,
.cmp tbody tr:hover .sticky-col {
  background: rgba(47, 111, 237, 0.04);
}

.empty {
  text-align: center;
  color: var(--color-muted);
  padding: 28px 14px;
}

.foot {
  margin-top: 32px;
  font-size: 12px;
  color: var(--color-muted);
  text-align: center;
}
</style>

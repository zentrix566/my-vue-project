export const modes = [
  { key: 'wild', label: '狂野', icon: '♾️', color: '#8a5cf5' },
  { key: 'standard', label: '标准', icon: '⚔️', color: '#d88b28' },
  { key: 'twist', label: '幻变', icon: '🌀', color: '#16a39a' }
]

// status: missed 表示该月没有上传说；空值表示尚未记录/赛季未到。
export const legendRecords = [
  [2024, 10, '奥秘天启骑', '骑士', null, null, null], [2024, 11, '法强德', '德鲁伊', '法强行星萨', '萨满', null], [2024, 12, '40快暗牧', '牧师', '法强穴居人德', '德鲁伊', null],
  [2025, 1, '宇宙天启骑', '骑士', '法强穴居人德', '德鲁伊', '青玉贼'], [2025, 2, '宇宙天启骑', '骑士', '星灵牧', '牧师', null], [2025, 3, '宇宙天启骑', '骑士', '星灵牧', '牧师', null], [2025, 4, '灌注法', '法师', 'Buff猎', '猎人', null], [2025, 5, '40号角骑', '骑士', '灌注骑', '骑士', null], [2025, 6, '宇宙天启骑', '骑士', '快亡语瞎', '恶魔猎手', null], [2025, 7, '宇宙天启骑', '骑士', '快亡语瞎', '恶魔猎手', null], [2025, 8, '战吼萨', '萨满', '星灵牧', '牧师', null], [2025, 9, '弃牌术', '术士', '星灵牧', '牧师', null], [2025, 10, '魔丸德', '德鲁伊', '星舰瞎', '恶魔猎手', null], [2025, 11, '蛋术', '术士', '中速萨', '萨满', null], [2025, 12, '蛋术', '术士', '中速萨', '萨满', null],
  [2026, 1, '雨点术', '术士', '龙战', '战士', null], [2026, 2, '雨点术', '术士', 'missed', 'missed', null], [2026, 3, '40快暗牧', '牧师', '灌注德', '德鲁伊', null], [2026, 4, '30号角骑', '骑士', '圣盾骑', '骑士', null], [2026, 5, '弃牌术', '术士', 'missed', 'missed', null], [2026, 6, '弃牌术', '术士', '报告骑', '骑士', null], [2026, 7, '弃牌术', '术士', 'missed', 'missed', null], [2026, 8, '圣契骑', '骑士', 'missed', 'missed', null], [2026, 9, null, null, null, null, null], [2026, 10, null, null, null, null, null], [2026, 11, null, null, null, null, null], [2026, 12, null, null, null, null, null]
].map(([year, month, wildDeck, wildClass, standardDeck, standardClass, twistDeck]) => ({
  year, month,
  wild: wildDeck === 'missed' ? { status: 'missed' } : wildDeck ? { deck: wildDeck, hero: wildClass } : null,
  standard: standardDeck === 'missed' ? { status: 'missed' } : standardDeck ? { deck: standardDeck, hero: standardClass } : null,
  twist: twistDeck ? { deck: twistDeck } : null
}))

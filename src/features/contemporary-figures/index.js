import './style.css'

// 当代人物追踪：按领域收录当代人物，记录出生日期与主要事迹，并支持持续观察
export const loadContemporaryFiguresPage = () =>
  import('./pages/ContemporaryFigures.vue')
export const loadContemporaryFigureDetailPage = () =>
  import('./pages/FigureDetail.vue')

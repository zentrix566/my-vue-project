export default {
  slug: 'dynasty-map',
  title: '历代疆域·3D地图',
  emoji: '🏯',
  description: '秦至清十五个时期的 3D 疆域沙盘：暗色博物馆场景中，省份化作暗石板底座，历代疆域以莫兰迪色立体拔起并按郡/州划块（同色系深浅区分），都城与重镇化作辉光光柱；城名标签毛玻璃化，带碰撞检测与缩放分层，悬停区划显示郡名，支持 URL 直开朝代、自动巡游与键盘翻页。',
  order: 20,
  routes: [
    {
      path: '/dynasty-map',
      name: 'dynasty-map',
      loader: () => import('./pages/DynastyMap.vue'),
      meta: { title: '历代疆域 · 3D 地图' }
    }
  ]
}

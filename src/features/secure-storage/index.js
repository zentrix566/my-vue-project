export default {
  slug: 'secure-storage',
  title: '端到端加密·云端密文存储',
  emoji: '🔐',
  description: '本地用 ECIES 加密后再上云，云端只存密文；私钥本机保存，没有密钥连管理员也解不开你存了什么。',
  order: 220,
  routes: [
    {
      path: '/secure-storage',
      name: 'secure-storage',
      loader: () => import('./pages/SecureStorage.vue'),
      meta: { title: '端到端加密 · 云端密文存储' }
    }
  ]
}

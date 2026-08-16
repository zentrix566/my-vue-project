// 可选宠物定义
export const PETS = [
  {
    id: 'hajimi',
    name: '哈基米',
    species: '橘猫',
    emoji: '🐱',
    color: '#f59e0b',
    soft: '#fef3c7',
    sound: '喵～',
    blurb: '一只圆滚滚的橘猫，最大的爱好是吃饭和打盹。',
    favoriteFood: '小鱼干'
  },
  {
    id: 'dog',
    name: '修勾',
    species: '大狗',
    emoji: '🐶',
    color: '#92400e',
    soft: '#fde6d2',
    sound: '汪汪！',
    blurb: '热情似火的大狗，见谁都想扑上去舔两口。',
    favoriteFood: '肉骨头'
  },
  {
    id: 'bunny',
    name: '兔团子',
    species: '兔子',
    emoji: '🐰',
    color: '#ec4899',
    soft: '#fce7f3',
    sound: '噗叽',
    blurb: '软乎乎的小白兔，耳朵会随心情抖动。',
    favoriteFood: '胡萝卜'
  },
  {
    id: 'hamster',
    name: '仓小橘',
    species: '仓鼠',
    emoji: '🐹',
    color: '#d97706',
    soft: '#fef3c7',
    sound: '吱吱',
    blurb: '腮帮子永远塞满瓜子的小毛球。',
    favoriteFood: '瓜子'
  }
]

export const getPet = (id) => PETS.find((p) => p.id === id) || PETS[0]

// 食物：花费金币，恢复的饱腹度，附带的心情加成
export const FOODS = [
  { id: 'snack', name: '零食', emoji: '🍪', cost: 5, hunger: 15, mood: 3 },
  { id: 'meal', name: '正餐', emoji: '🍱', cost: 15, hunger: 40, mood: 6 },
  { id: 'fav', name: '最爱', emoji: '⭐', cost: 30, hunger: 60, mood: 20, favorite: true }
]

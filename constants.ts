
import { Category, Recipe } from './types';

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'r1',
    title: '番茄炒蛋',
    description: '经典国民家常菜，酸甜可口。',
    image: 'https://picsum.photos/400/300?random=1',
    category: Category.MainMeal,
    tags: ['米饭搭子', '快手菜'],
    ingredients: [
      { name: '鸡蛋', amount: '3个' },
      { name: '番茄', amount: '2个' },
      { name: '葱花', amount: '适量' },
    ],
    steps: [
      { description: '鸡蛋打散备用' },
      { description: '番茄切块' },
      { description: '热锅炒蛋' },
      { description: '加入番茄翻炒' }
    ],
    createdAt: Date.now(),
    rating: 4,
    isFavorite: true,
  },
  {
    id: 'r2',
    title: '牛油果吐司',
    description: '健康减脂早餐，富含优质脂肪。',
    image: 'https://picsum.photos/400/300?random=2',
    category: Category.Breakfast,
    tags: ['减脂', '西式'],
    ingredients: [
      { name: '全麦面包', amount: '2片' },
      { name: '牛油果', amount: '1个' },
      { name: '黑胡椒', amount: '少许' },
    ],
    steps: [
      { description: '面包烤至酥脆' },
      { description: '牛油果捣泥涂抹' },
      { description: '撒上黑胡椒' }
    ],
    createdAt: Date.now() - 10000,
    rating: 5,
  },
  {
    id: 'r3',
    title: '红烧肉',
    description: '肥而不腻，入口即化。',
    image: 'https://picsum.photos/400/300?random=3',
    category: Category.MainMeal,
    tags: ['硬菜', '米饭搭子'],
    ingredients: [
      { name: '五花肉', amount: '500g' },
      { name: '冰糖', amount: '20g' },
      { name: '生姜', amount: '3片' },
    ],
    steps: [
      { description: '五花肉焯水' },
      { description: '炒糖色' },
      { description: '炖煮1小时' },
      { description: '收汁' }
    ],
    createdAt: Date.now() - 20000,
  }
];

export const DAYS_OF_WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

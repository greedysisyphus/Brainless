/** 上車地點與車費方案 — 班表車資計算共用常數 */

export const PICKUP_LOCATIONS = [
  '7-11 新街門市',
  'A21 環北站',
  '7-11 高萱門市',
  'A18 桃園高鐵站',
  'A16 橫山站',
  '大園農會',
  '不搭車',
]

export const FARE_PLANS = {
  'A21 環北站': {
    name: 'A21 環北站',
    originalPrice: 65,
    monthlyPass: {
      30: 1260,
      90: 3564,
      120: 3888,
    },
  },
  'A19 體育園區站': {
    name: 'A19 體育園區站',
    originalPrice: 40,
    monthlyPass: {
      30: 735,
      90: 2079,
      120: 2268,
    },
  },
  '7-11 高萱門市': {
    name: 'A19 體育園區站',
    originalPrice: 40,
    monthlyPass: {
      30: 735,
      90: 2079,
      120: 2268,
    },
  },
  'A18 桃園高鐵站': {
    name: 'A18 桃園高鐵站',
    originalPrice: 35,
    monthlyPass: {
      30: 630,
      90: 1782,
      120: 1944,
    },
  },
}

export const TPASS_PLAN = {
  name: 'TPass 799',
  price: 799,
  days: 30,
  description: 'A7-A22 無限搭乘 30天',
}

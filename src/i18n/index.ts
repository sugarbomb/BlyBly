import { createI18n } from 'vue-i18n'

import zhCN from './locales/zh-CN.json'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN', // 默认使用中文
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
  },
})

export default i18n

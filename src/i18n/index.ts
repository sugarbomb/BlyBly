import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'

// 确保正确加载翻译文件
console.log('Loading i18n translations:', {
  zhCN: Object.keys(zhCN).length > 0,
  enUS: Object.keys(enUS).length > 0,
})

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN', // 默认使用中文
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})

export default i18n 
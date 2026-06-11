import { createApp } from 'vue'
import dayjs from 'dayjs'
import updateLocale from 'dayjs/plugin/updateLocale'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhTw from 'element-plus/dist/locale/zh-tw.mjs'

dayjs.extend(updateLocale)
dayjs.updateLocale('en', { weekStart: 1 })
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import { initStore } from './composables/useStore.js'
import './styles/main.css'

const app = createApp(App)
app.use(ElementPlus, { locale: zhTw })
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 先完成 IndexedDB 遷移與載入，再掛載 App，確保畫面拿到的是已載入的狀態
initStore().finally(() => {
  app.mount('#app')
})

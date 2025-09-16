import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
// 如果你集成了 TailwindCSS，这里顺带引入全局样式
import './assets/main.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'tdesign-vue-next/es/style/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
const app = createApp(App)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 可设置全局尺寸/层级
app.use(ElementPlus, { size: 'small', zIndex: 3000 }) // 见官方 Quick Start
app.use(router).mount('#app')
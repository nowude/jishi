import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'vant/lib/index.css'
import 'virtual:uno.css'
import './styles/global.css'

// 全量注册 Vant 组件
import {
  Tabbar, TabbarItem,
  NavBar, Cell, CellGroup, Button,
  Icon, Toast, Dialog, Notify, ImagePreview,
  Field, Form, DatePicker, TimePicker, Picker,
  SwipeCell, Tag, Badge, Checkbox, CheckboxGroup,
  Calendar, Loading, Overlay, PullRefresh,
  ConfigProvider, ActionBar, ActionBarButton,
} from 'vant'

const app = createApp(App)
app.use(router)

// 注册 Vant 组件
const vantComponents = [
  Tabbar, TabbarItem, NavBar, Cell, CellGroup, Button,
  Icon, Toast, Dialog, Notify, ImagePreview,
  Field, Form, DatePicker, TimePicker, Picker,
  SwipeCell, Tag, Badge, Checkbox, CheckboxGroup,
  Calendar, Loading, Overlay, PullRefresh,
  ConfigProvider, ActionBar, ActionBarButton,
]
vantComponents.forEach(comp => app.use(comp))

app.mount('#app')

# JiShi - 个人工时统计

> 一款为 iPhone 打造的个人工时统计 PWA 应用

## 功能

- **打卡签退**：一键上班打卡 / 下班签退，实时显示已工时
- **补录功能**：忘记打卡可手动补录
- **日历视图**：月历模式，颜色编码显示每日工时（正常/加班/不足/请假）
- **工时统计**：周均、月均、年均工时（自动排除请假天数）
- **请假管理**：标记年假/病假/事假/调休
- **数据导出**：CSV / JSON 导出，JSON 导入恢复
- **离线可用**：PWA 支持离线运行
- **深色模式**：跟随系统

## 在 iPhone 上使用

1. 部署到 HTTPS 服务器（推荐 GitHub Pages）
2. 在 Safari 中打开网址
3. 点击底部「分享」按钮 →「添加到主屏幕」
4. 从主屏幕启动即可像原生 App 一样使用

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 技术栈

- Vue 3 + TypeScript + Vite
- Vant 4（移动端 UI）
- Dexie.js（IndexedDB 本地存储）
- UnoCSS（原子化 CSS）
- ECharts（统计图表）
- vite-plugin-pwa（PWA 支持）
- dayjs（日期处理）

## 数据安全

- 所有数据仅保存在本地 IndexedDB
- 不会发送到任何服务器
- 建议定期使用 JSON 导出备份
- 清除 Safari 缓存会删除数据，请务必备份

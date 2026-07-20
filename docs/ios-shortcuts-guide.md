# iOS 快捷指令配置指南

## 架构说明

```
到公司 → iOS 自动化触发 → POST 打卡 API → D1 记录
离公司 → iOS 自动化触发 → POST 签退 API → D1 记录
打开 PWA → 拉取数据 → 日历/统计/编辑
```

## 前置条件

1. Cloudflare Worker 已部署（见 `worker/` 目录）
2. D1 数据库已初始化（`npm run db:init`）
3. `apiToken` 已在 D1 中配置（默认: `jishi-change-me-to-a-secret`，请改为强密码）
4. PWA 设置页已配置 API 地址和 Token

## 快捷指令配置

### 1. 创建「上班打卡」快捷指令

1. 打开 iOS「快捷指令」App
2. 点击 `+` 新建快捷指令
3. 添加操作: **获取 URL 内容**（或「获取内容」→「URL」）
4. 配置:
   - URL: `https://你的worker地址/api/clock`
   - 方法: `POST`
   - 头部: 
     - `Authorization`: `Bearer 你的apiToken`
     - `Content-Type`: `application/json`
   - 请求体 (JSON):
     ```json
     {
       "action": "in"
     }
     ```

### 2. 创建「下班签退」快捷指令

同上，但请求体改为:
```json
{
  "action": "out"
}
```

### 3. 配置 iOS 自动化

#### 到公司自动打卡

1. 打开「快捷指令」App → 「自动化」标签
2. 点击 `+` 创建个人自动化
3. 选择触发条件: **到达** (Arrive)
4. 设置:
   - 位置: 公司地址
   - 触发: 到达时
5. 添加操作: 运行快捷指令 → 选择「上班打卡」
6. 关闭「运行前询问」（这样自动触发，无需确认）

#### 离开公司自动签退

1. 同上，但选择触发条件: **离开** (Leave)
2. 位置: 公司地址
3. 触发: 离开时
4. 添加操作: 运行快捷指令 → 选择「下班签退」
5. 关闭「运行前询问」

## API 端点一览

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/clock` | POST | 打卡/签退 (action: in/out) |
| `/api/records?start=&end=` | GET | 查询打卡记录 |
| `/api/records/:date` | PUT | 更新指定日期记录 |
| `/api/records/:date` | DELETE | 删除指定日期记录 |
| `/api/leaves?start=&end=` | GET | 查询请假记录 |
| `/api/leaves` | POST | 添加请假 |
| `/api/leaves/:id` | DELETE | 删除请假 |
| `/api/settings` | GET | 获取配置 |
| `/api/settings` | PUT | 更新配置 |
| `/api/ping` | GET | 健康检查 |

## 鉴权

所有 API 请求需要 `Authorization: Bearer <token>` 头部，token 值与 D1 `settings` 表中 `apiToken` 一致。

## 注意事项

- iOS 自动化基于 GPS 地理围栏，精度约 50-100 米
- 到达/离开触发需要 iPhone 屏幕点亮且非飞行模式
- 低电量模式可能延迟自动化触发
- **兜底**: 自动化未触发时，可在 PWA 内手动打卡
- **补录**: 任何漏打卡可在 PWA 的日期详情页手动编辑

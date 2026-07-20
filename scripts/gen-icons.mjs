// 生成简单的 PNG 占位图标
// 实际使用时建议替换为正式设计的图标

// 由于是纯前端 PWA，这里用一个 canvas 生成方式
// 在 src/utils/icon-gen.ts 中提供运行时生成逻辑

// 临时方案：创建一个 HTML canvas 脚本来生成图标
// 运行: node scripts/gen-icons.mjs

import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

function genIcon(size: number, path: string) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  
  // 背景
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#1989fa')
  gradient.addColorStop(1, '#2b6cb0')
  
  // 圆角矩形
  const r = size * 0.2
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()
  
  // 文字
  ctx.fillStyle = 'white'
  ctx.font = `bold ${size * 0.42}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('工', size / 2, size / 2 + size * 0.02)
  
  // 绿色圆点
  const dotR = size * 0.055
  const dotX = size * 0.73
  const dotY = size * 0.27
  ctx.beginPath()
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2)
  ctx.fillStyle = '#07c160'
  ctx.fill()
  
  // 对勾
  ctx.strokeStyle = 'white'
  ctx.lineWidth = size * 0.012
  ctx.beginPath()
  ctx.moveTo(dotX - dotR * 0.35, dotY)
  ctx.lineTo(dotX - dotR * 0.05, dotY + dotR * 0.35)
  ctx.lineTo(dotX + dotR * 0.4, dotY - dotR * 0.3)
  ctx.stroke()
  
  writeFileSync(path, canvas.toBuffer('image/png'))
  console.log(`Generated ${path}`)
}

genIcon(192, 'public/icons/icon-192.png')
genIcon(512, 'public/icons/icon-512.png')

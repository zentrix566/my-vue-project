// 测量 dynasty-map 中地图蓝块在 stage 内的位置和占比
const path = require('path')
const playwrightCorePath = path.join(process.env.USERPROFILE, '.workbuddy/binaries/node/workspace/node_modules/playwright-core')
const { chromium } = require(playwrightCorePath)

const url = process.argv[2] || 'http://localhost:5174/dynasty-map'

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'],
    headless: true
  })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'load', timeout: 30000 })
  await page.waitForSelector('.dynasty-map-chart canvas', { timeout: 15000 })
  await page.waitForTimeout(5500)
  await page.waitForTimeout(5500)

  // 直接在 page 内对 DOM 取 canvas 像素，找蓝色块（地图主色）
  const stageBox = await page.locator('.dynasty-map-stage').boundingBox()
  await page.screenshot({ path: 'E:/github/zentrix566.github.io/_shot.png', clip: stageBox })

  // 在 page 内调用 canvas 的 getImageData，定位蓝色地图区域
  const canvas = await page.$('.dynasty-map-chart canvas')
  const dataUrl = await page.evaluate((el) => {
    const c = el
    return c.toDataURL('image/png')
  }, canvas)

  // 把 PNG 重新塞回图片来解析（用浏览器 Image API），找 #4a6b8a 类蓝色像素
  const result = await page.evaluate(async (url) => {
    const img = new Image()
    img.src = url
    await new Promise((r) => img.onload = r)
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, img.width, img.height).data
    let minX = img.width, minY = img.height, maxX = 0, maxY = 0
    let count = 0
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4
        const r = d[i], g = d[i+1], b = d[i+2]
        // 地图主色 #4a6b8a (74,107,138) / 选中 #c62828 红 / 都城 #f4b740 黄 / raise时变亮的 #6b8fb5
        // 用 b>r 且 b>g 且 b>=60 且 r,g 不是很高作为蓝色地图的判断
        const isBlueMap = (b >= 90 && b <= 220 && r < 180 && g < 180 && b > r + 10 && b > g + 5)
        // 排除选中变红和都城变黄（这些覆盖在地图之上很少）
        if (isBlueMap) {
          if (x < minX) minX = x
          if (y < minY) minY = y
          if (x > maxX) maxX = x
          if (y > maxY) maxY = y
          count++
        }
      }
    }
    return { w: img.width, h: img.height, minX, minY, maxX, maxY, count }
  }, dataUrl)

  console.log('canvas:', result.w, 'x', result.h)
  if (result.count === 0) {
    console.log('NO BLUE PIXELS FOUND - might be wrong detection')
  } else {
    const { w, h, minX, minY, maxX, maxY } = result
    console.log('map bbox:', `x=[${minX},${maxX}] y=[${minY},${maxY}]`)
    console.log('map size:', (maxX-minX), 'x', (maxY-minY))
    console.log('center offset (px):', `${(minX+maxX)/2 - w/2 | 0}x${(minY+maxY)/2 - h/2 | 0}`)
    console.log('fill ratio:', `${((maxX-minX)/w*100).toFixed(1)}% x ${((maxY-minY)/h*100).toFixed(1)}%`)
  }
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })

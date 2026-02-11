import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { TEMPLATES, VALID_CATEGORIES } from '../templates.js'
import { generateSpritesJs, generatePreviewHtml } from '../sprites.js'
import { detectGameContext, getCategoriesForTemplate } from '../context.js'

export function get_asset_guide(args) {
  const { template } = args
  const guide = TEMPLATES[template]?.assets
  if (!guide) return JSON.stringify({ error: `No asset guide for template: ${template}. Available: ${Object.keys(TEMPLATES).join(', ')}` })

  let output = `# Asset Guide: ${TEMPLATES[template].name}\n\n`
  output += `## Styl\n${guide.style}\n\n`
  output += `## Rozmiar sprite'ów\n${guide.gridSize}\n\n`
  output += `## Paleta kolorów\n`
  for (const [name, color] of Object.entries(guide.palette)) {
    output += `- \`${color}\` — ${name}\n`
  }
  output += `\n## Wymagane sprite'y\n\n`
  for (const [cat, info] of Object.entries(guide.categories)) {
    output += `### ${cat}\n${info.desc}\n`
    output += `Sprite'y: ${info.sprites.join(', ')}\n\n`
  }
  output += `## Format sprite'a\n\`\`\`json\n`
  output += `{\n  "w": 8, "h": 8,\n  "palette": { "1": "#a86", "2": "#d9a" },\n`
  output += `  "pixels": [\n    "..1..1..",\n    ".11..11.",\n    ".122221.",\n    "11222211",\n`
  output += `    "11222211",\n    ".112211.",\n    ".1....1.",\n    ".1....1."\n  ]\n}\n\`\`\`\n\n`
  output += `## Integracja w renderze\n\`\`\`js\n`
  output += `var sprite = typeof getSprite === 'function' && getSprite('enemies', enemy.type)\n`
  output += `if (sprite) {\n  drawSprite(ctx, sprite, sx, sy, T)\n} else {\n  ctx.fillText(enemy.char, sx + T/2, sy + T/2)\n}\n\`\`\`\n`
  output += `\nUżyj narzędzia \`create_sprite\` aby tworzyć sprite'y.\n`

  return output
}

export function create_sprite(args) {
  const { path: gamePath, category, name: spriteName, palette, pixels } = args
  const absPath = resolve(gamePath)
  const jsonPath = resolve(absPath, '_sprites.json')

  const gameCtx = detectGameContext()
  const allowedCategories = gameCtx ? getCategoriesForTemplate(gameCtx.template) : VALID_CATEGORIES
  if (!allowedCategories.includes(category)) {
    return JSON.stringify({ error: `Invalid category: ${category}. Valid for ${gameCtx ? gameCtx.template : 'all'}: ${allowedCategories.join(', ')}` })
  }

  if (!Array.isArray(pixels) || pixels.length === 0) {
    return JSON.stringify({ error: 'pixels must be a non-empty array of strings' })
  }
  const h = pixels.length
  const w = pixels[0].length
  for (let i = 0; i < h; i++) {
    if (typeof pixels[i] !== 'string') {
      return JSON.stringify({ error: `Row ${i} must be a string` })
    }
    if (pixels[i].length !== w) {
      return JSON.stringify({ error: `Row ${i} has ${pixels[i].length} chars, expected ${w}` })
    }
    for (const ch of pixels[i]) {
      if (ch !== '.' && !palette[ch]) {
        return JSON.stringify({ error: `Character '${ch}' in row ${i} not found in palette` })
      }
    }
  }

  for (const [key, val] of Object.entries(palette)) {
    if (typeof val !== 'string' || !/^#[0-9a-fA-F]{3,6}$/.test(val)) {
      return JSON.stringify({ error: `Invalid color '${val}' for palette key '${key}'` })
    }
  }

  let data = {}
  if (existsSync(jsonPath)) {
    try { data = JSON.parse(readFileSync(jsonPath, 'utf-8')) } catch (e) { data = {} }
  }

  if (!data[category]) data[category] = {}
  data[category][spriteName] = { w, h, palette, pixels }

  writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n')
  writeFileSync(resolve(absPath, 'sprites.js'), generateSpritesJs(data))

  let totalSprites = 0
  for (const cat of Object.values(data)) totalSprites += Object.keys(cat).length

  return JSON.stringify({
    ok: true,
    message: `Sprite '${spriteName}' dodany do kategorii '${category}' (${w}x${h})`,
    total_sprites: totalSprites,
    preview: pixels.join('\n'),
  })
}

export function validate_assets(args) {
  const { path: gamePath, template: tmplArg } = args
  const absPath = resolve(gamePath)
  const jsonPath = resolve(absPath, '_sprites.json')

  let template = tmplArg
  if (!template) {
    const gameCtx = detectGameContext()
    if (gameCtx) template = gameCtx.template
  }
  if (!template) {
    const targetConfig = resolve(absPath, '.forkarcade.json')
    if (existsSync(targetConfig)) {
      try { template = JSON.parse(readFileSync(targetConfig, 'utf-8')).template } catch (e) { /* ignore */ }
    }
  }

  if (!template || !TEMPLATES[template]?.assets) {
    return JSON.stringify({ error: 'Cannot detect template type. Pass template parameter explicitly.' })
  }

  const guide = TEMPLATES[template].assets

  let data = {}
  if (existsSync(jsonPath)) {
    try { data = JSON.parse(readFileSync(jsonPath, 'utf-8')) } catch (e) { data = {} }
  }

  let spritesInHtml = false
  if (existsSync(resolve(absPath, 'index.html'))) {
    spritesInHtml = readFileSync(resolve(absPath, 'index.html'), 'utf-8').includes('sprites.js')
  }

  const report = {}
  let totalFound = 0, totalRequired = 0
  for (const [cat, info] of Object.entries(guide.categories)) {
    const found = data[cat] ? Object.keys(data[cat]) : []
    const missing = info.sprites.filter(s => !found.includes(s))
    report[cat] = { found, missing }
    totalFound += found.length
    totalRequired += info.sprites.length
  }

  return JSON.stringify({
    template,
    sprites_file: existsSync(resolve(absPath, 'sprites.js')),
    sprites_json: existsSync(jsonPath),
    included_in_html: spritesInHtml,
    categories: report,
    total_found: totalFound,
    total_required: totalRequired,
    complete: totalFound >= totalRequired,
  }, null, 2)
}

export function preview_assets(args) {
  const { path: gamePath } = args
  const absPath = resolve(gamePath)
  const jsonPath = resolve(absPath, '_sprites.json')

  if (!existsSync(jsonPath)) {
    return JSON.stringify({ error: 'No _sprites.json found. Create sprites first with create_sprite tool.' })
  }

  let data = {}
  try { data = JSON.parse(readFileSync(jsonPath, 'utf-8')) } catch (e) {
    return JSON.stringify({ error: 'Cannot parse _sprites.json' })
  }

  const count = Object.values(data).reduce((sum, cat) => sum + Object.keys(cat).length, 0)
  if (count === 0) {
    return JSON.stringify({ error: 'No sprites defined yet. Use create_sprite to add sprites.' })
  }

  const html = generatePreviewHtml(data)
  const previewPath = resolve(absPath, '_preview.html')
  writeFileSync(previewPath, html)

  return JSON.stringify({
    ok: true,
    message: `Preview wygenerowany z ${count} sprite'ami`,
    path: previewPath,
    open: `open ${previewPath}`,
  })
}

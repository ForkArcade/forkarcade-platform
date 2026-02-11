import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { TEMPLATES, VALID_CATEGORIES } from './templates.js'

export function detectGameContext() {
  const configPath = resolve(process.cwd(), '.forkarcade.json')
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'))
      if (config.template && TEMPLATES[config.template]) return config
    } catch (e) { /* ignore */ }
  }
  return null
}

export function getCategoriesForTemplate(template) {
  const tmpl = TEMPLATES[template]
  return tmpl && tmpl.assets ? Object.keys(tmpl.assets.categories) : VALID_CATEGORIES
}

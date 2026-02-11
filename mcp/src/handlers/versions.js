import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

export function get_versions(args) {
  const { path: gamePath } = args
  const absPath = resolve(gamePath)
  const configPath = resolve(absPath, '.forkarcade.json')

  if (!existsSync(configPath)) {
    return JSON.stringify({ error: 'No .forkarcade.json found' })
  }

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))
    return JSON.stringify({
      slug: config.slug,
      title: config.title,
      template: config.template,
      currentVersion: config.currentVersion || 0,
      versions: config.versions || [],
    }, null, 2)
  } catch (e) {
    return JSON.stringify({ error: 'Cannot parse .forkarcade.json' })
  }
}

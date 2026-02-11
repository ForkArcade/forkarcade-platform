export function generateSpritesJs(data) {
  var lines = [
    '// sprites.js — ForkArcade pixel art sprites',
    '// Wygenerowany z _sprites.json przez create_sprite tool',
    '',
    'var SPRITE_DEFS = ' + JSON.stringify(data, null, 2),
    '',
    'function drawSprite(ctx, spriteDef, x, y, size) {',
    '  if (!spriteDef) return false',
    '  var pw = size / spriteDef.w',
    '  var ph = size / spriteDef.h',
    '  for (var row = 0; row < spriteDef.h; row++) {',
    '    var line = spriteDef.pixels[row]',
    '    for (var col = 0; col < spriteDef.w; col++) {',
    '      var ch = line[col]',
    '      if (ch === ".") continue',
    '      var color = spriteDef.palette[ch]',
    '      if (!color) continue',
    '      ctx.fillStyle = color',
    '      ctx.fillRect(x + col * pw, y + row * ph, Math.ceil(pw), Math.ceil(ph))',
    '    }',
    '  }',
    '  return true',
    '}',
    '',
    'function getSprite(category, name) {',
    '  return SPRITE_DEFS[category] && SPRITE_DEFS[category][name] || null',
    '}',
    '',
  ]
  return lines.join('\n')
}

export function generatePreviewHtml(data) {
  var spritesJson = JSON.stringify(data)
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Sprite Preview</title>
<style>
  body { background: #111; color: #ccc; font-family: monospace; padding: 20px; }
  h2 { color: #fd4; margin-top: 24px; }
  .sprite-row { display: flex; gap: 16px; flex-wrap: wrap; margin: 8px 0; }
  .sprite-card { text-align: center; }
  .sprite-card canvas { border: 1px solid #333; display: block; margin: 4px auto; image-rendering: pixelated; }
  .sprite-card span { font-size: 11px; color: #888; }
</style></head><body>
<h1>ForkArcade Sprite Preview</h1>
<script>
var data = ${spritesJson};
function drawSprite(ctx,s,x,y,sz){var pw=sz/s.w,ph=sz/s.h;for(var r=0;r<s.h;r++){var l=s.pixels[r];for(var c=0;c<s.w;c++){var ch=l[c];if(ch==='.')continue;ctx.fillStyle=s.palette[ch];ctx.fillRect(x+c*pw,y+r*ph,Math.ceil(pw),Math.ceil(ph))}}}
for (var cat in data) {
  var h2 = document.createElement('h2'); h2.textContent = cat; document.body.appendChild(h2);
  var row = document.createElement('div'); row.className = 'sprite-row';
  for (var name in data[cat]) {
    var card = document.createElement('div'); card.className = 'sprite-card';
    [2,4,6].forEach(function(scale) {
      var s = data[cat][name]; var w = s.w*scale, h = s.h*scale;
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      drawSprite(cv.getContext('2d'), s, 0, 0, w);
      card.appendChild(cv);
    });
    var label = document.createElement('span'); label.textContent = name;
    card.appendChild(label); row.appendChild(card);
  }
  document.body.appendChild(row);
}
</script></body></html>`
}

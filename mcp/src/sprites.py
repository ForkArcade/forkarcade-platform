import json


def migrate_sprite_data(data):
    """Convert old pixels format to frames format in-place."""
    for cat in data.values():
        for sprite in cat.values():
            if "pixels" in sprite and "frames" not in sprite:
                sprite["frames"] = [sprite.pop("pixels")]
            if "origin" not in sprite:
                sprite["origin"] = [0, 0]
    return data


def generate_sprites_js(data):
    lines = [
        "// sprites.js — ForkArcade sprite data",
        "// Generated from _sprites.json by create_sprite tool",
        "// Runtime (drawSprite, getSprite, spriteFrames) lives in fa-renderer.js",
        "",
        "FA.assets.spriteDefs = " + json.dumps(data, indent=2),
        "",
    ]
    return "\n".join(lines)


def generate_preview_html(data):
    sprites_json = json.dumps(data).replace("</", "<\\/")
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Sprite Preview</title>
<style>
  body {{ background: #111; color: #ccc; font-family: monospace; padding: 20px; }}
  h2 {{ color: #fd4; margin-top: 24px; }}
  .sprite-row {{ display: flex; gap: 16px; flex-wrap: wrap; margin: 8px 0; }}
  .sprite-card {{ text-align: center; }}
  .sprite-card canvas {{ border: 1px solid #333; display: block; margin: 4px auto; image-rendering: pixelated; }}
  .sprite-card span {{ font-size: 11px; color: #888; }}
  .frames-row {{ display: flex; gap: 4px; justify-content: center; }}
</style></head><body>
<h1>ForkArcade Sprite Preview</h1>
<script>
var data = {sprites_json};
function drawFrame(ctx,s,frame,x,y,sz){{var px=s.frames[frame];var pw=sz/s.w,ph=sz/s.h;for(var r=0;r<s.h;r++){{var l=px[r];for(var c=0;c<s.w;c++){{var ch=l[c];if(ch==='.')continue;ctx.fillStyle=s.palette[ch];ctx.fillRect(x+c*pw,y+r*ph,Math.ceil(pw),Math.ceil(ph))}}}}}}
for (var cat in data) {{
  var h2 = document.createElement('h2'); h2.textContent = cat; document.body.appendChild(h2);
  var row = document.createElement('div'); row.className = 'sprite-row';
  for (var name in data[cat]) {{
    var card = document.createElement('div'); card.className = 'sprite-card';
    var s = data[cat][name];
    var scale = 4;
    var framesRow = document.createElement('div'); framesRow.className = 'frames-row';
    for (var f = 0; f < s.frames.length; f++) {{
      var w = s.w*scale, h = s.h*scale;
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      drawFrame(cv.getContext('2d'), s, f, 0, 0, w);
      framesRow.appendChild(cv);
    }}
    card.appendChild(framesRow);
    var label = document.createElement('span');
    label.textContent = name + (s.frames.length > 1 ? ' (' + s.frames.length + ' frames)' : '');
    card.appendChild(label); row.appendChild(card);
  }}
  document.body.appendChild(row);
}}
</script></body></html>"""

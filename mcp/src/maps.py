import json


def generate_maps_js(data):
    """Generate maps.js from _maps.json data (dict of named maps)."""
    lines = [
        "// maps.js — ForkArcade map definitions",
        "// Generated from _maps.json by apply_data_patch tool",
        "",
        "FA.assets.mapDefs = " + json.dumps(data, indent=2),
        "",
        "function getMap(name) {",
        "  return FA.assets.mapDefs[name] || null",
        "}",
        "",
        "function getMapGrid(name) {",
        "  var m = FA.assets.mapDefs[name]",
        "  if (!m || !m.grid) return null",
        "  return m.grid.map(function(row) {",
        "    return row.split('').map(Number)",
        "  })",
        "}",
        "",
        "function getMapObjects(name) {",
        "  return (FA.assets.mapDefs[name] || {}).objects || []",
        "}",
        "",
        "function getMapZones(name) {",
        "  var m = FA.assets.mapDefs[name]",
        "  if (!m || !m.zones) return null",
        "  return m.zones.map(function(row) {",
        "    return row.split('')",
        "  })",
        "}",
        "",
    ]
    return "\n".join(lines)

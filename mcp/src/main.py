#!/usr/bin/env python3
import sys
import os
import json
import asyncio

# Add src directory to path for local imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp.server.lowlevel import Server
import mcp.server.stdio as stdio
import mcp.types as types

from context import detect_game_context
from tools import TOOLS
from handlers import workflow, assets, versions

HANDLERS = {
    "list_templates": workflow.list_templates,
    "init_game": workflow.init_game,
    "get_sdk_docs": workflow.get_sdk_docs,
    "get_game_prompt": workflow.get_game_prompt,
    "validate_game": workflow.validate_game,
    "publish_game": workflow.publish_game,
    "get_asset_guide": assets.get_asset_guide,
    "create_sprite": assets.create_sprite,
    "validate_assets": assets.validate_assets,
    "preview_assets": assets.preview_assets,
    "get_versions": versions.get_versions,
    "update_sdk": workflow.update_sdk,
}

app = Server("forkarcade")


@app.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    ctx = detect_game_context()
    tool_list = TOOLS
    if ctx:
        tool_list = [t for t in TOOLS if t["name"] not in ("list_templates", "init_game")]
    return [types.Tool(**t) for t in tool_list]


@app.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
    ctx = detect_game_context()
    args = dict(arguments or {})

    if ctx:
        if not args.get("template") and name in ("get_game_prompt", "get_asset_guide", "validate_assets"):
            args["template"] = ctx["template"]
        if not args.get("slug") and name == "publish_game":
            args["slug"] = ctx["slug"]
        if not args.get("title") and name == "publish_game":
            args["title"] = ctx["title"]

    handler = HANDLERS.get(name)
    if not handler:
        return [types.TextContent(type="text", text=json.dumps({"error": f"Unknown tool: {name}"}))]

    result = handler(args)
    return [types.TextContent(type="text", text=result)]


async def run():
    async with stdio.stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


def main():
    asyncio.run(run())


if __name__ == "__main__":
    main()

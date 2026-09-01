"""
CivicAI MCP Server.

Exposes civic-platform tools (hotspots, weather/AQI, incident lookups, road
closure simulation) over the Model Context Protocol so any MCP-compatible
client (including our own LangGraph agents) can call them uniformly.

Run with:  python -m app.mcp.server
"""
import asyncio

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

from app.core.logging_config import configure_logging, logger
from app.mcp.tools.civic_tools import (
    get_civic_reports,
    get_hotspots,
    get_risk_score,
    get_urban_impact,
    get_weather_aqi,
    simulate_road_closure,
)

configure_logging()
server = Server("civicai-mcp-server")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_civic_reports",
            description="Returns Lahore civic_reports (potholes, flooding, waste, streetlights, etc) "
                        "matching filters, most recent first, max 50.",
            inputSchema={
                "type": "object",
                "properties": {
                    "category": {"type": "string"},
                    "severity": {"type": "string"},
                    "status": {"type": "string"},
                    "since": {"type": "string", "description": "ISO datetime"},
                },
            },
        ),
        Tool(
            name="get_urban_impact",
            description="Returns the urban_incident record for a given id, including impact score, "
                        "explanation, and grouped report count.",
            inputSchema={
                "type": "object",
                "properties": {"incident_id": {"type": "string"}},
                "required": ["incident_id"],
            },
        ),
        Tool(
            name="get_hotspots",
            description="Returns the top zones in Lahore by clustered incident density/impact.",
            inputSchema={
                "type": "object",
                "properties": {"limit": {"type": "integer", "default": 10}},
            },
        ),
        Tool(
            name="get_risk_score",
            description="Returns aggregate urban risk for an area: average impact score of open "
                        "incidents within a radius, incident count, and top category.",
            inputSchema={
                "type": "object",
                "properties": {
                    "lat": {"type": "number"},
                    "lng": {"type": "number"},
                    "radius_m": {"type": "integer", "default": 500},
                },
                "required": ["lat", "lng"],
            },
        ),
        Tool(
            name="get_weather_aqi",
            description="Returns the latest weather/AQI reading for the given area (default Lahore).",
            inputSchema={
                "type": "object",
                "properties": {"area": {"type": "string", "default": "Lahore"}},
            },
        ),
        Tool(
            name="simulate_road_closure",
            description="Simulates closing a road for N hours: affected open incidents within 300m "
                        "of the road, nearby hospitals/schools within 1km, and an impact note. "
                        "Simplified radius-based logic, not real routing.",
            inputSchema={
                "type": "object",
                "properties": {
                    "road_id": {"type": "string"},
                    "hours": {"type": "integer"},
                },
                "required": ["road_id", "hours"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    logger.info(f"MCP tool call: {name} args={arguments}")
    try:
        if name == "get_civic_reports":
            result = await get_civic_reports(
                category=arguments.get("category"), severity=arguments.get("severity"),
                status=arguments.get("status"), since=arguments.get("since"),
            )
        elif name == "get_urban_impact":
            result = await get_urban_impact(arguments["incident_id"])
        elif name == "get_hotspots":
            result = await get_hotspots(limit=arguments.get("limit", 10))
        elif name == "get_risk_score":
            result = await get_risk_score(
                lat=arguments["lat"], lng=arguments["lng"], radius_m=arguments.get("radius_m", 500)
            )
        elif name == "get_weather_aqi":
            result = await get_weather_aqi(area=arguments.get("area", "Lahore"))
        elif name == "simulate_road_closure":
            result = await simulate_road_closure(road_id=arguments["road_id"], hours=arguments["hours"])
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]

        return [TextContent(type="text", text=str(result))]
    except Exception as exc:  # noqa: BLE001
        logger.exception(f"MCP tool '{name}' failed")
        return [TextContent(type="text", text=f"ERROR: {exc}")]


async def main() -> None:
    logger.info("Starting CivicAI MCP server (stdio transport)")
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
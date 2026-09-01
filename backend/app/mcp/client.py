"""
Lightweight in-process MCP client wrapper.

For this deployment the LangGraph agents run in the same Python process as the
FastAPI app, so rather than spawning a separate stdio/subprocess MCP client per
request, we call the underlying tool implementations directly through the same
interface names the MCP server exposes. This keeps a single source of truth for
tool schemas/behaviour (app/mcp/tools/*) while remaining swappable for a real
stdio/socket MCP client (see `app/mcp/server.py`) in a distributed deployment
(the `mcp-server` container is provided for that purpose).
"""
from app.core.logging_config import logger
from app.mcp.tools import civic_tools


CIVIC_TOOL_FUNCS = {
    "get_civic_reports": civic_tools.get_civic_reports,
    "get_urban_impact": civic_tools.get_urban_impact,
    "get_hotspots": civic_tools.get_hotspots,
    "get_risk_score": civic_tools.get_risk_score,
    "get_weather_aqi": civic_tools.get_weather_aqi,
    "simulate_road_closure": civic_tools.simulate_road_closure,
}


class MCPToolClient:
    """Uniform async interface used by LangGraph agent nodes to call MCP tools."""

    async def call(self, tool_name: str, **kwargs) -> object:
        logger.info(f"MCP client -> tool={tool_name} kwargs={kwargs}")
       
        if tool_name in CIVIC_TOOL_FUNCS:
            return await CIVIC_TOOL_FUNCS[tool_name](**kwargs)
        raise ValueError(f"Unknown MCP tool: {tool_name}")


mcp_client = MCPToolClient()

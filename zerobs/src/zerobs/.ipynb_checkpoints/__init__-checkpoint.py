from .tools import mcp
# from .services import start_required_services

def main():
    # Start required services before running the MCP server
    # start_required_services()
    # Run the MCP server
    mcp.run(transport="stdio")

if __name__ == "__main__":
    main()
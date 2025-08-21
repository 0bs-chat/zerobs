import type { Doc } from "../../../../../convex/_generated/dataModel";

export type McpTemplate = Omit<
  Doc<"mcps">,
  "_id" | "_creationTime" | "userId" | "updatedAt" | "enabled"
> & {
  description: string;
  image: string;
  official: boolean;
  promptTool?: string;
  configurableEnvs?: readonly {
    type: "query" | "mutation" | "action";
    func: string;
    args: Record<string, any> | readonly Record<string, any>[];
  }[];
  customAuthTokenFromEnv?: string;
};

// Type-safe MCP template data
export const MCP_TEMPLATES: readonly McpTemplate[] = [
  {
    template: "github",
    name: "GitHub",
    type: "http",
    status: "creating",
    url: "https://api.githubcopilot.com/mcp/",
    description:
      "Official GitHub MCP server that provides access to GitHub's APIs for repository management, issue tracking, pull requests, and code analysis. Supports both public and private repositories with proper authentication.",
    image:
      "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png",
    official: true,
    env: {},
    perChat: false,
    customAuthTokenFromEnv: "GITHUB_ACCESS_TOKEN",
  },
  {
    template: "python-exec",
    name: "Python Exec",
    type: "docker",
    dockerImage: "registry.fly.io/bitter-leaf-7106:v1",
    dockerPort: 8000,
    status: "creating",
    description:
      "Executes Python code in a sandboxed Docker environment, providing a secure and isolated space for running Python scripts and applications.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg",
    official: false,
    env: {},
    perChat: true,
  },
  {
    template: "memory",
    name: "Memory",
    type: "stdio",
    command: "bunx @modelcontextprotocol/server-memory",
    status: "creating",
    description:
      "Manages a knowledge graph to provide persistent memory for AI models. It allows for the creation, modification, and retrieval of entities, their relationships, and observations, enabling AI to retain and recall information across conversations.",
    image:
      "https://res.cloudinary.com/teepublic/image/private/s--3_l7DcWs--/c_crop,x_10,y_10/c_fit,w_1109/c_crop,g_north_west,h_1260,w_1260,x_-76,y_-151/co_rgb:000000,e_colorize,u_Misc:One%20Pixel%20Gray/c_scale,g_north_west,h_1260,w_1260/fl_layer_apply,g_north_west,x_-76,y_-151/bo_0px_solid_white/e_overlay,fl_layer_apply,h_1260,l_Misc:Poster%20Bumpmap,w_1260/e_shadow,x_6,y_6/c_limit,h_1254,w_1254/c_lpad,g_center,h_1260,w_1260/b_rgb:eeeeee/c_limit,f_auto,h_630,q_auto:good:420,w_630/v1566300068/production/designs/5669783_0.jpg",
    official: true,
    env: {},
    perChat: false,
  },
  {
    template: "context7-docs",
    name: "Context7 Docs",
    type: "http",
    url: "https://mcp.context7.com/mcp",
    status: "creating",
    description:
      "Provides up-to-date, version-specific documentation and code examples for various libraries and frameworks. It helps AI models avoid hallucinations and generate accurate code by supplying relevant, real-time context directly from official sources.",
    image: "https://context7.com/favicon.ico",
    official: true,
    env: {},
    perChat: false,
  },
  {
    template: "sequential-thinking",
    name: "Sequential Thinking",
    type: "stdio",
    command: "bunx @modelcontextprotocol/server-sequential-thinking",
    status: "creating",
    description:
      "Enables AI models to break down complex problems into sequential steps, improving reasoning capabilities and providing structured thinking processes for better problem-solving and decision-making.",
    image: "https://avatars.githubusercontent.com/u/182288589?s=200&v=4",
    official: true,
    env: {},
    perChat: false,
  },
  {
    template: "vibz",
    name: "Vibz",
    type: "docker",
    status: "creating",
    description: "Vibe code full stack convex + tanstack router apps",
    image: "https://www.convex.dev/favicon.ico",
    official: false,
    env: {},
    perChat: true,
    dockerImage:
      "registry.fly.io/still-smoke-7835",
    dockerPort: 80,
    promptTool: "prompt",
    configurableEnvs: [
      {
        type: "action",
        func: "internal.mcps.actions.getConvexDeployKey",
        args: {
          name: "vibz-mcp-server",
        },
      },
    ],
  },
] as const;

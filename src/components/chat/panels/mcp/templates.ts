import type { Doc } from "../../../../../convex/_generated/dataModel";

export type McpTemplate = Omit<
  Doc<"mcps">,
  "_id" | "_creationTime" | "userId" | "updatedAt" | "enabled"
> & {
  description: string;
  image: string;
  official: boolean;
};

// Type-safe MCP template data
export const MCP_TEMPLATES: readonly McpTemplate[] = [
  {
    name: "Github Repo",
    type: "stdio",
    status: "creating",
    command: "bunx github-repo-mcp",
    description:
      "Integrates with GitHub APIs to enable AI assistants to access up-to-date documentation, code, and repository data directly from any public GitHub project. This helps in automating workflows, analyzing data, and building AI tools with reduced hallucinations.",
    image:
      "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png",
    official: false,
    env: {},
  },
  {
    name: "Python Exec",
    type: "docker",
    dockerImage: "mantrakp04/py_exec:latest",
    dockerPort: 8000,
    status: "creating",
    description:
      "Executes Python code in a sandboxed Docker environment, providing a secure and isolated space for running Python scripts and applications.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg",
    official: false,
    env: {},
  },
  {
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
  },
  {
    name: "Context7 Docs",
    type: "http",
    url: "https://mcp.context7.com/mcp",
    status: "creating",
    description:
      "Provides up-to-date, version-specific documentation and code examples for various libraries and frameworks. It helps AI models avoid hallucinations and generate accurate code by supplying relevant, real-time context directly from official sources.",
    image: "https://context7.com/favicon.ico",
    official: true,
    env: {},
  },
  {
    name: "Sequential Thinking",
    type: "stdio",
    command: "bunx @modelcontextprotocol/server-sequential-thinking",
    status: "creating",
    description:
      "Enables AI models to break down complex problems into sequential steps, improving reasoning capabilities and providing structured thinking processes for better problem-solving and decision-making.",
    image:
      "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png",
    official: true,
    env: {},
  },
] as const;

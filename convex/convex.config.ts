import { defineApp } from "convex/server";
import workflow from "@convex-dev/workflow/convex.config";
import prosemirrorSync from "@convex-dev/prosemirror-sync/convex.config";

const app = defineApp();
app.use(workflow);
app.use(prosemirrorSync);

export default app;

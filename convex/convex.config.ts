import { defineApp } from "convex/server";
import migrations from "@convex-dev/migrations/convex.config";
import autumn from "@useautumn/convex/convex.config";

const app = defineApp();
app.use(migrations);
app.use(autumn);

export default app;

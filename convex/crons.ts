import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanUp",
  { minutes: 15 },
  internal.streams.mutations.cleanUp,
);

crons.interval(
  "stopIdleMCPs",
  { minutes: 1 },
  internal.mcps.actions.stopIdle,
);

export default crons;

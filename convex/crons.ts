import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup-streams",
  { minutes: 150 },
  internal.streams.mutations.cleanUp,
);

export default crons;

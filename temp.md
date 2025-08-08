### todo

--- keep in mind : move logic to hooks. ---------

- update these
  tool-streaming, because of vibz mcp as it one shots the generation. so we need to live stream to the user all the changes.
  https://github.com/0bs-chat/zerobs/tree/feat/message-queue : the message queue function.

- vibe coding (better auth -> convex cloud migration -> streaming tool calls -> convex oauth integration -> revamp mcp templates to pass along the env vars)
  custom ui for vibz mcp. (like artifacts, we will replace the panel content with the ui for vibz)(preview, dashboard (convex dashboard), code (vs code))

- migrate to better auth (when i get the green light from mantra after better-auth integrates.)
- infinite scroll area everywhere.
- look into action caching.
- add more integrations.

---

- pricing [imp]
- usage
- improve ux overall with loading states and whatnot.
- google integration (the code is already there just need to setup oauth)
- business related mcp with ability to autofill connection info (like auto fetching api key/oauth key for the headers in mcp using oauth, etc to reduce friction)

- need message queue system
- immediate send, wait for file to be processed check on the frontend instead of backend

</br>

try different frameworks:

## nextjs

<br/>

## tanstack start

### found out

1. we can't go around the convex cache ttl. i was thinking of no refetching until or retrieving messages from cache. we are doing that but after a certain time (gctime it cleans the cache).
2.

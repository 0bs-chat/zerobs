### todo

--- keep in mind : move logic to hooks. ---------

https://github.com/0bs-chat/zerobs/tree/feat/message-queue : the message queue function.

- infinite scroll area everywhere.
- look into action caching.
- add more integrations on the go allowing to auto fill auth tokens in sse mcp servers like github, nextjs etc.

---

- pricing [imp]
- usage
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

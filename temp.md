--ui changes need to be made --

1. make settings page. [done]

-------- todo --------------------

- pricing [imp]
- usage
- google integration (the code is already there just need to setup oauth)
- business related mcp with ability to autofill connection info (like auto fetching api key/oauth key for the headers in mcp using oauth, etc to reduce friction)

* need message queue system
* immediate send, wait for file to be processed check on the frontend instead of backend

caching implementation :

------ keep in mind : move logic to hooks. ---------

- infinite scroll area everywhere.
- convex subscription caching. : will make the ui snappy, can caus too much bandwidth usage.
- preloading.
- look into action caching.

=====

current : we refetch on every visit to a chat. because usequery fetches all the content again and again and again. which results in database bandwidth increase.
magic cache.: using useQuery from convex-helper/react/cache . we get the data from cache for a certain time. we can see the time as much time as we want. no fetching of data again and again. which even if got from cache. it still has to send it over the network which can cause database bandwidth increase.

- how about fetching top 20 chats.

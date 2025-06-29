### todo

- [x] resizable panel ui change.

- [x] word-wrap ui bug.

- [ ] isomorphic git loading time problem.

### ssr migration

1. use ssr to load the previous chats and let the new chats be loaded using the convex query and stuff.

2. the langchain [500 kb] and the isomorphic git are heavy client level imports.

<br/>

### put everything on tracking.

### todo (migration to tanstack start.)

> put all steps

1. ssr rendering pages.

   > start with the pages needing no auth like landing. > root layout > route splitting and preloading. > lazy loading heavy shit. > streaming non critical stuff.

2. moving the code rendering in the markdown to shiki (ssr setup).
3. <s>moving to better auth or clerk.</s>

(clerk may get advantage if we wanna use clerk billing.)

### clerk migration

1. <s> setup clerk </s>
2. <s> remove convex auth. </s>

### imp resources

1. https://stack.convex.dev/anonymous-users-via-sessions

for context:
jus copy the streaming implementation from the temp branch
the core logic hasn't changed
remember to only call the latest chunks, u can try streaming 5+ msg wth math on t3 chat and try it on dev.0bs.chat, u'll see the difference

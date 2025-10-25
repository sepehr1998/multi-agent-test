# Multi-Agent Swarm Server

The server exposes an SSE stream that coordinates six specialised frontend agents. You can test a prompt end-to-end with `curl`:

```bash
curl -N "http://127.0.0.1:3000/swarm/stream?prompt=Plan+and+build+a+marketing+site+for+a+new+AI+productivity+app"
```

This keeps the connection open and prints collaboration events as they arrive. The prompt above asks the swarm to scaffold a brand-new marketing site project.

For an initial snapshot of the available agents (useful for populating your visualisation UI), call the directory endpoint:

```bash
curl -s "http://127.0.0.1:3000/agents" | jq
```

Both endpoints run against the server started with `node src/main.js`. Ensure you set `OPENAI_API_KEY` (or `AI_API_KEY`) if you want the agents to delegate work to a live model; otherwise their scripted fallbacks will be used.

Without a configured AI provider the specialists now publish blueprint documents only. Once an API key is supplied they will plan, build, and refine a fully working project tailored to the supplied prompt.

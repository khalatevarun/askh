# ASKH Backend

Express API for ASKH: template selection and LLM-powered code generation via OpenRouter.

## Tech Stack

Express, TypeScript, OpenAI SDK, CORS, dotenv.

## Scripts

```bash
npm run dev     # Compile + run (port 3000)
npm run build   # TypeScript compile
npm start       # Run compiled output
```

## API

| Endpoint | Description |
|----------|-------------|
| POST `/template` | Returns framework template and prompts for the given user idea |
| POST `/chat` | Sends messages to LLM, returns XML artifacts |
| POST `/enhance-prompt` | Streams an enhanced prompt (SSE) |

## Environment

`OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` – required for LLM calls.

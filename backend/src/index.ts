require("dotenv").config();
import express from "express";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { basePrompt as reactBasePrompt } from "./defaults/react";
import { basePrompt as nodeBasePrompt } from "./defaults/node";
import { basePrompt as vueBasePrompt } from "./defaults/vue";
import { basePrompt as svelteBasePrompt } from "./defaults/svelte";
import { basePrompt as solidBasePrompt } from "./defaults/solid";
import { getBaseDesignPrompt, getSystemPrompt } from "./prompts";
import cors from "cors";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
});

const app = express();
app.use(cors());
app.use(express.json());

const MODEL = "arcee-ai/trinity-large-preview:free";

const WEBAPP_FRAMEWORKS = ["react", "vue", "svelte", "solid"] as const;
type WebappFramework = (typeof WEBAPP_FRAMEWORKS)[number];

function isWebappFramework(s: string): s is WebappFramework {
  return WEBAPP_FRAMEWORKS.includes(s as WebappFramework);
}

function getWebappBasePrompt(webapp: string): string {
  if (!isWebappFramework(webapp)) return reactBasePrompt;
  switch (webapp) {
    case "react":
      return reactBasePrompt;
    case "vue":
      return vueBasePrompt;
    case "svelte":
      return svelteBasePrompt;
    case "solid":
      return solidBasePrompt;
    default:
      return reactBasePrompt;
  }
}

app.post("/template", async (req, res) => {
  const prompt = req.body.prompt;
  const raw = req.body.framework;
  const framework = {
    webapp: typeof raw?.webapp === "string" && isWebappFramework(raw.webapp) ? raw.webapp : "react",
    service: typeof raw?.service === "string" ? raw.service : "",
  };

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "Return exactly one word: webapp or service. Only return that word. Base your answer on whether the user wants a frontend web application or a backend/service/API.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 50,
  });

  const projectType = (response.choices[0]?.message?.content?.trim().toLowerCase() ?? "").startsWith("service")
    ? "service"
    : "webapp";

  const fileListNote =
    "\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n";

  if (projectType === "service") {
    res.json({
      projectType: "service",
      prompts: [
        `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}${fileListNote}`,
      ],
      uiPrompts: [nodeBasePrompt],
    });
    return;
  }

  const basePrompt = getWebappBasePrompt(framework.webapp);
  res.json({
    projectType: "webapp",
    prompts: [
      getBaseDesignPrompt(framework.webapp),
      `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${basePrompt}${fileListNote}`,
    ],
    uiPrompts: [basePrompt],
  });
});

app.post("/enhance-prompt", async (req, res) => {
  const { message, context, framework } = req.body as {
    message: string;
    context?: { role: string; content: string }[];
    framework?: { webapp?: string; service?: string };
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let contextBlock = "";
  if (context && context.length > 0) {
    const summary = context
      .map((m) => `[${m.role}]: ${m.content.slice(0, 300)}`)
      .join("\n");
    contextBlock = `\n\nThe user is working on an existing project. Here is recent conversation context:\n<conversation_context>\n${summary}\n</conversation_context>\nUse this context to make the enhanced prompt more relevant to what the user is building.`;
  }

  const stackName = framework?.service === "node"
    ? "Node.js"
    : `${(framework?.webapp ?? "react").charAt(0).toUpperCase() + (framework?.webapp ?? "react").slice(1)} + Vite + Tailwind CSS`;
  const designContext = framework?.service === "node"
    ? ""
    : `\nThe user's selected tech stack is: ${stackName}. ${getBaseDesignPrompt(framework?.webapp ?? "react")}`;

  const enhanceInstructions = `\n\nIMPORTANT: Right now you are acting as a PROMPT ENHANCER. The user will give you a short prompt. Your job is to return a slightly improved version of it — more specific and clear, but still concise (2-4 sentences max). Focus ONLY on functionality, features, and UX — do NOT mention any frameworks, libraries, or technologies since the tech stack is already chosen by the user. Do NOT generate code, artifacts, XML, or markdown. Return ONLY the enhanced prompt text.${designContext}${contextBlock}`;

  try {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: getSystemPrompt() + enhanceInstructions,
        },
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 300,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Error initiating stream:", error);
    res.write(`data: ${JSON.stringify({ error: "Failed to initiate streaming" })}\n\n`);
    res.end();
  }
});

app.post("/chat", async (req, res) => {
  const messages = req.body.messages as ChatCompletionMessageParam[];

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "system", content: getSystemPrompt() }, ...messages],
    max_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content;
  console.log(response);
  res.json({ response: content ?? "" });
});

app.listen(3000);

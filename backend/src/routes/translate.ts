import { Hono } from "hono";
import { z } from "zod";

const translateRouter = new Hono();

const translateBodySchema = z.object({
  title: z.string(),
  aboutItem: z.array(z.string()).default([]),
  specifications: z
    .array(z.object({ name: z.string(), value: z.string() }))
    .default([]),
  description: z.string().nullable().default(null),
  badges: z.array(z.string()).default([]),
});

type TranslateBody = z.infer<typeof translateBodySchema>;

type TranslatedData = {
  title?: string;
  aboutItem?: string[];
  specifications?: { name: string; value: string }[];
  description?: string | null;
  badges?: string[];
};

translateRouter.post("/", async (c) => {
  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { error: { message: "Invalid JSON body", code: "INVALID_BODY" } },
      400
    );
  }

  const parseResult = translateBodySchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      {
        error: {
          message: "Invalid request body",
          code: "VALIDATION_ERROR",
        },
      },
      400
    );
  }

  const body: TranslateBody = parseResult.data;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json(
      {
        error: {
          message: "OpenAI API key is not configured",
          code: "MISSING_API_KEY",
        },
      },
      502
    );
  }

  // Build object with only non-empty fields to save tokens
  const dataToTranslate: Record<string, unknown> = {
    title: body.title,
  };

  if (body.aboutItem.length > 0) {
    dataToTranslate.aboutItem = body.aboutItem.slice(0, 5);
  }

  if (body.specifications.length > 0) {
    // Keep name as-is; only translate value fields
    dataToTranslate.specifications = body.specifications
      .slice(0, 8)
      .map((spec) => ({ name: spec.name, value: spec.value }));
  }

  if (body.description !== null) {
    dataToTranslate.description = body.description;
  }

  if (body.badges.length > 0) {
    dataToTranslate.badges = body.badges;
  }

  let openAIResponse: Response;
  try {
    openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              'You are a professional translator. Translate the given JSON into Arabic, regardless of the source language (English, Chinese, etc.). Keep product names, brand names, and technical measurements (like "40 oz", "USB-C") in their original form. Return ONLY valid JSON, no markdown, no explanation.',
          },
          {
            role: "user",
            content: JSON.stringify(dataToTranslate),
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });
  } catch (fetchError) {
    console.error("OpenAI fetch error:", fetchError);
    return c.json(
      {
        error: {
          message: "Failed to reach OpenAI API",
          code: "OPENAI_UNREACHABLE",
        },
      },
      502
    );
  }

  if (!openAIResponse.ok) {
    const errorText = await openAIResponse.text();
    console.error("OpenAI API error:", openAIResponse.status, errorText);
    return c.json(
      {
        error: {
          message: `OpenAI API returned status ${openAIResponse.status}`,
          code: "OPENAI_ERROR",
        },
      },
      502
    );
  }

  type OpenAIResponse = {
    choices?: { message?: { content?: string } }[];
  };

  let openAIJson: OpenAIResponse;
  try {
    openAIJson = (await openAIResponse.json()) as OpenAIResponse;
  } catch {
    return c.json(
      {
        error: {
          message: "Failed to parse OpenAI response",
          code: "PARSE_ERROR",
        },
      },
      502
    );
  }

  const content = openAIJson.choices?.[0]?.message?.content;
  if (!content) {
    return c.json(
      {
        error: {
          message: "OpenAI returned empty content",
          code: "EMPTY_RESPONSE",
        },
      },
      502
    );
  }

  let translated: TranslatedData;
  try {
    translated = JSON.parse(content) as TranslatedData;
  } catch {
    console.error("Failed to parse translated JSON:", content);
    return c.json(
      {
        error: {
          message: "OpenAI returned invalid JSON",
          code: "INVALID_JSON",
        },
      },
      502
    );
  }

  // Restore original spec names (we only translated values)
  if (translated.specifications && body.specifications.length > 0) {
    const originalSpecs = body.specifications.slice(0, 8);
    translated.specifications = translated.specifications.map((spec, i) => ({
      name: originalSpecs[i]?.name ?? spec.name,
      value: spec.value,
    }));
  }

  return c.json({ data: { translated } });
});

export { translateRouter };

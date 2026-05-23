import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

function getEnv(key: string): string { return Deno.env.get(key) ?? ""; }

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  let rawBody: any;
  try { rawBody = await req.json(); } catch {
    return new Response(JSON.stringify({ error: { message: "Invalid JSON body" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: "OpenAI API key not configured" } }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const dataToTranslate: Record<string, unknown> = { title: rawBody.title ?? "" };
  if (rawBody.aboutItem?.length > 0) dataToTranslate.aboutItem = rawBody.aboutItem.slice(0, 5);
  if (rawBody.specifications?.length > 0) dataToTranslate.specifications = rawBody.specifications.slice(0, 8);
  if (rawBody.description !== null && rawBody.description !== undefined) dataToTranslate.description = rawBody.description;
  if (rawBody.badges?.length > 0) dataToTranslate.badges = rawBody.badges;

  try {
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: 'You are a professional translator. Translate the given JSON into Arabic, regardless of the source language. Keep product names, brand names, and technical measurements in their original form. Return ONLY valid JSON, no markdown.' },
          { role: "user", content: JSON.stringify(dataToTranslate) },
        ],
        temperature: 0.1, max_tokens: 4000,
      }),
    });

    if (!openAIResponse.ok) {
      return new Response(JSON.stringify({ error: { message: `OpenAI error: ${openAIResponse.status}` } }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const openAIJson = await openAIResponse.json();
    const content = openAIJson.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: { message: "Empty response from OpenAI" } }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let translated = JSON.parse(content);
    if (translated.specifications && rawBody.specifications?.length > 0) {
      const originalSpecs = rawBody.specifications.slice(0, 8);
      translated.specifications = translated.specifications.map((spec: any, i: number) => ({
        name: originalSpecs[i]?.name ?? spec.name, value: spec.value,
      }));
    }

    return new Response(JSON.stringify({ data: { translated } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: "Translation failed" } }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

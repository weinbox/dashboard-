import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

function getEnv(key: string): string {
  return Deno.env.get(key) ?? "";
}

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get context from request body (current page, product info, etc.)
  let context: Record<string, unknown> = {};
  try {
    context = await req.json();
  } catch {
    // No body is fine - default context
  }

  const currentPage = (context.currentPage as string) || "home";
  const productInfo = context.productInfo as Record<string, unknown> | undefined;
  const searchQuery = (context.searchQuery as string) || "";

  // Build system instructions based on current page context
  let instructions = `أنت مساعد BoxBuy الصوتي الذكي. أنت تساعد الزبائن العراقيين في البحث عن المنتجات وشرائها من مواقع عالمية.
تتكلم بالعربي العراقي بأسلوب ودود ومختصر.
الأسعار تظهر بالدينار العراقي.
المنصات المتاحة: Amazon, eBay, Walmart, Taobao, 1688, Temu, iHerb.

`;

  if (currentPage === "product" && productInfo) {
    instructions += `الزبون حالياً في صفحة منتج:
- اسم المنتج: ${productInfo.title || "غير معروف"}
- السعر: ${productInfo.price || "غير محدد"}
- المنصة: ${productInfo.platform || "غير محددة"}
- التقييم: ${productInfo.rating || "غير متوفر"}

ساعده بمعلومات عن هذا المنتج، اقترح بدائل، أو أجب على أسئلته.`;
  } else if (currentPage === "search" && searchQuery) {
    instructions += `الزبون حالياً في صفحة البحث وبحث عن: "${searchQuery}"
ساعده بتحسين البحث، اقتراح كلمات بديلة، أو فلترة النتائج.`;
  } else if (currentPage === "store") {
    instructions += `الزبون حالياً في صفحة متجر معين.
ساعده بالتنقل واختيار المنتجات المناسبة.`;
  } else {
    instructions += `الزبون في الصفحة الرئيسية.
ساعده بالبحث عن منتجات، اقترح منتجات شائعة، أو أجب على أسئلته عن الخدمة.`;
  }

  // Tools that the voice agent can call
  const tools = [
    {
      type: "function",
      name: "search_products",
      description: "البحث عن منتجات في المتاجر المتاحة",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "كلمة البحث" },
          platform: { type: "string", enum: ["amazon", "ebay", "walmart", "taobao", "1688", "temu", "iherb"], description: "المنصة المحددة (اختياري)" },
        },
        required: ["query"],
      },
    },
    {
      type: "function",
      name: "get_product_details",
      description: "الحصول على تفاصيل منتج معين",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "معرف المنتج" },
          platform: { type: "string", description: "المنصة" },
        },
        required: ["productId", "platform"],
      },
    },
    {
      type: "function",
      name: "calculate_price",
      description: "حساب السعر النهائي بالدينار العراقي شامل الشحن",
      parameters: {
        type: "object",
        properties: {
          priceUSD: { type: "number", description: "السعر بالدولار" },
          weightKg: { type: "number", description: "الوزن بالكيلوغرام" },
          category: { type: "string", enum: ["regular", "mobile", "laptop", "perfume", "supplement", "hazardous"], description: "تصنيف المنتج" },
        },
        required: ["priceUSD"],
      },
    },
    {
      type: "function",
      name: "navigate_to",
      description: "التنقل إلى صفحة معينة في التطبيق",
      parameters: {
        type: "object",
        properties: {
          page: { type: "string", enum: ["home", "search", "cart", "orders"], description: "الصفحة المطلوبة" },
          searchQuery: { type: "string", description: "كلمة البحث إذا كانت الصفحة search" },
        },
        required: ["page"],
      },
    },
  ];

  try {
    // Create ephemeral token for Realtime API (GA endpoint)
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-4o-mini-realtime-preview",
          audio: {
            output: { voice: "alloy" },
          },
          instructions,
          tools,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${response.status}`, detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to create realtime session", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
  const searchResults = (context.searchResults as Array<Record<string, unknown>>) || [];
  const cartItems = (context.cartItems as Array<Record<string, unknown>>) || [];
  const cartTotal = (context.cartTotal as string) || "";
  const memory = (context.memory as Record<string, unknown>) || {};
  const userName = (memory.name as string) || "";
  const userPrefs = (memory.preferences as string) || "";

  // Build instructions optimized for mini model
  let instructions = `أنت مساعد BoxBuy الصوتي. تتكلم عراقي مختصر وودود.
المواقع المتاحة: Amazon, eBay, Walmart, Taobao, 1688, iHerb.

## قواعد إلزامية:
- تكلّم عن الصفحة الحالية اللي الزبون فيها. لا تتجاهل السياق.
- عندما يطلب الزبون بحث عن منتج: اسأله "من أي موقع تحب؟" ثم نفّذ navigate_to_store فوراً.
- إذا ذكر الموقع مباشرة: نفّذ navigate_to_store بدون سؤال.
- نفّذ الأداة مباشرة. لا تشرح كيف يبحث.
- يجب أن تستخدم الأدوات (tools) لتنفيذ الطلبات.
- إذا طلب الزبون إضافة منتج للسلة: استخدم add_to_cart.
- إذا سأل عن تفاصيل منتج أو سعره بالدينار: استخدم get_product_details.
- إذا أراد مقارنة منتجات: استخدم compare_products.
- إذا طلب اقتراحات أو توصيات: استخدم get_recommendations.
- إذا لم تستطع المساعدة أو طلب التحدث مع شخص: استخدم handoff_to_human.
- إذا أخبرك الزبون باسمه أو تفضيلاته: استخدم save_memory لحفظها.`;

  // Inject memory context
  if (userName) {
    instructions += `\nاسم الزبون: ${userName}. نادِه باسمه.`;
  }
  if (userPrefs) {
    instructions += `\nتفضيلاته: ${userPrefs}.`;
  }

  // Inject cart context
  if (cartItems.length > 0) {
    instructions += `\nسلة الزبون فيها ${cartItems.length} منتج`;
    if (cartTotal) instructions += ` بقيمة ${cartTotal}`;
    instructions += `.`;
  }

  if (currentPage === "product" && productInfo) {
    // Product page — rich context
    instructions += `\n\n## الزبون حالياً في صفحة منتج:`;
    instructions += `\nالعنوان: ${productInfo.title || "غير معروف"}`;
    instructions += `\nالسعر: ${productInfo.price || "غير محدد"}`;
    instructions += `\nالمنصة: ${productInfo.platform || ""}`;
    if (productInfo.brand) instructions += `\nالماركة: ${productInfo.brand}`;
    if (productInfo.rating) instructions += `\nالتقييم: ${productInfo.rating}/5${productInfo.reviewCount ? ` (${productInfo.reviewCount} تقييم)` : ''}`;
    if (productInfo.availability) instructions += `\nالتوفر: ${productInfo.availability}`;
    if (productInfo.aboutItem) {
      const aboutItems = productInfo.aboutItem as string[];
      if (aboutItems.length > 0) {
        instructions += `\nعن المنتج: ${aboutItems.slice(0, 4).join(' | ')}`;
      }
    }
    if (productInfo.specifications) {
      const specs = productInfo.specifications as Array<{name: string; value: string}>;
      if (specs.length > 0) {
        instructions += `\nالمواصفات: ${specs.slice(0, 5).map(s => `${s.name}: ${s.value}`).join(', ')}`;
      }
    }
    if (productInfo.description) {
      const desc = String(productInfo.description).slice(0, 200);
      instructions += `\nالوصف: ${desc}`;
    }
    instructions += `\n\n## تصرّفك في صفحة المنتج:
- رحّب واشرح للزبون عن المنتج بشكل مختصر وجذاب (اسمه، ماركته، سعره، ميزاته الرئيسية).
- اسأله إذا يبي يضيفه للسلة أو يعرف سعره بالدينار العراقي.
- إذا سأل عن المنتج أجبه من المعلومات الموجودة عندك.
- إذا طلب مقارنة: اقترح عليه البحث عن بدائل واستخدم compare_products.
- كن متحمس وأبدع بوصف المنتج!`;

  } else if (currentPage === "search" && (searchQuery || searchResults.length > 0)) {
    // Search results page
    instructions += `\n\n## الزبون حالياً في صفحة نتائج البحث:`;
    if (searchQuery) instructions += `\nبحث عن: "${searchQuery}"`;
    if (searchResults.length > 0) {
      instructions += `\nعدد النتائج: ${searchResults.length} منتج`;
      instructions += `\nالنتائج:`;
      searchResults.slice(0, 6).forEach((r: any, i: number) => {
        instructions += `\n${i + 1}. ${r.title || "بدون عنوان"} - ${r.price || "غير محدد"} (${r.platform || ""})`;
      });
    }
    instructions += `\n\n## تصرّفك في صفحة البحث:
- أخبر الزبون بملخص سريع عن النتائج (مثلاً "لكيتلك ${searchResults.length} نتيجة").
- اذكر أفضل المنتجات بالاسم والسعر.
- اسأله إذا يبي تفاصيل عن منتج معين أو يبي يقارن بين اثنين.
- إذا طلب منتج بعينه: وجّهه لفتحه.
- إذا مو راضي عن النتائج: اسأله يبي يبحث بموقع ثاني.`;

  } else {
    // Home page
    instructions += `\n\n## الزبون في الصفحة الرئيسية:
- رحّب بجملة قصيرة${userName ? ` وسمّه ${userName}` : ''}.
- اسأله شنو يدوّر أو شنو يحتاج اليوم.
- اقترح عليه يبحث عن شي أو يتصفح المتاجر.`;
  }

  // Tools that the voice agent can call
  const tools = [
    {
      type: "function",
      name: "navigate_to_store",
      description: "الدخول على موقع/متجر معين والبحث فيه. استخدم هذه الأداة دائماً عندما يطلب الزبون البحث عن منتج.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["amazon", "ebay", "walmart", "taobao", "1688", "iherb"], description: "الموقع" },
          query: { type: "string", description: "كلمة البحث" },
        },
        required: ["platform", "query"],
      },
    },
    {
      type: "function",
      name: "search_products",
      description: "البحث عن منتجات عامة",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "كلمة البحث" },
          platform: { type: "string", enum: ["amazon", "ebay", "walmart", "taobao", "1688", "iherb"] },
        },
        required: ["query"],
      },
    },
    {
      type: "function",
      name: "navigate_to",
      description: "التنقل إلى صفحة",
      parameters: {
        type: "object",
        properties: {
          page: { type: "string", enum: ["home", "search", "cart", "orders"] },
          searchQuery: { type: "string" },
        },
        required: ["page"],
      },
    },
    {
      type: "function",
      name: "calculate_price",
      description: "حساب السعر بالدينار العراقي",
      parameters: {
        type: "object",
        properties: {
          priceUSD: { type: "number" },
          weightKg: { type: "number" },
        },
        required: ["priceUSD"],
      },
    },
    {
      type: "function",
      name: "add_to_cart",
      description: "إضافة المنتج الحالي إلى سلة التسوق. استخدمها عندما يقول الزبون أضفه للسلة أو أريده.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "معرّف المنتج (اختياري - يأخذ المنتج الحالي إذا فارغ)" },
          quantity: { type: "number", description: "الكمية، الافتراضي 1" },
        },
        required: [],
      },
    },
    {
      type: "function",
      name: "get_product_details",
      description: "جلب تفاصيل منتج وسعره بالدينار العراقي شاملاً الشحن. استخدمها لما يسأل الزبون كم سعره بالدينار.",
      parameters: {
        type: "object",
        properties: {
          productUrl: { type: "string", description: "رابط المنتج" },
          platform: { type: "string", enum: ["amazon", "ebay", "walmart", "taobao", "1688", "iherb"] },
        },
        required: ["productUrl", "platform"],
      },
    },
    {
      type: "function",
      name: "compare_products",
      description: "مقارنة منتجين أو أكثر من نتائج البحث",
      parameters: {
        type: "object",
        properties: {
          productIndices: {
            type: "array",
            items: { type: "number" },
            description: "أرقام المنتجات من نتائج البحث (مثلاً [1, 3] لمقارنة الأول والثالث)",
          },
        },
        required: ["productIndices"],
      },
    },
    {
      type: "function",
      name: "get_recommendations",
      description: "اقتراح منتجات بناءً على اهتمامات الزبون أو ما يبحث عنه",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "الفئة أو الاهتمام (مثل إلكترونيات، ملابس، فيتامينات)" },
          budget: { type: "string", description: "الميزانية التقريبية (اختياري)" },
        },
        required: ["category"],
      },
    },
    {
      type: "function",
      name: "save_memory",
      description: "حفظ معلومة عن الزبون مثل اسمه أو تفضيلاته لتذكّرها في المكالمات القادمة",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", enum: ["name", "preferences", "favorite_platform", "note"], description: "نوع المعلومة" },
          value: { type: "string", description: "القيمة" },
        },
        required: ["key", "value"],
      },
    },
    {
      type: "function",
      name: "handoff_to_human",
      description: "تحويل الزبون لفريق الدعم البشري عندما لا تستطيع المساعدة أو يطلب التحدث مع شخص حقيقي",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "سبب التحويل" },
        },
        required: ["reason"],
      },
    },
  ];

  // Check if this is an SDP offer (unified interface for WebRTC)
  const sdpOffer = context.sdp as string | undefined;

  if (!sdpOffer) {
    return new Response(
      JSON.stringify({ error: "Missing SDP offer in request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sessionConfig = JSON.stringify({
    type: "realtime",
    model: "gpt-realtime-mini",
    audio: { output: { voice: "alloy" } },
    instructions,
    tools,
    tool_choice: "auto",
  });

  try {
    // Unified interface: send SDP + session config as multipart form to /v1/realtime/calls
    const formData = new FormData();
    formData.set("sdp", sdpOffer);
    formData.set("session", sessionConfig);

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${response.status}`, detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OpenAI returns SDP answer as text
    const sdpAnswer = await response.text();

    return new Response(
      JSON.stringify({ sdp: sdpAnswer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to create realtime session", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

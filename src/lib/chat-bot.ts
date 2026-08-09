// Simple FAQ bot for the community chat. Matches keywords in the user's
// message and returns a helpful answer. Returns null when no rule matches.

type Rule = { test: RegExp; answer: string };

const RULES: Rule[] = [
  { test: /\b(hi|hello|hey|salut|bonjour)\b/i,
    answer: "Hi there! 👋 I'm the ST Kingston bot. Ask me about orders, delivery, payments, becoming an admin, or downloading the app." },

  { test: /\b(order|orders|track|tracking|where.*order)\b/i,
    answer: "To track an order, open **Account → Orders** or visit the order page with your order number. Each order shows live status and assigned admin." },

  { test: /\b(deliver|delivery|shipping|how long)\b/i,
    answer: "Delivery is handled by the nearest admin in your town. After checkout, the closest admin (within ~10 km) is auto-assigned and contacts you." },

  { test: /\b(pay|payment|momo|mobile money|orange money|cash)\b/i,
    answer: "Payment options are configured by your local admin (Mobile Money, Orange Money, or cash on delivery). You'll see them at checkout." },

  { test: /\b(admin|become.*admin|request.*admin|seller)\b/i,
    answer: "Go to **Account → Request admin badge**, fill the form (name, phone, region, town, GPS pin) and a super admin will approve. Only 1 admin is allowed per town." },

  { test: /\b(apk|download|install|app)\b/i,
    answer: "Tap the **Download APK** button on the homepage to install ST Kingston as an app on your Android phone." },

  { test: /\b(support|contact|complaint|help.*admin|email)\b/i,
    answer: "Tap the **Support** button (bottom-right) to email the team at coremagazinee@gmail.com." },

  { test: /\b(account|profile|edit.*name|change.*photo|avatar)\b/i,
    answer: "Open **Account** to edit your name, phone, and avatar at any time." },

  { test: /\b(badge|gold|silver|green)\b/i,
    answer: "Badges: 🟡 Gold = super admin (coremagazinee@gmail.com), ⚪ Silver = admin, 🟢 Green = member." },

  { test: /\b(cart|checkout|buy)\b/i,
    answer: "Add items to your cart, then open **Cart → Checkout**. You'll pick your delivery address (with GPS pin) and a payment method." },

  { test: /\b(review|rating|stars)\b/i,
    answer: "After your order is delivered, you can leave a review from the order page. Reviews are public and auto-approved." },

  { test: /\b(delete.*message|delete.*chat|remove.*message)\b/i,
    answer: "Press and hold your own message to delete it. Admins can delete or pin any message." },

  { test: /\b(help|what can you do|commands|features)\b/i,
    answer: "I can answer questions about orders, delivery, payments, becoming an admin, downloading the app, support, badges, cart, and reviews. Just ask!" },
];

export function getBotReply(msg: string): string | null {
  const text = msg.trim();
  if (!text) return null;
  // Only react to questions or messages that mention the bot.
  const looksLikeQuestion = /\?$|^(how|what|where|when|why|who|can|do|does|is|are)\b/i.test(text);
  const mentionsBot = /\bbot\b/i.test(text);
  if (!looksLikeQuestion && !mentionsBot) return null;

  for (const r of RULES) if (r.test.test(text)) return r.answer;

  return "I'm not sure about that one. Try asking about **orders, delivery, payments, admin requests, downloading the app, or support**. For anything else, tap the Support button to email the team.";
}

export const BOT_NAME = "ST Kingston Bot";

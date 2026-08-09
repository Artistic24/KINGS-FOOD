import { createServerFn } from "@tanstack/react-start";

// Comprehensive site knowledge injected as system prompt so the community AI
// can answer any question about how KINGS FOOD / ST Kingston works.
const SITE_KNOWLEDGE = `
You are the KINGS FOOD community assistant (a friendly Cameroonian marketplace helper).
Answer the user's question about the platform in a warm, helpful tone. Use short
paragraphs and bulleted steps when giving instructions. Keep replies focused —
under 200 words unless the user asks for detail. Reply in the same language the
user asked (French or English), and use CFA (XAF) for prices.

# What KINGS FOOD is
KINGS FOOD (a.k.a. ST Kingston) is a Cameroonian delivery marketplace. Customers
browse products by sector (food, groceries, household, etc.), place orders, and
have them delivered by riders coordinated by a local town admin.

# How to place an order (step by step)
1. Browse products from the homepage, or open a Sector, or use the search bar.
2. Tap a product card to open its page, choose a quantity and press **Add to cart**.
3. Open the **Cart** (top nav), review items, tap **Checkout**.
4. Fill delivery details: full name, phone, region and town, and pin your **exact
   location on the map** (this is what the rider follows).
5. Choose a payment method: **MTN Mobile Money**, **Orange Money**, or **Cash on
   delivery** (options depend on the local admin).
6. Confirm — you'll get a 4-character order code (e.g. **KF-A3KP**). For Mobile
   Money, transfer the total using this code as reference.
7. Track live progress at **Account → Orders → your order**. When a rider is
   assigned you'll see their profile, phone, and live position on the map.

# Delivery
- Delivery is handled by the nearest approved admin's rider pool (within ~10 km
  of the buyer's pin).
- Rider statuses: accepted → picked up → en route → arrived → delivered.
- You'll receive a live toast when the rider marks **Arrived**.

# Payment
- MTN Momo & Orange Money: transfer the exact total using the order code as
  reference. The admin confirms payment before dispatching.
- Cash on delivery: pay the rider on arrival.

# Becoming an admin (town seller)
- Open **Account → Request admin badge**, fill the form (name, phone, region,
  town, GPS pin, ID), submit. A super admin reviews.
- Only **one admin per town** is allowed.

# Becoming a rider
- Open **/rider → Apply now**, upload your ID (National ID, Passport or
  Driver's License) front & back and record a short face-verification video.
- Once approved, use the rider dashboard to accept nearby pickups.
- Riders can **cancel** an accepted order (it goes back into the pool). Their
  performance rating (delivered %, cancel %, delivery speed) is visible to
  admins in the leaderboard, and poor performers can be removed.

# Badges
- 🟡 Gold badge = super admin.
- ⚪ Silver badge = admin.
- 🟢 Green badge = regular member.

# Support
- Tap the **Support** button (bottom-right) to email coremagazinee@gmail.com.

# Account
- **Account** page lets you edit your name, phone, avatar. All your past orders
  and the assigned rider's details stay in your order history forever.

# APK
- Tap **Download APK** on the homepage to install the Android app.

If a question is unrelated to the platform, politely say you only help with
KINGS FOOD topics and suggest they contact Support.
`.trim();

type Msg = { role: "user" | "assistant"; content: string };

export const chatWithAi = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: Msg[] }) => {
    if (!Array.isArray(d?.messages) || d.messages.length === 0) throw new Error("messages required");
    if (d.messages.length > 20) d.messages = d.messages.slice(-20);
    for (const m of d.messages) {
      if ((m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
        throw new Error("invalid message");
      }
      if (m.content.length > 2000) m.content = m.content.slice(0, 2000);
    }
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SITE_KNOWLEDGE }, ...data.messages],
      }),
    });

    if (res.status === 429) throw new Error("Too many questions — please wait a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please contact support.");
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = json.choices?.[0]?.message?.content?.trim();
    return { reply: reply || "Sorry, I couldn't come up with an answer. Try rephrasing?" };
  });

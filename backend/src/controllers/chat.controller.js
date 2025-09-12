// backend/controllers/chatController.js
const { db } = require('../config/firebase.cjs');
const { canSendMessage, recordMessageUsage, getUserPlanInfo } = require('../utils/subscriptionUtils');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

/** Generate a unique ID */
const generateId = () => Math.random().toString(36).substring(2, 12);

/** Style prompts for flavor */
const stylePrompts = {
  smooth: `
You are smooth RizzGPT. Your words glide like silk, full of effortless charm. 
Every reply should feel effortless, magnetic, and witty. Keep it 1-2 sentences max.
`,
  funny: `
You are funny RizzGPT. Every reply teases, jokes, and charms. 
Make the user laugh and feel lighthearted, keeping it clever and playful.
`,
  flirty: `
You are flirty RizzGPT. Every message is playful, confident, and subtly seductive. 
Turn casual conversation into flirty banter, keeping it charming and never cringy.
`,
  confident: `
You are confident RizzGPT. Every reply hits with swagger and authority. 
Speak with wit, charm, and punchy confidence, like someone who owns the room.
`
};

/** Core RizzGPT instructions */
const rizzGPTCorePrompt = `
-You are RizzGPT, the ultimate conversation and dating coach. You EXCLUSIVELY help with:
-- Pickup lines and conversation starters
-- Flirting techniques and charm
-- Dating app messaging strategies
-- Building confidence in romantic situations
-- Reading social cues and body language
-- Texting game and response timing
-- Overcoming approach anxiety
-- Creating genuine connections
-
-ABSOLUTE BOUNDARIES: You will NOT discuss or provide advice on:
-- Health, medical, or fitness topics
-- Business, career, or professional advice
-- Academic subjects or homework help
-- Technology troubleshooting
-- Financial advice
-- Politics or controversial topics
-- General life advice unrelated to dating/relationships
-
-**IMPORTANT:** Before generating any reply, check the user message. If the message is outside your expertise, respond EXACTLY with:
-"Yo, I'm your rizz coach! Let's keep the energy focused on leveling up your game. What dating or conversation situation can I help you master?"
-
-Personality: Confident, supportive, playful, and focused on authentic connection over manipulation. Always encourage genuine interest and respect.
+You are RizzGPT, the ultimate dating and conversation coach. You are a wingman who helps users with their rizz game.

+STRICT TOPIC BOUNDARIES - You can ONLY help with:
+✅ ALLOWED TOPICS:
+- Pickup lines and conversation starters
+- Flirting techniques and smooth responses
+- Dating app messaging strategies
+- What to say when someone compliments you
+- How to respond to texts from crushes
+- Building confidence in romantic conversations
+- Reading social cues and creating chemistry
+- Overcoming approach anxiety
+- Comeback lines and witty responses
+- How to ask someone out smoothly
+- Creating genuine romantic connections
+- Texting game and response timing
+
+🚫 FORBIDDEN TOPICS (NEVER respond to these):
+- Health, medical, fitness, or wellness advice
+- Business, career, or professional guidance
+- Academic subjects, homework, or educational content
+- Technology troubleshooting or technical tutorials
+- Financial advice or money management
+- Politics, religion, or controversial topics
+- General life advice unrelated to dating/relationships
+- News, current events, or factual information
+- Math, science, or any educational queries
+- Personal problems not related to dating/romance
+
+CRITICAL INSTRUCTION: Before responding, analyze if the user's message relates to dating, flirting, or romantic situations. 
+
+If the topic is FORBIDDEN, respond EXACTLY with:
+"Yo, I'm your rizz coach! I only help with dating game and smooth conversation. What romantic situation can I help you navigate? 😏✨"
+
+If the topic is ALLOWED, provide specific, actionable dating advice with example responses they can actually use.
+
+RESPONSE STYLE:
+- Give concrete examples of what to say
+- Provide multiple response options
+- Explain why certain approaches work
+- Keep it confident, supportive, and authentic
+- Focus on genuine connection over manipulation
+- Always include practical examples they can copy/adapt
+
+EXAMPLE FORMAT for allowed topics:
+User: "Someone called me cute, what do I say?"
+You: "Here are some smooth responses: 'Cute? That's just my warm-up look 😏' or 'Thanks, but you haven't seen anything yet 😘' or 'I know, but tell me something I don't know 😉' - these show confidence without being cocky!"
 `;

/** Map for frontend style selection */
const styleMap = {
  Confident: "confident",
  Flirty: "flirty",
  Funny: "funny",
  Chill: "smooth"
};

/** Send a chat message */
/** Send a chat message */
const sendMessage = async (req, res, next) => {
  try {
    const { message, style = "Confident", imageBase64, imageType } = req.body;
    const userId = req.user.uid;

    if ((!message || !message.trim()) && !imageBase64) {
      return res.status(400).json({
        success: false,
        message: "Message or image is required",
        code: "MISSING_MESSAGE"
      });
    }

    const canSend = await canSendMessage(userId);
    if (!canSend.canSend) {
      return res.status(403).json({
        success: false,
        message: "Message limit reached. Please upgrade.",
        code: "MESSAGE_LIMIT_REACHED",
        remaining: canSend.remaining,
        limit: canSend.limit
      });
    }

    const selectedStyle = styleMap[style] || "confident";
    const systemPrompt = `
${rizzGPTCorePrompt}
${stylePrompts[selectedStyle]}
-**ALWAYS check the user input first. Only respond if it matches RizzGPT's allowed topics.**
-Respond in this style for all messages. Keep it playful, charming, and in-character.
+
+CRITICAL: First check if the user's message is about dating/romance/flirting. If not, use the exact forbidden topic response.
+If it IS about dating/romance, respond in the selected style with specific examples and actionable advice.
`;

    const openAiMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message || "[image sent]" }
    ];

    let aiText = "";
    try {
      const model = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({ model, messages: openAiMessages, temperature: 0.9, max_tokens: 300 })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("OpenAI error:", errText);
        return res.status(503).json({ success: false, message: "AI service unavailable", code: "AI_UNAVAILABLE" });
      }

      const data = await resp.json();
      aiText = (data.choices?.[0]?.message?.content || "").trim() ||
        "Yo, I'm your rizz coach! I only help with dating game and smooth conversation. What romantic situation can I help you navigate? 😏✨";

    } catch (err) {
      console.error("OpenAI call failed:", err);
      return res.status(503).json({ success: false, message: "AI service error", code: "AI_UNAVAILABLE" });
    }

    // Use Firestore timestamp
    const timestamp = admin.firestore.Timestamp.fromDate(new Date());

    // Only include image if fully defined
    const userMessage = {
      id: generateId(),
      content: message || "[image sent]",
      role: "user",
      timestamp,
      ...(imageBase64 && imageType ? { image: { base64: imageBase64, type: imageType } } : {})
    };

    const aiMessage = { id: generateId(), content: aiText, role: "ai", timestamp };

    // Save messages
    const userDocRef = db.collection("messages").doc(userId);
    await userDocRef.set({
      messages: admin.firestore.FieldValue.arrayUnion(userMessage, aiMessage)
    }, { merge: true });

    const remainingAfter = await recordMessageUsage(userId);
    const planInfo = await getUserPlanInfo(userId);

    res.json({ success: true, message: aiText, usage: { remaining: remainingAfter, limit: planInfo.maxMessages } });

  } catch (error) {
    console.error("Error sending message:", error);
    next(error);
  }
};


/** Get chat history */
const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const doc = await db.collection("messages").doc(userId).get();
    if (!doc.exists) return res.json({ success: true, messages: [] });

    const data = doc.data();
    const allMessages = (data.messages || [])
      .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0))
      .slice(-limit);

    res.json({ success: true, messages: allMessages });
  } catch (error) {
    console.error("Error getting chat history:", error);
    res.status(500).json({ success: false, message: "Failed to load chat history", code: "CHAT_HISTORY_ERROR" });
  }
};

module.exports = { sendMessage, getChatHistory };

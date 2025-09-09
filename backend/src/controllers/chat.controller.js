const { db } = require('../config/firebase.cjs');
const { AppError } = require('../utils/errors');
const { canSendMessage, recordMessageUsage, getUserPlanInfo } = require('../utils/subscriptionUtils');
const admin = require('firebase-admin');

/**
 * Send a chat message
 */
const sendMessage = async (req, res, next) => {
  try {
    const { message, style = 'smooth', imageBase64, imageType } = req.body;
    const userId = req.user.uid;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
        code: 'MISSING_MESSAGE'
      });
    }

    // Check if user can send a message
    const canSend = await canSendMessage(userId);
    if (!canSend.canSend) {
      return res.status(403).json({
        success: false,
        message: 'You have reached your message limit. Please upgrade to continue.',
        code: 'MESSAGE_LIMIT_REACHED',
        upgradeRequired: true,
        remaining: canSend.remaining,
        limit: canSend.limit
      });
    }

    // Build OpenAI prompt with style guidance
    const stylePrompts = {
      smooth: 'Respond smoothly, charmingly, but respectfully.',
      funny: 'Respond with playful humor and wit, keep it light.',
      flirty: 'Respond flirty but tasteful, keep it respectful.',
      confident: 'Respond confidently and directly, without being rude.'
    };

    const systemPrompt = `You are RizzChat, an assistant that crafts short, high-quality reply lines for dating/chat. Keep responses concise (1-2 sentences). ${stylePrompts[style] || stylePrompts.smooth}`;

    // Prepare messages for OpenAI
    const openAiMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    let visionContent = null;
    if (imageBase64 && imageType) {
      // OpenAI Vision via image_url with data URL
      const dataUrl = `data:${imageType};base64,${imageBase64}`;
      visionContent = [
        { type: 'text', text: 'Analyze this screenshot for context and craft the best reply.' },
        { type: 'image_url', image_url: { url: dataUrl } }
      ];
    }

    // Call OpenAI (Chat Completions). Requires process.env.OPENAI_API_KEY
    const useVision = Boolean(visionContent);
    const model = useVision ? (process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini') : (process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini');

    let aiText = '';
    let aiOk = false;
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      };
      const body = {
        model,
        messages: useVision
          ? [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: visionContent }
            ]
          : openAiMessages,
        temperature: 0.7,
        max_tokens: 200
      };

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error('OpenAI error:', resp.status, errText);
        // Try to parse and detect quota errors
        try {
          const errJson = JSON.parse(errText);
          const code = errJson?.error?.code;
          if (code === 'insufficient_quota') {
            return res.status(503).json({ success: false, message: 'AI quota exceeded. Please try again later.', code: 'OPENAI_QUOTA' });
          }
        } catch(_) {}
        return res.status(503).json({ success: false, message: 'AI service is temporarily unavailable', code: 'AI_UNAVAILABLE' });
      }
      const data = await resp.json();
      aiText = data.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not generate a response.';
      aiOk = true;
    } catch (e) {
      console.error('OpenAI call failed:', e);
      return res.status(503).json({ success: false, message: 'AI service error. Please try again later.', code: 'AI_UNAVAILABLE' });
    }

    // Only record message usage after successful AI generation
    await recordMessageUsage(userId);

    // Save the message to the database
    const messageRef = await db.collection('messages').add({
      userId,
      content: message,
      response: aiText,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      usage: {
        inputTokens: message.length,
        outputTokens: aiText.length,
        totalTokens: message.length + aiText.length
      }
    });

    // Get updated message count
    const planInfo = await getUserPlanInfo(userId);

    res.json({
      success: true,
      message: aiText,
      messageId: messageRef.id,
      usage: {
        remaining: planInfo.remainingMessages - 1, // Subtract 1 for this message
        limit: planInfo.maxMessages
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    next(error);
  }
};

/**
 * Get chat history
 */
const getChatHistory = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { limit = 50 } = req.query;

    const messagesRef = db.collection('messages')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit));

    const snapshot = await messagesRef.get();
    const messages = [];

    snapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to ISO string
        timestamp: doc.data().timestamp?.toDate().toISOString()
      });
    });

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    next(error);
  }
};

module.exports = {
  sendMessage,
  getChatHistory
};

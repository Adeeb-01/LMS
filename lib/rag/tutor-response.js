import OpenAI from "openai";

let openai;

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "dummy-key",
    });
  }
  return openai;
}

/**
 * Generates a grounded RAG response using Gemini/GPT-4o.
 * 
 * @param {string} question - The student's question.
 * @param {Array} contexts - Array of retrieved chunks from ChromaDB.
 * @returns {Promise<{response: string, isGrounded: boolean, timestampLinks: Array}>}
 */
export async function generateGroundedResponse(question, contexts) {
  if (!question) {
    throw new Error("Question is required");
  }

  const hasContext = Array.isArray(contexts) && contexts.length > 0;
  
  // If no context found, we still want to provide a helpful response but mark it as not grounded
  const contextText = hasContext 
    ? contexts.map((c, i) => `[Context ${i+1}]: ${c.text || c.content || JSON.stringify(c)}`).join('\n\n')
    : "No specific lecture content found for this question.";

  try {
    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI Tutor for an online course. Your goal is to answer student questions based on the provided lecture content.
          
          GUIDELINES:
          1. Use the provided [Context] snippets to answer the question.
          2. If the answer is in the context, be specific and cite the context.
          3. If the answer is NOT in the context, inform the student that you couldn't find the specific information in the lecture, but provide a general helpful answer based on your general knowledge, clearly stating it's general knowledge.
          4. Keep responses concise, encouraging, and educational (max 300 words).
          5. If you use information from a specific context, mention it.
          
          Return your response EXACTLY in this JSON format:
          {
            "response": "Your detailed answer here...",
            "isGrounded": boolean (true if answer was found in context, false otherwise),
            "suggestedTimestamps": [
              { "seconds": number, "label": "Short description of what happens at this timestamp" }
            ]
          }`
        },
        {
          role: "user",
          content: `Context from Lecture:\n${contextText}\n\nStudent Question: "${question}"`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Map suggested timestamps from GPT to actual context timestamps if possible, 
    // or just use what GPT suggested if it makes sense.
    // For now, we'll trust GPT's suggestion but validate format.
    const timestampLinks = (result.suggestedTimestamps || [])
      .filter(ts => typeof ts.seconds === 'number' && ts.seconds >= 0)
      .map(ts => ({
        seconds: ts.seconds,
        label: ts.label || `Jump to ${ts.seconds}s`
      }));

    return {
      response: result.response,
      isGrounded: result.isGrounded && hasContext,
      timestampLinks
    };
  } catch (error) {
    console.error("[RAG_RESPONSE_ERROR]", error);
    throw error;
  }
}

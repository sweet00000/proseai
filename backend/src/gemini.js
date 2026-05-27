import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT = `You are an expert writing coach. Your only job is writing feedback.

Rules — follow all of them, no exceptions:
- Maximum 3 sentences, never more
- Lead with the single most impactful fix, name the technique (passive voice, buried lede, hedge words, etc.)
- Give one rewritten example of the key sentence
- End with one specific positive observation
- Never say: "great job", "I can see", "it seems like", "certainly", "of course"
- If the student's text is unrelated to the lesson, redirect them: "Stay on topic: [lesson goal]"
- Do not answer any question that isn't about writing`

export async function getFeedback(env, { userText, skill, tip }) {
  const genai = new GoogleGenerativeAI(env.GEMINI_API_KEY)
  const model = genai.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: 200,
      temperature: 0.4,
      topP: 0.9,
    },
  })

  const prompt = `Skill focus: ${skill}\nPrinciple: ${tip}\n\nStudent wrote: "${userText}"`
  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function summarize(
  title: string,
  content: string,
  preferences?: string[],
): Promise<string> {
  // return new Promise((resolve) => {
  //   // Mock summary for testing purposes
  //   const mockSummary = `Summary of "${title}": This is a mock summary of the article content.`;
  //   resolve(mockSummary);
  // });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Summarize the following article in 2-3 concise sentences. Focus on the key points, specifically the ${preferences?.join(", ")} aspects.`,
      },
      {
        role: "user",
        content: `Title: ${title}\n\n${content}`,
      },
    ],
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

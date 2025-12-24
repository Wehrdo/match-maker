
import { GoogleGenAI, Type } from "@google/genai";
import { CellValue } from "../types";

export const getHintFromGemini = async (grid: CellValue[], cols: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // We represent the grid as a string for context, but honestly, 
  // algorithmic hint finding is better for performance.
  // However, per instructions, we integrate Gemini expertise.
  const gridString = grid.map((v, i) => v === null ? '_' : v).join('');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find a valid match in this numerical grid puzzle. 
      The grid has ${cols} columns. Rules: Two numbers match if they sum to 10 or are identical, 
      with no other numbers between them horizontally, vertically, diagonally, or sequentially. 
      Grid (sequential): ${gridString}
      Return the indices of the match in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            idx1: { type: Type.INTEGER, description: 'Index of the first number' },
            idx2: { type: Type.INTEGER, description: 'Index of the second number' },
            reasoning: { type: Type.STRING, description: 'Why they match' }
          },
          required: ['idx1', 'idx2']
        }
      }
    });

    const json = JSON.parse(response.text.trim());
    return json as { idx1: number, idx2: number, reasoning: string };
  } catch (error) {
    console.error("Gemini hint error:", error);
    return null;
  }
};

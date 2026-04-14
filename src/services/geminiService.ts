import { GoogleGenAI, Type } from "@google/genai";

// Cách truy cập an toàn cho Vite
// LƯU Ý: Biến môi trường trên Vercel PHẢI bắt đầu bằng VITE_ để Vite có thể đọc được
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";

if (!apiKey) {
  console.warn("CẢNH BÁO: VITE_GEMINI_API_KEY chưa được thiết lập. Hệ thống kiểm duyệt AI sẽ không hoạt động.");
}

const ai = new GoogleGenAI({ apiKey: apiKey });

export interface ModerationResult {
  isValid: boolean;
  reason?: string;
}

export async function moderateComment(comment: string): Promise<ModerationResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Phân tích bình luận sau đây xem có vi phạm thuần phong mỹ tục, chứa từ ngữ thô tục, xúc phạm hoặc không phù hợp hay không: "${comment}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: {
              type: Type.BOOLEAN,
              description: "True nếu bình luận phù hợp, False nếu vi phạm thuần phong mỹ tục.",
            },
            reason: {
              type: Type.STRING,
              description: "Lý do nếu bình luận không phù hợp.",
            },
          },
          required: ["isValid"],
        },
      },
    });

    const result = JSON.parse(response.text || '{"isValid": true}');
    return result;
  } catch (error) {
    console.error("Moderation error:", error);
    // Default to valid if AI fails, or handle as needed
    return { isValid: true };
  }
}

import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";

if (!apiKey) {
  console.warn("CẢNH BÁO: GEMINI_API_KEY chưa được thiết lập. Hệ thống kiểm duyệt AI sẽ không hoạt động.");
}

const ai = new GoogleGenAI({ apiKey: apiKey });

export interface ModerationResult {
  isValid: boolean;
  reason?: string;
}

export async function moderateComment(userName: string, comment: string): Promise<ModerationResult> {
  try {
    const prompt = `Phân tích nội dung bình luận sau đây từ người dùng "${userName}":
Nội dung: "${comment}"

Kiểm tra dựa trên 4 quy tắc nghiêm ngặt:
1. Phải đạt chuẩn thuần phong mỹ tục Việt Nam (không chửi thề, lăng mạ).
2. Không phải là nội dung spam (ví dụ: lặp lại vô nghĩa, quảng cáo rác).
3. Tuyệt đối không có nội dung phản động, xuyên tạc chính trị.
4. Tuyệt đối không có nội dung về sex, khiêu dâm, bạo lực hoặc gây bạo loạn.

Nếu vi phạm bất kỳ quy tắc nào trong 4 quy tắc trên, hãy đặt isValid là false.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: {
              type: Type.BOOLEAN,
              description: "True nếu đạt tất cả tiêu chuẩn, False nếu vi phạm bất kỳ tiêu chuẩn nào.",
            },
            reason: {
              type: Type.STRING,
              description: "Lý do cụ thể nếu nội dung bị từ chối.",
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

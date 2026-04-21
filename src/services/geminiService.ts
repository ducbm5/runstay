import { GoogleGenAI, Type } from "@google/genai";

// Use a safe way to check for the API key that works in both build and dev environments
const getApiKey = () => {
  try {
    // Vite's 'define' will replace this literal string, but we use a fallback to avoid ReferenceErrors
    const key = process.env.GEMINI_API_KEY;
    return key || "";
  } catch (e) {
    return "";
  }
};

const apiKey = getApiKey();

if (!apiKey) {
  console.warn("CẢNH BÁO: GEMINI_API_KEY chưa được thiết lập. Hãy đảm bảo bạn đã cấu hình Environment Variable trên Vercel.");
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

    const text = response.text;
    console.log("Moderation AI response received.");
    
    try {
      const result = JSON.parse(text || '{"isValid": true}');
      return result;
    } catch (parseError) {
      console.error("Failed to parse moderation JSON:", text);
      return { isValid: true };
    }
  } catch (error) {
    console.error("Moderation error details:", error);
    // Trả về true để không chặn người dùng nếu AI gặp lỗi kỹ thuật (ví dụ: hết quota, sai key)
    return { isValid: true };
  }
}

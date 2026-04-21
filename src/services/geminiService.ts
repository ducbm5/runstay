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
    const prompt = `Bạn là một chuyên gia kiểm duyệt nội dung của báo VnExpress. Hãy phân tích nội dung sau từ người dùng "${userName}":
Nội dung: "${comment}"

Hãy kiểm tra cực kỳ nghiêm ngặt dựa trên 4 quy tắc:
1. Thuần phong mỹ tục: Tuyệt đối không chấp nhận các từ chửi thề, lăng mạ, xúc phạm nhân phẩm, các từ lóng thô tục (kể cả viết tắt hoặc viết lách luật như "đm", "vcl", "vkl",...).
2. Không Spam: Không chấp nhận nội dung rác, lặp lại vô nghĩa, quảng cáo dịch vụ.
3. Chính trị: Tuyệt đối không chấp nhận nội dung phản động, xuyên tạc lịch sử, chính trị Việt Nam.
4. Nội dung cấm: Không nội dung khiêu dâm, bạo lực, kích động bạo loạn.

Yêu cầu trả về JSON: {"isValid": boolean, "reason": string}.
Nếu vi phạm bất kỳ điều nào, isValid phải là false và ghi rõ lý do bằng tiếng Việt.`;

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
              description: "True nếu đạt chuẩn, False nếu vi phạm.",
            },
            reason: {
              type: Type.STRING,
              description: "Lý do bằng tiếng Việt nếu bị từ chối.",
            },
          },
          required: ["isValid", "reason"],
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

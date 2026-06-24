import { GoogleGenAI, Modality, Type } from "@google/genai";

export interface Character {
  name: string;
  profile: string; // Detailed single paragraph: role, age, personality, appearance, outfit, features, relationships
  prompt: string;  // English prompt for image generation
  voice?: string;
}

export interface Shot {
  name: string;
  angle: string;
  description: string;
  camera: string;
  action: string;
  emotion: string;
  dialogue_VN: string;
  dialogue_EN: string;
  prompt: string;
}

export interface Scene {
  sceneNumber: number;
  title: string;
  summary: string;
  environment: string;
  charactersInScene: { name: string; role: string }[];
  mainAction: string;
  shots: Shot[]; // Each scene MUST have exactly 4 shots
}

export interface StoryPlan {
  title: string;
  summary: string;
  characters: Character[];
  sceneOutline: { title: string; description: string }[];
}

export interface StoryboardResponse {
  summary: string;
  characters: Character[];
  scenes: Scene[];
}

const COMMON_SYSTEM_PROMPT = `
You are a World-Class Storyboard Artist, Screenwriter, and Cinematographer. 
You specialize in creating high-quality, detailed production scripts and storyboard prompts for Veo 3 / Gen-AI video models.
Your output must be professional, cinematic, and technically precise.
`;

export async function generateStoryPlan(
  prompt: string, 
  apiKey: string,
  visualStyle: string,
  globalContext: string
): Promise<StoryPlan> {
  const ai = new GoogleGenAI({ apiKey });
  const finalPrompt = `
${COMMON_SYSTEM_PROMPT}

Nhiệm vụ: Phân tích ý tưởng người dùng và xây dựng kế hoạch dự án storyboard (Story Plan).
Ý tưởng người dùng: "${prompt}"
Phong cách hình ảnh: ${visualStyle}
Ngữ cảnh chung: ${globalContext}

YÊU CẦU CỤ THỂ:
0. STORY TITLE: Trích xuất tiêu đề câu chuyện ngắn gọn, súc tích từ ý tưởng người dùng (ví dụ: "Sự tích Trầu Cau").
1. SCRIPT SUMMARY: Tạo phần tóm tắt kịch bản rõ ràng, logic, dễ hiểu.
   - Tóm tắt đầy đủ nội dung chính, giữ đúng tinh thần câu chuyện, thông điệp, bối cảnh và nhân vật.
   - Nếu là truyện: thể hiện rõ mở đầu, phát triển, cao trào, kết thúc.
   - Nếu là video giới thiệu/quảng cáo/giáo dục/MV: nêu rõ mục tiêu và thông điệp chính.
   - Văn phong mạch lạc, dễ đọc, phù hợp làm nền tảng cho các bước tiếp theo.
2. CAST REGISTRY (HỒ SƠ NHÂN VẬT):
   - Mỗi nhân vật phải có: tên, vai trò, tuổi ước tính, tính cách, ngoại hình, trang phục, đặc điểm diện mạo, và mối quan hệ.
   - TRÌNH BÀY: Toàn bộ thông tin trên PHẢI viết thành một chuỗi duy nhất theo định dạng: "Nhân vật [số]: [Tên nhân vật] [Đoạn văn mô tả đầy đủ các yếu tố trên, viết liền mạch, không chia mục, không xuống dòng]."
   - PROMPT NHÂN VẬT: Tạo 1 prompt tiếng Anh (prompt) để sinh hình ảnh nhân vật nhất quán.
     Mẫu prompt băt buộc (copy trực tiếp): Full body character design of [character name], [estimated age], [gender], [appearance], [facial features], [hairstyle], [outfit], [distinguishing details], standing straight, front view, neutral pose, white background, clean character sheet, [selected style], highly detailed, clear face, no background clutter, no text, no caption, no subtitle, no logo, no watermark, no typography.
     Quy tắc trang phục: Nếu là vua, hoàng hậu, thần tiên, quan lớn thì trang phục cầu kỳ. Nếu là dân thường, trẻ em, nông dân, người lao động, học sinh... thì trang phục đơn giản, tự nhiên, ít họa tiết.

3. SCENE OUTLINE: Chia câu chuyện thành các cảnh logic.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [finalPrompt],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          characters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                profile: { type: Type.STRING },
                prompt: { type: Type.STRING },
                voice: { type: Type.STRING }
              },
              required: ["name", "profile", "prompt"]
            }
          },
          sceneOutline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "description"]
            }
          }
        },
        required: ["summary", "characters", "sceneOutline"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateIndividualScene(
  sceneIndex: number,
  sceneOutline: { title: string; description: string },
  overallPlan: StoryPlan,
  apiKey: string,
  visualStyle: string,
  globalContext: string
): Promise<Scene> {
  const ai = new GoogleGenAI({ apiKey });
  const finalPrompt = `
${COMMON_SYSTEM_PROMPT}

Tạo chi tiết CẢNH ${sceneIndex + 1}: ${sceneOutline.title}.
Dựa trên Summary: ${overallPlan.summary}
Dựa trên Hồ sơ nhân vật: ${JSON.stringify(overallPlan.characters)}
Phong cách Visual: ${visualStyle}
Ngữ cảnh: ${globalContext}

DIỄN BIẾN CẢNH: ${sceneOutline.description}

YÊU CẦU:
1. Mỗi cảnh có đúng 4 SHOT (Wide, Medium, Close-up, Detail).
2. Mỗi shot phải có lời thoại tiếng Việt (dialogue_VN) và tiếng Anh (dialogue_EN) nếu có. Nếu không hãy ghi "Không có thoại" / "No dialogue".
3. PROMPT CHO VEO 3 (Mỗi shot):
   - Phải là một đoạn mô tả tiếng Anh chi tiết bao gồm: Style, Character features, Angle, Environment, Action, Emotion, Lighting.
   - BẮT BUỘC thêm lưu ý chặn chữ ở cuối mỗi prompt: "No text, No subtitle, No caption, No logo, No watermark, No typography in the image".
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [finalPrompt],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sceneNumber: { type: Type.INTEGER },
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          environment: { type: Type.STRING },
          charactersInScene: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING }
              },
              required: ["name", "role"]
            }
          },
          mainAction: { type: Type.STRING },
          shots: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                angle: { type: Type.STRING },
                description: { type: Type.STRING },
                camera: { type: Type.STRING },
                action: { type: Type.STRING },
                emotion: { type: Type.STRING },
                dialogue_VN: { type: Type.STRING },
                dialogue_EN: { type: Type.STRING },
                prompt: { type: Type.STRING }
              },
              required: ["name", "angle", "description", "camera", "action", "emotion", "dialogue_VN", "dialogue_EN", "prompt"]
            }
          }
        },
        required: ["sceneNumber", "title", "summary", "environment", "charactersInScene", "mainAction", "shots"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateStoryboard(
  prompt: string, 
  customApiKey?: string,
  visualStyle: string = "Cinematic 3D animation",
  globalContext: string = ""
): Promise<StoryboardResponse> {
  // This is the legacy function, we will keep it but return a mock implementation or map it
  const apiKey = customApiKey || "";
  const plan = await generateStoryPlan(prompt, apiKey, visualStyle, globalContext);
  const firstScene = await generateIndividualScene(0, plan.sceneOutline[0], plan, apiKey, visualStyle, globalContext);
  return {
    summary: plan.summary,
    characters: plan.characters,
    scenes: [firstScene as any] // Typing mismatch but we'll fix App.tsx next
  };
}

export async function generateTTS(
  text: string,
  voiceName: string,
  accent: string = "Tự nhiên",
  apiKey?: string
): Promise<{ data: string; mimeType: string }> {
  const finalApiKey = apiKey || process.env.GEMINI_API_KEY || "";
  const ai = new GoogleGenAI({ apiKey: finalApiKey });

  // Enhance the instruction with accent preference
  const prompt = accent !== "Tự nhiên" 
    ? `Say in a ${accent} accent: ${text}` 
    : text;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const cand = response.candidates?.[0];
  if (!cand) {
    throw new Error("No response generated by the model. Check your prompt or model availability.");
  }

  const inlineData = cand.content?.parts?.[0]?.inlineData;
  if (!inlineData?.data) {
    console.error("TTS Response Parts:", cand.content?.parts);
    throw new Error("Failed to generate audio. The model did not return audio data.");
  }
  return {
    data: inlineData.data,
    mimeType: inlineData.mimeType || "audio/wav"
  };
}

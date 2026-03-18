/**
 * Gemini AI Service
 * 
 * Responsibilities:
 * - Call Gemini 2.5 Flash API
 * - Parse structured JSON responses
 * - Handle failures gracefully with fallbacks
 * - Implement retry logic for transient failures
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIAnalysisRequest,
  AIAnalysisResponse,
  StudentUIData,
  TeacherDBData,
  ExternalServiceError,
} from './types';

export class GeminiService {
  private client: GoogleGenerativeAI;
  private model: string;
  private maxRetries: number;
  private timeoutMs: number;

  constructor(apiKey: string, model = 'models/gemini-2.5-flash', maxRetries = 2, timeoutMs = 10000) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
    this.maxRetries = maxRetries;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Analyze code and generate mentoring response
   * Returns structured data for both student UI and teacher database
   */
  async analyzeCode(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const prompt = this.buildPrompt(request.code, request.error, request.problemContext);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.callGeminiWithTimeout(prompt);
        return this.parseResponse(response);
      } catch (error) {
        if (attempt === this.maxRetries) {
          console.error(`❌ Gemini API failed after ${this.maxRetries} attempts:`, error);
          return this.getFallbackResponse(request.error);
        }

        // Exponential backoff before retry
        const waitTime = Math.pow(2, attempt - 1) * 1000;
        console.warn(`⚠️ Gemini attempt ${attempt} failed, retrying in ${waitTime}ms...`);
        await this.sleep(waitTime);
      }
    }

    return this.getFallbackResponse(request.error);
  }

  /**
   * Call Gemini API with timeout protection
   */
  private async callGeminiWithTimeout(prompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: this.model });

    return Promise.race([
      (async () => {
        const result = await model.generateContent(prompt);
        return result.response.text();
      })(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), this.timeoutMs)
      ),
    ]);
  }

  /**
   * Build the prompt for code analysis
   * This is where we control mentor behavior and output format
   */
  private buildPrompt(
    code: string,
    error: string,
    problemContext?: { title: string; description: string; expectedOutput: string }
  ): string {
    const contextSection = problemContext
      ? `
โจทย์ที่นักเรียนต้องแก้:
- ชื่อ: ${problemContext.title}
- รายละเอียด: ${problemContext.description}
- ผลลัพธ์ที่คาดหวัง: ${problemContext.expectedOutput}
`
      : '';

    return `
คุณคือ Mentor สอวน. คอมพิวเตอร์ที่ได้รับรางวัลเหรียญทองระดับโลกและมีประสบการณ์สอนมากกว่า 10 ปี (DebugBuddy) ที่เชี่ยวชาญการตรวจโค้ดระดับลึก
${contextSection}
วิเคราะห์ Code C++:
\`\`\`cpp
${code}
\`\`\`

Error จากคอมไพเลอร์ หรือ Logic Error:
${error}

หน้าที่ของคุณ:
1. วิเคราะห์ Syntax Error ที่คอมไพเลอร์ฟ้อง (เช่น ลืมเซมิโคลอน)
2. วิเคราะห์ Logic Error หรือ Runtime Error ที่อาจเกิดขึ้น
3. เปรียบเทียบกับโจทย์: โค้ดนี้แก้โจทย์ได้หรือไม่? ผลลัพธ์ตรงกับที่โจทย์ขอหรือไม่?
4. ให้คำแนะนำเฉพาะเจาะจง โดยพิจารณาจากโจทย์

กฎเหล็กกาตอบ (Strict Rules):
1. Hint (คำใบ้): ให้ตอบแบบตั้งคำถาม และระบุ "เลขบรรทัด" ที่ต้องสงสัย แต่ "ห้าม" บอกชื่อสัญลักษณ์ที่หายไปตรงๆ
   ตัวอย่างคำใบ้ที่ดี: "โจทย์ขอให้อ่านข้อมูลเป็นตัวอักษร แต่โค้ดของคุณอ่านเป็นตัวเลขแทน (บรรทัดที่ 5) ลองสังเกตว่าควรเปลี่ยนไหม?"
   
2. Concept: ให้ระบุเฉพาะประเด็นหลัก เช่น "Data Type Mismatch", "String Handling", "Input/Output Type"
   
3. Explanation: ต้องตอบเป็นข้อๆ (1., 2.) เท่านั้น ห้ามเกริ่นนำ ห้ามลงท้าย ห้ามเฉลยโค้ด
   - ความยาว: ไม่เกิน 2-3 บรรทัดต่อข้อ
   
4. ภาษา: ใช้ภาษาไทยที่เป็นธรรมชาติ เหมือนรุ่นพี่เก่งๆ นั่งคุยกับรุ่นน้อง

5. ห้ามตอบ Markdown (ห้ามมี \`\`\`json)

ตอบเป็น JSON เท่านั้น (ห้าม Markdown wrapper):
{
  "student_ui": {
    "hint": "คำใบ้เฉพาะเจาะจงที่เกี่ยวกับโจทย์ (ห้ามเฉลยโค้ด)",
    "concept": "หัวข้อที่พลาด เช่น Data Type Mismatch, String Handling",
    "explanation": "อธิบายว่าโค้ดของคุณแตกต่างจากที่โจทย์ขออย่างไร หลังจากจบข้อ เพิ่ม \\n\\n ด้วย""
  },
  "teacher_db": {
    "error_summary": "สรุปสั้นๆ สำหรับครู",
    "error_type": "Syntax Error | Logic Error | Runtime Error",
    "severity": "low | medium | high"
  }
}
`;
  }

  /**
   * Parse and validate Gemini's JSON response
   */
  private parseResponse(rawResponse: string): AIAnalysisResponse {
    try {
      // Strip markdown code fences if present
      let jsonString = rawResponse.replace(/```json|```/g, '').trim();

      // Remove any leading/trailing whitespace
      jsonString = jsonString.trim();

      // Parse JSON
      const parsed = JSON.parse(jsonString);

      // Validate structure
      if (!parsed.student_ui || !parsed.teacher_db) {
        throw new Error('Invalid response structure: missing student_ui or teacher_db');
      }

      return {
        studentUI: {
          hint: parsed.student_ui.hint || 'ลองตรวจสอบโค้ดอีกครั้ง',
          concept: parsed.student_ui.concept || 'General',
          explanation: parsed.student_ui.explanation || 'พบข้อผิดพลาด',
          resourceLink: parsed.student_ui.resourceLink,
        },
        teacherDB: {
          errorSummary: parsed.teacher_db.error_summary || 'Error detected',
          errorType: this.parseErrorType(parsed.teacher_db.error_type),
          severity: this.parseSeverity(parsed.teacher_db.severity),
        },
      };
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response:', rawResponse);
      console.error('Parse error:', parseError);
      throw new ExternalServiceError('Gemini', `Failed to parse response: ${parseError}`);
    }
  }

  /**
   * Fallback response when Gemini fails
   * Provides basic but helpful guidance
   */
  private getFallbackResponse(error: string): AIAnalysisResponse {
    const isCompileError = error.toLowerCase().includes('error') && !error.includes('output');

    return {
      studentUI: {
        hint: isCompileError
          ? 'ลองตรวจสอบไวยากรณ์ C++ พื้นฐาน (semicolon, brackets, keywords)'
          : 'ตรวจสอบความถูกต้องของตรรกะโปรแกรม โดยเฉพาะการใช้ตัวแปรและการคำนวณ',
        concept: isCompileError ? 'Syntax Error' : 'Logic Error',
        explanation: isCompileError
          ? 'โค้ดของคุณมีข้อผิดพลาดทางไวยากรณ์ คอมไพเลอร์จึงไม่สามารถเข้าใจคำสั่งของคุณได้'
          : 'โปรแกรมคอมไพล์สำเร็จ แต่ผลลัพธ์ไม่ตรงกับที่คาดหวัง ลองติดตามค่าตัวแปรอีกครั้ง',
      },
      teacherDB: {
        errorSummary: isCompileError
          ? 'Student has compilation error - likely syntax issue'
          : 'Student has logic error - code runs but produces wrong output',
        errorType: isCompileError ? 'syntax' : 'logic',
        severity: 'medium',
      },
    };
  }

  /**
   * Parse error type string to enum
   */
  private parseErrorType(errorType: string): 'syntax' | 'runtime' | 'logic' {
    const normalized = (errorType || '').toLowerCase();
    if (normalized.includes('syntax')) return 'syntax';
    if (normalized.includes('runtime')) return 'runtime';
    return 'logic';
  }

  /**
   * Parse severity string to enum
   */
  private parseSeverity(severity: string): 'low' | 'medium' | 'high' {
    const normalized = (severity || '').toLowerCase();
    if (normalized.includes('low')) return 'low';
    if (normalized.includes('high')) return 'high';
    return 'medium';
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

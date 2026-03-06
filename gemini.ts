// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { CONFIG } from "./config"; // <--- นำเข้าจากที่เราสร้างไว้

// // ใช้ Key จาก CONFIG แทนการเรียก process.env โดยตรง
// const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);

// export const getAIAnalysis = async (code: string, error: string) => {
//   // ตรวจสอบก่อนว่ามี Key ไหม ป้องกัน App ล่ม
//   if (!CONFIG.GEMINI_API_KEY) {
//     throw new Error("Missing Gemini API Key in configuration");
//   }

// const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

//   const prompt = `
//     คุณคือ Mentor สอวน. คอมพิวเตอร์ (DebugBuddy)
//     วิเคราะห์ Code C++: ${code}
//     และ Error: ${error}
    
//     ตอบเป็น JSON เท่านั้น:
//     {
//       "hint": "คำใบ้ตรรกะภาษาไทย ห้ามเฉลยโค้ดตรงๆ",
//       "concept": "หัวข้อหลัก เช่น Array, Pointer, Loop, Logic",
//       "explanation": "อธิบายสั้นๆ ว่าพลาดตรงไหน"
//     }
//   `;
// //   const result = await model.generateContent(prompt);
// // //   const responseText = result.response.text();
  
// // //   // Clean text ในกรณีที่ AI แถม ```json ... ``` มาให้
// // //   const cleanJson = responseText.replace(/```json|```/g, "").trim();
// // //   return JSON.parse(cleanJson);
// // let responseText = result.response.text();
  
// //   // ป้องกัน AI แถม Markdown มาให้
// //   responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
  
// //   try {
// //     return JSON.parse(responseText);
// //   } catch (e) {
// //     console.error("AI Response was not JSON:", responseText); // ดูว่า AI ตอบอะไรมากันแน่
// //     return {
// //       hint: "ลองตรวจสอบไวยากรณ์พื้นฐานของ C++ ดูนะ",
// //       concept: "General",
// //       explanation: responseText // เอาข้อความดิบมาโชว์ก่อนเพื่อ Debug
// //     };
// //   }
// try {
//     console.log("กำลังเรียก Gemini API...");
//     const result = await model.generateContent(prompt);
//     const responseText = result.response.text();
    
//     console.log("Gemini ตอบมาว่า:", responseText); // บรรทัดนี้สำคัญมาก เพื่อดูว่า AI ตอบอะไร

//     // วิธีล้าง Markdown ที่สะอาดที่สุด
//     const jsonString = responseText
//       .replace(/```json/g, "")
//       .replace(/```/g, "")
//       .trim();

//     return JSON.parse(jsonString);
//   } catch (error) {
//     console.error("💥 Gemini Error Detail:", error); // พิมพ์ Error จริงๆ ออกมาดู
//     return {
//       hint: "ตอนนี้พี่ Mentor ไม่ว่าง แต่ดูเหมือนจะมีปัญหาเรื่องไวยากรณ์นะ",
//       concept: "General",
//       explanation: "AI ไม่สามารถสร้างคำตอบได้ในขณะนี้"
//     };
//   }
// };
// // };
import { CONFIG } from "./config";

export const getAIAnalysis = async (code: string, error: string) => {
  if (!CONFIG.GEMINI_API_KEY) {
    throw new Error("Missing Gemini API Key");
  }

  // ใช้ REST API ตรงๆ ไม่ผ่าน Library
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

const prompt = `
    คุณคือ Mentor สอวน. คอมพิวเตอร์ (DebugBuddy) ที่เชี่ยวชาญการตรวจโค้ดระดับลึก
    วิเคราะห์ Code C++: ${code} 
    และ Error จากคอมไพเลอร์: ${error}
    
    หน้าที่ของคุณ:
    1. วิเคราะห์ Syntax Error ที่คอมไพเลอร์ฟ้อง (เช่น ลืมเซมิโคลอน)
    2. วิเคราะห์ Logic Error หรือ Runtime Error ที่อาจเกิดขึ้นในอนาคต (เช่น Array Out-of-bounds) แม้คอมไพเลอร์จะยังไม่ฟ้องก็ตาม
    
    กฎการตอบ:
    - hint: ตั้งคำถามเรียกสติให้เด็กฉุกคิดถึง "ทุกจุด" ที่ผิด (ทั้งไวยากรณ์และตรรกะ)
    - explanation: อธิบายแยกเป็นข้อๆ ให้เห็นภาพว่าถ้าแก้จุดแรกแล้ว จะไปติดจุดไหนต่อ
    - ตอบเป็น JSON เท่านั้น ห้ามมี Markdown

    Format JSON:
    {
      "hint": "คำถามเรียกสติภาษาไทย (รวมทุกประเด็น)",
      "concept": "หัวข้อหลัก (เช่น Syntax & Array)",
      "explanation": "อธิบายเหตุผลของทุกจุดที่ผิดให้ชัดเจนและสุภาพ"
    }
  `;
  try {
    console.log("กำลังเรียก Gemini ผ่าน REST API...");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "API Error");
    }
//ล้าง json
   const responseText = data.candidates[0].content.parts[0].text;
    
    // แสดงเฉพาะผลลัพธ์ที่ทำความสะอาดแล้วใน console เพื่อไม่ให้รก
    const jsonMatch = responseText.match(/\{[\s\S]*\}/); // ดึงเฉพาะตั้งแต่ { ถึง }
    const jsonString = jsonMatch ? jsonMatch[0] : responseText;

    try {
        const parsed = JSON.parse(jsonString);
        return parsed;
    } catch (e) {
        // ถ้า parse ไม่ได้ ให้พยายามล้างอีกรอบ
        const fallbackClean = jsonString.replace(/```json|```/g, "").trim();
        return JSON.parse(fallbackClean);
    }

  } catch (err: any) {
    console.error("💥 REST API Error:", err.message);
    return {
      hint: "ตอนนี้พี่ Mentor ไม่ว่าง แต่ดูเหมือนจะมีปัญหาเรื่องไวยากรณ์นะ",
      concept: "General",
      explanation: "ระบบขัดข้องชั่วคราว"
    };
  }
};
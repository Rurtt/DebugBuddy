
import { runCPlusPlus } from "./wandbox";
import { getAIAnalysis } from "./gemini";
import resources from "../data/resources.json"; // <--- โหลดคลังบทเรียน

export const processSubmission = async (userCode: string) => {
      // 1. รันโค้ด
  const result = await runCPlusPlus(userCode);
  const errorLog = result.program_error || result.compiler_error;

  // 2. ถ้าผ่าน
  if (!errorLog) {
    return { status: "success", output: result.program_output };
  }
  // 3. ถ้าไม่ผ่าน ถาม AI
  try {
    const aiData = await getAIAnalysis(userCode, errorLog);
    
    // ดึงลิงก์บทเรียนตาม Concept ที่ AI ส่งมา (ถ้าไม่มีให้ใช้ Default)
    const resourceLink = resources[aiData.concept as keyof typeof resources] || resources.Default;

    return {
      status: "error",
      output: errorLog,
      aiMentor: {
        ...aiData,
        resourceLink: resourceLink // <--- เพิ่มลิงก์ส่งไปให้ Frontend
      }
    };
  } catch (e) {
    return { status: "error", output: errorLog, aiMentor: null };
  }
};
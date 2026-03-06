import 'dotenv/config';

// ฟังก์ชันช่วยดึงค่า Config แบบปลอดภัย
export const CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  WANDBOX_URL: "https://wandbox.org/api/compile.json"
};

if (!CONFIG.GEMINI_API_KEY) {
  console.warn("⚠️ Warning: API Key ไม่โหลด! เช็คไฟล์ .env หรือยัง?");
}
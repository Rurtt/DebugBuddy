import { CONFIG } from "./config";

async function checkAvailableModels() {
    console.log("🔍 กำลังตรวจสอบโมเดลที่ Key นี้เข้าถึงได้...");
    
    // URL สำหรับเรียกดู List ของโมเดลทั้งหมด
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${CONFIG.GEMINI_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error("❌ API Error:", data.error?.message);
            return;
        }

        console.log("✅ รายชื่อโมเดลที่คุณใช้ได้:");
        data.models.forEach((m: any) => {
            // กรองให้ดูเฉพาะโมเดลที่ใช้ Generate Content ได้
            if (m.supportedGenerationMethods.includes("generateContent")) {
                console.log(`- ชื่อโมเดล: ${m.name.replace("models/", "")}`);
                console.log(`  (ชื่อเต็ม: ${m.name})`);
                console.log(`  ความสามารถ: ${m.description}\n`);
            }
        });
    } catch (err: any) {
        console.error("💥 Network Error:", err.message);
    }
}

checkAvailableModels();
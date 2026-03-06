import { processSubmission } from "./mentor";

const testCode = `
#include <iostream>
int main() {
    int arr[2] = {1, 2}
    std::cout << arr[5]; // ตั้งใจให้ผิดทั้ง Syntax และ Logic
    return 0;
}
`;

async function startTest() {
    // console.log("🚀 DebugBuddy กำลังเริ่มทดสอบ...");
    // const result = await processSubmission(testCode);
    // console.log("---------------------------");
    // console.log("สถานะ:", result.status);
    // console.log("Output/Error จาก Wandbox:", result.output);

    // if (result.aiMentor) {
    //     console.log("🤖 คำใบ้จาก AI:", result.aiMentor.hint);
    //     console.log("💡 Concept ที่พลาด:", result.aiMentor.concept);
    // }
    // console.log("---------------------------");
    console.log("🚀 DebugBuddy กำลังเริ่มทดสอบ...");
    try {
        // ต้องมี await ตรงนี้สำคัญมาก!
        const result = await processSubmission(testCode); 
        
        console.log("---------------------------");
        console.log("สถานะ:", result.status);
        console.log("Output จาก Wandbox:", result.output);
        
        if (result.aiMentor) {
            console.log("🤖 DebugBuddy ตอบกลับมาแล้ว!");
            console.log("คำใบ้:", result.aiMentor.hint);
            console.log("Concept:", result.aiMentor.concept);
        } else {
            console.log("❌ AI Mentor ไม่ส่งข้อมูลกลับมา (aiMentor is null)");
        }
        console.log("---------------------------");
    } catch (err) {
        console.error("💥 เกิดข้อผิดพลาดร้ายแรงระหว่างทดสอบ:", err);
    }
}

startTest();
# DebugBuddy: AI-Powered Coding Mentor for Education
**"เปลี่ยนทุก Error ให้เป็นบทเรียน"**

DebugBuddy คือแพลตฟอร์มช่วยฝึกเขียนโปรแกรมในภาษาต่าง ๆ (C++, etc.) สำหรับนักเรียนที่ประสบปัญหาอ่าน Error Log ไม่เข้าใจ ระบบจะวิเคราะห์ข้อผิดพลาดทั้ง Syntax และ Logic พร้อมให้คำใบ้และแนะนำบทเรียนที่เกี่ยวข้องโดยไม่เฉลยคำตอบโดยตรง และสำหรับคุณครูหรืออาจารย์ที่ต้องการสื่อการเรียนรู้เพื่อสอนนักเรียนในการฝึกเขียนโปรแกรมได้อย่างมีประสิทธิภาพ

---

## Key Features
- **Remote Code Execution:** รันโค้ด C++ ผ่าน Wandbox API ที่เสถียรและแม่นยำ
- **AI Logic Analysis:** ใช้ Gemini 2.5 Flash วิเคราะห์หาสาเหตุของ Error และให้คำใบ้เชิงสร้างสรรค์
- **Educational Mapping:** เชื่อมโยงข้อผิดพลาดเข้ากับคลังบทเรียน (Resources) ที่คัดสรรมาเพื่อเด็กค่าย 1 โดยเฉพาะ
- **Modular Architecture:** แยกส่วน Config, Service และ Data อย่างชัดเจน รองรับการขยายระบบ (เช่น การย้ายไปใช้ Judge0 หรือ Docker ในอนาคต)

## System Architecture
-# Empty

## Tech Stack
- **Frontend:** Next.js (React) + TypeScript
- **Backend Logic:** Node.js + TypeScript
- **AI Engine:** Google Generative AI (Gemini 2.5 Flash)
- **Compiler API:** Wandbox API (Standard GCC)
- **Environment Management:** Dotenv + Custom Config Service

## Getting Started

1. **Clone & Install:**
   ```bash

   npm install

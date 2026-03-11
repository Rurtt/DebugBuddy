/**
 * DebugBuddy Complete Workflow Examples
 * 
 * This file shows:
 * 1. How to use the new production backend
 * 2. How to migrate from your current code
 * 3. Real-world request/response cycles
 */

// ============================================================================
// EXAMPLE 1: STUDENT SUBMITS CODE
// ============================================================================

// Frontend sends this:
const submitRequest = {
  studentId: 'alice_001',
  problemId: 'array_sum',
  classroomId: 'class_4_1',
  code: `
#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << a - b;  // Oops! Should be a + b
    return 0;
}
  `,
};

// Backend processes in steps:

// Step 1: GraderService runs test cases
const testCases = [
  { id: '1', input: '2 3', expectedOutput: '5' },
  { id: '2', input: '10 20', expectedOutput: '30' },
  { id: '3', input: '5 5', expectedOutput: '10' },
];

// Test Case 1: Input "2 3"
// - Code runs: 2 - 3 = -1
// - Expected: "5"
// - Result: FAIL (wrong output = Logic Error)

// Step 2: GeminiService analyzes the failure
// AI sees: "Input 2 3 expected 5 but got -1"
// AI thinks: "Ah! They're using minus instead of plus"
// AI responds in Thai with hints (NOT the solution)

// Step 3: MentorService builds response
const studentResponse = {
  success: true,
  submissionId: 'sub_1705330200000_alice_001',
  status: 'logic_error',
  metrics: {
    score: 0,        // Failed all test cases
    runtime: '0.0856',
    fileSize: 156,
    passedCases: 0,
    totalCases: 3,
  },
  studentUI: {
    hint: 'ลองตรวจสอบเครื่องหมายดำเนินการ (+, -, *, /) ที่ใช้ในบรรทัดที่ 7 นะครับ เครื่องหมายนี้สำหรับบวกหรือลบ?',
    concept: 'Arithmetic Operations',
    explanation:
      '1. คุณกำลังสับสนว่าใช้ตัวดำเนินการไหน\n' +
      '2. ตรวจสอบว่าโจทย์ขอเราให้ทำการบวก (+) แต่คุณใช้ลบ (-) แทน',
    resourceLink: 'https://learn.posn.th/c++/operators',
  },
  analyticsData: {
    // This gets saved to database for the teacher to see later
    submissionId: 'sub_1705330200000_alice_001',
    studentId: 'alice_001',
    problemId: 'array_sum',
    classroomId: 'class_4_1',
    timestamp: new Date('2024-01-15T10:30:00Z'),
    status: 'logic_error',
    score: 0,
    failedTestCaseIndex: 0,
    failedInput: '2 3',
    failedExpectedOutput: '5',
    failedActualOutput: '-1',
    aiAnalysis: {
      concept: 'Arithmetic Operations',
      hint: 'ลองตรวจสอบเครื่องหมายดำเนินการ...',
      explanation: '1. คุณกำลังสับสน...\n2. ตรวจสอบว่าโจทย์...',
      severity: 'high', // Wrong operator is bad
      generatedAt: new Date('2024-01-15T10:30:00Z'),
    },
  },
};

// ============================================================================
// EXAMPLE 2: TEACHER CHECKS DASHBOARD
// ============================================================================

// Teacher navigates to: GET /api/classroom/class_4_1/dashboard
// Backend queries database and returns:

const dashboardResponse = {
  classroomId: 'class_4_1',
  studentStats: [
    {
      studentId: 'alice_001',
      problemId: 'array_sum',
      totalSubmissions: 3, // Alice tried 3 times
      bestScore: 66,
      successRate: 33, // Only 1 success out of 3
      strugglingConcepts: [
        {
          concept: 'Arithmetic Operations',
          count: 2, // Struggled with this twice
        },
        {
          concept: 'Loop Logic',
          count: 1,
        },
      ],
    },
    {
      studentId: 'bob_002',
      problemId: 'array_sum',
      totalSubmissions: 1,
      bestScore: 100,
      successRate: 100,
      strugglingConcepts: [],
    },
  ],
  problemStats: [
    {
      problemId: 'array_sum',
      successRate: 50, // 1 out of 2 students succeeded
      commonErrors: [
        {
          concept: 'Arithmetic Operations',
          count: 2, // This is the most common mistake
        },
      ],
    },
  ],
  recentErrors: [
    {
      submissionId: 'sub_1705330200000_alice_001',
      studentId: 'alice_001',
      problemId: 'array_sum',
      status: 'logic_error',
      score: 0,
      concept: 'Arithmetic Operations',
      submittedAt: new Date('2024-01-15T10:30:00Z'),
    },
  ],
};

// Teacher sees: "Alice is struggling with Arithmetic Operations (2 times)"
// Teacher decides: "I should review + vs - operations with the class"

// ============================================================================
// EXAMPLE 3: MIGRATION FROM YOUR CURRENT CODE
// ============================================================================

// YOUR CURRENT CODE (mentor.ts):
// export const processSubmission = async (userCode, testCases) => {
//   // ... does everything in one function
//   return { status, score, student_ui, teacher_db };
// }

// STEP 1: Update to new signature
// NEW CODE:
// export class MentorService {
//   async processSubmission(
//     code, testCases,
//     studentId, problemId, classroomId  // <-- NEW: context
//   ) {
//     // ... same logic but cleaner
//   }
// }

// STEP 2: Change how you call it
// BEFORE:
// const result = await processSubmission(code, testCases);

// AFTER:
// const mentor = new MentorService(grader, gemini);
// const result = await mentor.processSubmission(
//   code, testCases,
//   studentId, problemId, classroomId
// );

// STEP 3: Use the result
// BEFORE:
// return {
//   status: result.status,
//   student_ui: result.student_ui,
//   teacher_db: result.teacher_db,
// }

// AFTER:
// return {
//   status: result.status,
//   metrics: result.metrics,
//   studentUI: result.studentUI,     // What student sees
//   analyticsData: result.analyticsData, // What gets saved
// }

// ============================================================================
// EXAMPLE 4: ERROR SCENARIOS
// ============================================================================

// Scenario A: Syntax Error (Compilation fails)
const syntaxErrorResponse = {
  success: true,
  submissionId: 'sub_1705331000000_charlie_003',
  status: 'compile_error',
  metrics: {
    score: 0,
    runtime: '0.0234',
    fileSize: 128,
    passedCases: 0,
    totalCases: 3,
  },
  studentUI: {
    hint: 'โปรแกรมของคุณไม่สามารถคอมไพล์ได้ ลองตรวจสอบไวยากรณ์พื้นฐาน เช่น วงเล็บปิด { } หรือเซมิโคลอน ; ที่ท้ายบรรทัด',
    concept: 'Syntax Error',
    explanation:
      '1. คอมไพเลอร์ไม่รู้ว่าคำสั่งของคุณหมายความว่าอะไร\n' +
      '2. อาจมีสัญลักษณ์ที่ขาดไปหรือไม่ถูกต้อง',
  },
};

// Scenario B: Runtime Error (Crashes)
const runtimeErrorResponse = {
  success: true,
  submissionId: 'sub_1705331100000_diana_004',
  status: 'runtime_error',
  metrics: {
    score: 33, // At least 1 test case passed before crash
    runtime: '0.0156',
    fileSize: 210,
    passedCases: 1,
    totalCases: 3,
  },
  studentUI: {
    hint: 'โปรแกรมคอมไพล์สำเร็จ แต่เกิดข้อผิดพลาดขณะรัน ลองตรวจสอบการเข้าถึงอาร์เรย์ หรือค่าที่อาจเป็น 0 ที่ใช้ในการหาร',
    concept: 'Runtime Error - Array/Division',
    explanation:
      '1. โปรแกรมพยายามเข้าถึงที่อยู่หน่วยความจำที่ไม่ถูกต้อง\n' +
      '2. อาจเป็นการเข้าถึงนอกขอบของอาร์เรย์ หรือการหารด้วยศูนย์',
  },
};

// Scenario C: Success (All tests pass)
const successResponse = {
  success: true,
  submissionId: 'sub_1705331200000_emma_005',
  status: 'success',
  metrics: {
    score: 100,
    runtime: '0.0892',
    fileSize: 188,
    passedCases: 3,
    totalCases: 3,
  },
  studentUI: null, // No mentor feedback needed!
  // Student sees: "ยินดีด้วย! คะแนน 100/100 ✅"
  // Score goes to Leaderboard
};

// ============================================================================
// EXAMPLE 5: DATABASE OPERATIONS
// ============================================================================

// After processing, backend saves with:
// const repository = new InMemoryRepository(); // or MongoRepository, PostgresRepository
// await repository.saveSubmission(result.analyticsData);

// This stores:
const submissionRecord = {
  id: 'sub_1705330200000_alice_001',
  studentId: 'alice_001',
  problemId: 'array_sum',
  classroomId: 'class_4_1',
  code: '... full code ...',
  status: 'logic_error',
  score: 0,
  metrics: {
    runtime: 0.0856,
    fileSize: 156,
    passedCases: 0,
    totalCases: 3,
  },
  errorLog: {
    errorType: 'logic',
    rawError: null,
    failedTestInput: '2 3',
    failedTestExpected: '5',
    failedTestActual: '-1',
  },
  aiAnalysis: {
    concept: 'Arithmetic Operations',
    hint: 'ลองตรวจสอบเครื่องหมายดำเนินการ...',
    explanation: '...',
    severity: 'high',
    generatedAt: new Date('2024-01-15T10:30:00Z'),
  },
  submittedAt: new Date('2024-01-15T10:30:00Z'),
  createdAt: new Date('2024-01-15T10:30:00Z'),
};

// Then it updates student stats:
const updatedStats = {
  id: 'alice_001:array_sum',
  studentId: 'alice_001',
  problemId: 'array_sum',
  classroomId: 'class_4_1',
  totalSubmissions: 1, // Incremented
  successfulSubmissions: 0,
  lastSubmittedAt: new Date('2024-01-15T10:30:00Z'),
  bestScore: 0,
  averageScore: 0,
  errorCounts: {
    syntax: 0,
    runtime: 0,
    logic: 1, // Incremented
  },
  strugglingConcepts: [
    {
      concept: 'Arithmetic Operations',
      count: 1, // New or incremented
      lastOccurred: new Date('2024-01-15T10:30:00Z'),
    },
  ],
  updatedAt: new Date('2024-01-15T10:30:00Z'),
};

// ============================================================================
// EXAMPLE 6: QUICK API TEST
// ============================================================================

// Using curl:
/*
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "alice_001",
    "problemId": "array_sum",
    "classroomId": "class_4_1",
    "code": "#include <iostream>\nint main() {\n  int a, b;\n  cin >> a >> b;\n  cout << a - b;\n  return 0;\n}"
  }'
*/

// Using JavaScript/Fetch:
async function submitCode() {
  const response = await fetch('http://localhost:3000/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: 'alice_001',
      problemId: 'array_sum',
      classroomId: 'class_4_1',
      code: `
#include <iostream>
using namespace std;
int main() {
  int a, b;
  cin >> a >> b;
  cout << a - b;
  return 0;
}
      `,
    }),
  });

  const data = await response.json();
  console.log('Student sees:', data.studentUI);
  console.log('Score:', data.metrics.score);
}

// ============================================================================
// EXAMPLE 7: MIGRATION CHECKLIST
// ============================================================================

/*
STEP-BY-STEP MIGRATION FROM YOUR CURRENT CODE
==============================================

[ ] 1. Install dependencies
    npm install

[ ] 2. Copy your current files
    - Copy your wandbox.ts (should work as-is)
    - Copy your gemini.ts logic
    - Keep your config.ts

[ ] 3. Update gemini.ts
    - Replace with new GeminiService
    - Test with your GEMINI_API_KEY

[ ] 4. Create grader.service.ts
    - Move Wandbox execution logic here
    - Test with sample code

[ ] 5. Create mentor.service.ts
    - Move orchestration logic here
    - Connect GraderService + GeminiService

[ ] 6. Create Express server.ts
    - Set up routes (/api/submit, /health, etc.)
    - Wire up services

[ ] 7. Test locally
    npm run dev
    # Send test requests to /api/submit

[ ] 8. Deploy
    npm run build
    npm start

TESTING CHECKLIST:
[ ] POST /api/submit with valid code
[ ] Check student gets helpful hint (Thai language)
[ ] Check analytics data is correct
[ ] GET /api/classroom/:id/dashboard returns stats
[ ] Error handling works (Gemini timeout, Wandbox error)
[ ] Syntax errors detected correctly
[ ] Logic errors detected correctly
[ ] Success case works correctly
*/

// ============================================================================
// SUMMARY OF ARCHITECTURE IMPROVEMENTS
// ============================================================================

const improvementSummary = `
YOUR CURRENT CODE → PRODUCTION ARCHITECTURE
============================================

BEFORE:
  processSubmission(code, testCases)
  - Single function does everything
  - Returns one blob of data
  - Hard to test, hard to scale
  - Analytics not separated from UI

AFTER:
  MentorService.processSubmission(code, testCases, studentId, problemId, classroomId)
  - Orchestrates smaller services (GraderService, GeminiService)
  - Returns studentUI (show to student) + analyticsData (save to DB)
  - Easy to test each piece independently
  - Easy to swap implementations (MongoDB ↔ Postgres)
  - Built for scale: retry logic, fallbacks, timeouts

BENEFITS:
  ✅ Clean separation of concerns
  ✅ Type-safe with TypeScript interfaces
  ✅ Error handling at each layer
  ✅ Easy to add features (caching, rate limiting)
  ✅ Analytics built-in (teacher dashboard ready)
  ✅ Thai language support for mentoring
  ✅ Production-ready code quality
  ✅ Documented and maintainable

NEXT STEPS:
  1. Run the server locally
  2. Test with your existing code samples
  3. Plug in real database (MongoDB/Postgres)
  4. Deploy to production
  5. Monitor with logging/metrics
  6. Iterate with your teachers for feedback
`;

export {
  submitRequest,
  studentResponse,
  dashboardResponse,
  syntaxErrorResponse,
  runtimeErrorResponse,
  successResponse,
  submissionRecord,
  updatedStats,
  submitCode,
};

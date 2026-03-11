# How to set up (in case you guys wanna try)

1.Create project structure like this
debugbuddy-backend/
├── src/
│   ├── data/
│   └── services/
├── .env
├── package.json
├── tsconfig.json

2.Move Files : move all .ts files into src/services/

Move json files (problems.json, resources.json) to src/data/
Move config files (package.json, tsconfig.json, .env) in root (outside src)

2.Open terminal type npm install

3.Environment Setup: Create .env file and input your API key

Ex.
GEMINI_API_KEY=your_key_here
PORT=3000

4.Once installed, you can run npm run dev in terminal

5.if you see DebugBuddy Server Started, then it's all set! you can use either postman or curl straight to your localhost.

# Testing the program

Just cUrl or postman to this designated destination

1. Health Check
Method: GET

URL: http://localhost:3000/health

Check if the server is running fine

2. Submit Code
Key of our project, try sending C++ that has "Logic Error" to see how will the ai response

Method: POST

URL: http://localhost:3000/api/submit

Body (JSON):

JSON
{
  "studentId": "std_001",
  "problemId": "array_sum",
  "classroomId": "class_posn_1",
  "code": "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a - b; // ตั้งใจทำผิด: โจทย์ให้บวกแต่เราลบ\n    return 0;\n}"
}
3. Dashboard of students (teacher analytics)
Method: GET

URL: http://localhost:3000/api/classroom/class_posn_1/dashboard

Used to look up if anyone in the class got an error. (AI will summarize it for you)

4. Submissions history
Method: GET

URL: http://localhost:3000/api/students/std_001/submissions

Check who has sent their assignments
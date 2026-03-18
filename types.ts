/**
 * DebugBuddy Type Definitions
 * 
 * Single source of นิยามข้อมูล for all data structures.
 * Used across services, repositories, and API endpoints.
 */

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface SubmitCodeRequest {
  studentId: string;
  problemId: string;
  classroomId: string;
  code: string;
}

export interface SubmitCodeResponse {
  success: boolean;
  submissionId: string;
  status: SubmissionStatus;
  metrics: SubmissionMetrics;
  
  // What the student sees
  studentUI: StudentUIResponse | null;
  
  // What gets saved to the database
  analyticsData: AnalyticsData | null;
  
  // Error details for debugging
  error?: string;
}

// ============================================================================
// ASSIGNMENT TYPES (NEW!)
// ============================================================================

export interface Assignment {
  id: string;
  name?: string;
  classroomId: string;
  problemIds: string[];           // List of assigned problem IDs
  mode: 'guided' | 'free';        // 'guided' = must do these, 'free' = can do any
  
  createdBy: string;              // Teacher ID
  createdAt: Date;
  
  // Optional metadata
  dueDate?: Date;
  description?: string;
  minProblems?: number;           // For 'free' mode: "must do at least X"
}

export interface StudentProgress {
  id: string;
  studentId: string;
  classroomId: string;
  problemId: string;
  
  isCompleted: boolean;           // Score >= 80%
  completedAt?: Date;
  bestScore: number;
  
  assignmentId?: string;          // If part of assignment
}

// ============================================================================
// SUBMISSION & EXECUTION TYPES
// ============================================================================

export type SubmissionStatus = 'success' | 'compile_error' | 'runtime_error' | 'logic_error';

export interface SubmissionMetrics {
  score: number;                 // 0-100
  runtime: string;               // "0.1234" seconds
  fileSize: number;              // bytes
  passedCases: number;           // e.g., 2
  totalCases: number;            // e.g., 3
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
}

export interface ExecutionResult {
  passed: boolean;
  compilerError?: string;
  runtimeError?: string;
  stdout: string;
  stderr: string;
  duration: number;              // in seconds
}

// ============================================================================
// AI ANALYSIS TYPES
// ============================================================================

export interface AIAnalysisRequest {
  code: string;
  error: string;                 // Compiler error, runtime error, or logic error description
  language?: string;             // "cpp", default
  problemContext?: {              // Problem context for better AI analysis
    title: string;
    description: string;
    expectedOutput: string;
  };
}

export interface AIAnalysisResponse {
  studentUI: StudentUIData;
  teacherDB: TeacherDBData;
}

export interface StudentUIData {
  hint: string;                  // Scaffolding hint in Thai
  concept: string;               // Topic/concept (e.g., "Array Bounds")
  explanation: string;           // Multi-line explanation
  resourceLink?: string;         // Link to learning material
}

export interface TeacherDBData {
  errorSummary: string;          // Technical summary
  errorType: 'syntax' | 'runtime' | 'logic';
  severity: 'low' | 'medium' | 'high';
}

// ============================================================================
// SUBMISSION LOGGING & ANALYTICS
// ============================================================================

export interface AnalyticsData {
  submissionId: string;
  studentId: string;
  problemId: string;
  classroomId: string;
  
  timestamp: Date;
  status: SubmissionStatus;
  score: number;
  
  // Execution details
  failedTestCaseIndex?: number;
  failedInput?: string;
  failedExpectedOutput?: string;
  failedActualOutput?: string;
  rawError?: string;
  
  // AI Analysis (if error occurred)
  aiAnalysis?: {
    concept: string;
    hint: string;
    explanation: string;
    severity: 'low' | 'medium' | 'high';
    generatedAt: Date;
  };
  
  // Code metadata
  codeLength: number;
  codeHash?: string;             // For deduplication detection
}

// ============================================================================
// DATABASE MODELS
// ============================================================================

/**
 * What we persist to the database.
 * This is the raw submission record.
 */
export interface SubmissionRecord {
  id: string;
  studentId: string;
  problemId: string;
  classroomId: string;
  
  code: string;
  status: SubmissionStatus;
  score: number;
  
  metrics: {
    runtime: number;
    fileSize: number;
    passedCases: number;
    totalCases: number;
  };
  
  errorLog?: {
    errorType: 'syntax' | 'runtime' | 'logic';
    rawError?: string;
    failedTestInput?: string;
    failedTestExpected?: string;
    failedTestActual?: string;
  };
  
  aiAnalysis?: {
    concept: string;
    hint: string;
    explanation: string;
    severity: 'low' | 'medium' | 'high';
    generatedAt: Date;
  };
  
  submittedAt: Date;
  createdAt: Date;
}

/**
 * Aggregated stats for a student on a specific problem.
 * Updated after each submission.
 */
export interface StudentProblemStats {
  id: string;                    // ${studentId}:${problemId}
  studentId: string;
  problemId: string;
  classroomId: string;
  
  totalSubmissions: number;
  successfulSubmissions: number;
  lastSubmittedAt: Date;
  
  bestScore: number;
  averageScore: number;
  
  errorCounts: {
    syntax: number;
    runtime: number;
    logic: number;
  };
  
  strugglingConcepts: Array<{
    concept: string;
    count: number;
    lastOccurred?: Date;
  }>;
  
  updatedAt: Date;
}

/**
 * Aggregated stats for a problem across all students.
 */
export interface ProblemStats {
  id: string;                    // `problem:${problemId}`
  problemId: string;
  classroomId: string;
  
  totalSubmissions: number;
  totalStudents: number;
  studentsSucceeded: number;
  successRate: number;           // percentage
  
  commonErrors: Array<{
    concept: string;
    count: number;
    affectedStudents: number;
  }>;
  
  updatedAt: Date;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class DebugBuddyError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'DebugBuddyError';
  }
}

export class ValidationError extends DebugBuddyError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DebugBuddyError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ExternalServiceError extends DebugBuddyError {
  constructor(service: string, message: string) {
    super(`${service}_ERROR`, `${service} error: ${message}`, 502);
    this.name = 'ExternalServiceError';
  }
}

// ============================================================================
// STUDENT UI RESPONSE
// ============================================================================

export interface StudentUIResponse {
  hint: string;
  concept: string;
  explanation: string;
  resourceLink?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AppConfig {
  port: number;
  environment: 'development' | 'staging' | 'production';
  
  gemini: {
    apiKey: string;
    model: string;
    maxRetries: number;
    timeoutMs: number;
  };
  
  wandbox: {
    url: string;
    timeoutMs: number;
    maxCodeSize: number;          // bytes
  };
  
  database: {
    url: string;
    maxPoolSize: number;
  };
  
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

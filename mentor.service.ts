/**
 * Mentor Service
 * 
 * Orchestrator that coordinates:
 * 1. Code execution (GraderService)
 * 2. AI analysis (GeminiService)
 * 3. Response building for frontend and database
 * 
 * This is the "business logic" layer.
 */

import {
  TestCase,
  SubmissionStatus,
  AnalyticsData,
  AIAnalysisRequest,
  AIAnalysisResponse,
  StudentUIResponse,
  SubmitCodeResponse,
} from './types';
import { GraderService } from './grader.service';
import { GeminiService } from './gemini.service';

export class MentorService {
  constructor(private grader: GraderService, private gemini: GeminiService) {}

  /**
   * Main entry point: process a student's code submission
   *
   * Returns:
   * - What to send to the student (UI)
   * - What to save to the database (analytics)
   */
  async processSubmission(
    code: string,
    testCases: TestCase[],
    studentId: string,
    problemId: string,
    classroomId: string,
    problemContext?: { title: string; description: string; expectedOutput: string }
  ): Promise<{
    status: SubmissionStatus;
    metrics: {
      score: number;
      runtime: string;
      fileSize: number;
      passedCases: number;
      totalCases: number;
    };
    studentUI: StudentUIResponse | null;
    analyticsData: AnalyticsData;
  }> {
    // Step 1: Grade the submission
    console.log(`⏱️  Grading submission for student ${studentId} on problem ${problemId}...`);
    const gradeResult = await this.grader.gradeSubmission(code, testCases);

    const metrics = {
      score: gradeResult.score,
      runtime: gradeResult.totalRuntime.toFixed(4),
      fileSize: Buffer.byteLength(code, 'utf8'),
      passedCases: gradeResult.passedCases,
      totalCases: gradeResult.totalCases,
    };

    // Step 2: If there's an error, get AI analysis
    let aiAnalysis: AIAnalysisResponse | null = null;
    if (gradeResult.status !== 'success') {
      console.log(`🤖 Analyzing error with Gemini...`);
      const errorContext = this.grader.buildErrorContext(code, gradeResult.firstFailedCase);

      try {
        aiAnalysis = await this.gemini.analyzeCode({
          code,
          error: errorContext,
          problemContext, // NEW: Pass problem context to AI
        });
      } catch (error) {
        console.error('⚠️  AI analysis failed, using fallback:', error);
        // Gemini service already provides fallback, but log it
      }
    }

    // Step 3: Build response for student UI
    const studentUI = this.buildStudentUI(gradeResult.status, aiAnalysis);

    // Step 4: Build analytics data for database
    const analyticsData = this.buildAnalyticsData(
      studentId,
      problemId,
      classroomId,
      gradeResult,
      aiAnalysis,
      code,
      metrics
    );

    return {
      status: gradeResult.status,
      metrics,
      studentUI,
      analyticsData,
    };
  }

  /**
   * Build what the student sees on their screen
   */
  private buildStudentUI(
    status: SubmissionStatus,
    aiAnalysis: AIAnalysisResponse | null
  ): StudentUIResponse | null {
    if (status === 'success') {
      // No mentor feedback for successful submissions
      return null;
    }

    if (!aiAnalysis) {
      // Fallback if AI analysis is unavailable
      return {
        hint: 'ลองติดตามตรรกะของโปรแกรมอีกครั้งอย่างระมัดระวัง',
        concept: 'General',
        explanation: 'พบข้อผิดพลาด โปรแกรมของคุณไม่ให้ผลลัพธ์ที่ถูกต้อง',
        resourceLink: undefined,
      };
    }

    return {
      hint: aiAnalysis.studentUI.hint,
      concept: aiAnalysis.studentUI.concept,
      explanation: aiAnalysis.studentUI.explanation,
      resourceLink: aiAnalysis.studentUI.resourceLink,
    };
  }

  /**
   * Build structured data for database storage
   */
  private buildAnalyticsData(
    studentId: string,
    problemId: string,
    classroomId: string,
    gradeResult: any,
    aiAnalysis: AIAnalysisResponse | null,
    code: string,
    metrics: any
  ): AnalyticsData {
    const submissionId = `sub_${Date.now()}_${studentId}`;

    const analyticsData: AnalyticsData = {
      submissionId,
      studentId,
      problemId,
      classroomId,
      timestamp: new Date(),
      status: gradeResult.status,
      score: gradeResult.score,
      codeLength: code.length,
      // codeHash: this.hashCode(code), // Optional: for deduplication
    };

    // Add failure details if applicable
    if (gradeResult.firstFailedCase) {
      analyticsData.failedTestCaseIndex = 0;
      analyticsData.failedInput = gradeResult.firstFailedCase.testCase.input;
      analyticsData.failedExpectedOutput = gradeResult.firstFailedCase.expected;
      analyticsData.failedActualOutput = gradeResult.firstFailedCase.actual;
      analyticsData.rawError = gradeResult.firstFailedCase.error;
    }

    // Add AI analysis if available
    if (aiAnalysis) {
      analyticsData.aiAnalysis = {
        concept: aiAnalysis.studentUI.concept,
        hint: aiAnalysis.studentUI.hint,
        explanation: aiAnalysis.studentUI.explanation,
        severity: aiAnalysis.teacherDB.severity,
        generatedAt: new Date(),
      };
    }

    return analyticsData;
  }

  /**
   * Simple hash for code deduplication (optional)
   */
  private hashCode(code: string): string {
    // In production, use crypto.createHash('sha256').update(code).digest('hex');
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
}
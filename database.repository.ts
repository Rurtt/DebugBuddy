/**
 * Database Repository - UPDATED WITH ASSIGNMENTS
 * 
 * Abstraction layer for data persistence.
 * Supports MongoDB or PostgreSQL (interface-based).
 * 
 * In production, implement specific providers:
 * - MongoRepository extends this
 * - PostgresRepository extends this
 */

import {
  SubmissionRecord,
  StudentProblemStats,
  ProblemStats,
  AnalyticsData,
  Assignment,
  StudentProgress,
  NotFoundError,
} from './types';

export interface IRepository {
  // Submissions
  saveSubmission(analytics: AnalyticsData): Promise<SubmissionRecord>;
  getSubmission(submissionId: string): Promise<SubmissionRecord | null>;
  getStudentSubmissions(studentId: string, problemId?: string): Promise<SubmissionRecord[]>;

  // Student Stats
  getOrCreateStudentStats(studentId: string, problemId: string, classroomId: string): Promise<StudentProblemStats>;
  updateStudentStats(stats: StudentProblemStats): Promise<void>;

  // Problem Stats
  getOrCreateProblemStats(problemId: string, classroomId: string): Promise<ProblemStats>;
  updateProblemStats(stats: ProblemStats): Promise<void>;

  // Assignments (NEW!)
  createAssignment(assignment: Assignment): Promise<Assignment>;
  getAssignments(classroomId: string): Promise<Assignment[]>;
  getAssignment(assignmentId: string): Promise<Assignment | null>;
  updateAssignment(assignment: Assignment): Promise<void>;

  // Student Progress (NEW!)
  saveStudentProgress(progress: StudentProgress): Promise<StudentProgress>;
  getStudentProgress(studentId: string, classroomId: string): Promise<StudentProgress[]>;
  isProblemaCompleted(studentId: string, problemId: string): Promise<boolean>;

  // Query for dashboards
  getClassroomReport(classroomId: string): Promise<{
    students: StudentProblemStats[];
    problems: ProblemStats[];
    recentErrors: SubmissionRecord[];
  }>;
}

/**
 * In-memory repository for development/testing
 * Do NOT use in production
 */
export class InMemoryRepository implements IRepository {
  private submissions: Map<string, SubmissionRecord> = new Map();
  private studentStats: Map<string, StudentProblemStats> = new Map();
  private problemStats: Map<string, ProblemStats> = new Map();
  private assignments: Map<string, Assignment> = new Map();          // NEW!
  private studentProgress: Map<string, StudentProgress> = new Map(); // NEW!

  async saveSubmission(analytics: AnalyticsData): Promise<SubmissionRecord> {
    const record: SubmissionRecord = {
      id: analytics.submissionId,
      studentId: analytics.studentId,
      problemId: analytics.problemId,
      classroomId: analytics.classroomId,
      code: '', // Not stored in analytics
      status: analytics.status,
      score: analytics.score,
      metrics: {
        runtime: parseFloat(analytics.submissionId || '0'), // Placeholder
        fileSize: analytics.codeLength,
        passedCases: 0, // Would need to calculate
        totalCases: 0,
      },
      submittedAt: analytics.timestamp,
      createdAt: new Date(),
    };

    if (analytics.failedInput) {
      record.errorLog = {
        errorType: analytics.rawError ? 'syntax' : 'logic',
        rawError: analytics.rawError,
        failedTestInput: analytics.failedInput,
        failedTestExpected: analytics.failedExpectedOutput,
        failedTestActual: analytics.failedActualOutput,
      };
    }

    if (analytics.aiAnalysis) {
      record.aiAnalysis = {
        concept: analytics.aiAnalysis.concept,
        hint: analytics.aiAnalysis.hint,
        explanation: analytics.aiAnalysis.explanation,
        severity: analytics.aiAnalysis.severity,
        generatedAt: analytics.aiAnalysis.generatedAt,
      };
    }

    this.submissions.set(record.id, record);

    // NEW: Auto-save progress if score >= 80%
    if (analytics.score >= 80) {
      await this.saveStudentProgress({
        id: `prog_${analytics.studentId}_${analytics.problemId}`,
        studentId: analytics.studentId,
        classroomId: analytics.classroomId,
        problemId: analytics.problemId,
        isCompleted: true,
        completedAt: new Date(),
        bestScore: analytics.score,
      });
    }

    return record;
  }

  async getSubmission(submissionId: string): Promise<SubmissionRecord | null> {
    return this.submissions.get(submissionId) || null;
  }

  async getStudentSubmissions(studentId: string, problemId?: string): Promise<SubmissionRecord[]> {
    const submissions = Array.from(this.submissions.values()).filter(
      sub => sub.studentId === studentId && (!problemId || sub.problemId === problemId)
    );
    return submissions;
  }

  async getOrCreateStudentStats(
    studentId: string,
    problemId: string,
    classroomId: string
  ): Promise<StudentProblemStats> {
    const key = `${studentId}:${problemId}`;
    let stats = this.studentStats.get(key);

    if (!stats) {
      stats = {
        id: key,
        studentId,
        problemId,
        classroomId,
        totalSubmissions: 0,
        successfulSubmissions: 0,
        lastSubmittedAt: new Date(),
        bestScore: 0,
        averageScore: 0,
        errorCounts: { syntax: 0, runtime: 0, logic: 0 },
        strugglingConcepts: [],
        updatedAt: new Date(),
      };
      this.studentStats.set(key, stats);
    }

    return stats;
  }

  async updateStudentStats(stats: StudentProblemStats): Promise<void> {
    this.studentStats.set(stats.id, stats);
  }

  async getOrCreateProblemStats(problemId: string, classroomId: string): Promise<ProblemStats> {
    const key = `problem:${problemId}`;
    let stats = this.problemStats.get(key);

    if (!stats) {
      stats = {
        id: key,
        problemId,
        classroomId,
        totalSubmissions: 0,
        totalStudents: 0,
        studentsSucceeded: 0,
        successRate: 0,
        commonErrors: [],
        updatedAt: new Date(),
      };
      this.problemStats.set(key, stats);
    }

    return stats;
  }

  async updateProblemStats(stats: ProblemStats): Promise<void> {
    this.problemStats.set(stats.id, stats);
  }

  // NEW: Assignment Management
  async createAssignment(assignment: Assignment): Promise<Assignment> {
    if (!assignment.id) {
      assignment.id = `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    this.assignments.set(assignment.id, assignment);
    console.log(`✅ Assignment created: ${assignment.id}`);
    return assignment;
  }

  async getAssignments(classroomId: string): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter(a => a.classroomId === classroomId);
  }

  async getAssignment(assignmentId: string): Promise<Assignment | null> {
    return this.assignments.get(assignmentId) || null;
  }

  async updateAssignment(assignment: Assignment): Promise<void> {
    this.assignments.set(assignment.id, assignment);
  }

  // NEW: Student Progress Tracking
  async saveStudentProgress(progress: StudentProgress): Promise<StudentProgress> {
    if (!progress.id) {
      progress.id = `prog_${progress.studentId}_${progress.problemId}`;
    }
    this.studentProgress.set(progress.id, progress);
    console.log(`✅ Progress saved: ${progress.studentId} completed ${progress.problemId}`);
    return progress;
  }

  async getStudentProgress(studentId: string, classroomId: string): Promise<StudentProgress[]> {
    return Array.from(this.studentProgress.values()).filter(
      p => p.studentId === studentId && p.classroomId === classroomId
    );
  }

  async isProblemaCompleted(studentId: string, problemId: string): Promise<boolean> {
    const key = `prog_${studentId}_${problemId}`;
    const progress = this.studentProgress.get(key);
    return progress?.isCompleted ?? false;
  }

  async getClassroomReport(classroomId: string): Promise<{
    students: StudentProblemStats[];
    problems: ProblemStats[];
    recentErrors: SubmissionRecord[];
  }> {
    const students = Array.from(this.studentStats.values()).filter(s => s.classroomId === classroomId);

    const problems = Array.from(this.problemStats.values()).filter(p => p.classroomId === classroomId);

    const recentErrors = Array.from(this.submissions.values())
      .filter(sub => sub.classroomId === classroomId && sub.status !== 'success')
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .slice(0, 20);

    return { students, problems, recentErrors };
  }
}

/**
 * TODO: Implement these in production
 *
 * export class MongoRepository implements IRepository {
 *   constructor(private db: MongoClient) {}
 *
 *   async saveSubmission(analytics: AnalyticsData): Promise<SubmissionRecord> {
 *     const record = convertAnalyticsToRecord(analytics);
 *     const result = await this.db.collection('submissions').insertOne(record);
 *     record.id = result.insertedId.toString();
 *     return record;
 *   }
 *   
 *   async createAssignment(assignment: Assignment): Promise<Assignment> {
 *     const result = await this.db.collection('assignments').insertOne(assignment);
 *     assignment.id = result.insertedId.toString();
 *     return assignment;
 *   }
 *   // ... other methods
 * }
 */

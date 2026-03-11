/**
 * DebugBuddy Server - WITH ASSIGNMENTS
 *
 * Express.js application with:
 * - Middleware for logging, error handling, validation
 * - API routes for submissions and dashboards
 * - Assignment management for teachers
 * - Problem completion tracking for students
 * - Dependency injection for services
 * - Graceful shutdown handling
 */

import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { GraderService } from './grader.service';
import { GeminiService } from './gemini.service';
import { MentorService } from './mentor.service';
import { InMemoryRepository } from './database.repository';
import {
  SubmitCodeRequest,
  SubmitCodeResponse,
  Assignment,
  DebugBuddyError,
  ValidationError,
  AppConfig,
} from './types';

// Import problems and resources from JSON
import problems from '../data/problems.json' assert { type: 'json' };
import resources from '../data/resources.json' assert { type: 'json' };

// ============================================================================
// CONFIGURATION
// ============================================================================

const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000'),
  environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'models/gemini-2.5-flash',
    maxRetries: 2,
    timeoutMs: 10000,
  },
  wandbox: {
    url: 'https://wandbox.org/api/compile.json',
    timeoutMs: 10000,
    maxCodeSize: 100000,
  },
  database: {
    url: process.env.DATABASE_URL || '',
    maxPoolSize: 10,
  },
  logging: {
    level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  },
};

// Validate critical config
if (!config.gemini.apiKey) {
  console.error('❌ GEMINI_API_KEY is required. Set it in .env file.');
  process.exit(1);
}

// ============================================================================
// SERVICE INITIALIZATION
// ============================================================================

const grader = new GraderService();
const gemini = new GeminiService(config.gemini.apiKey, config.gemini.model, config.gemini.maxRetries, config.gemini.timeoutMs);
const mentor = new MentorService(grader, gemini);
const repository = new InMemoryRepository();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getResourceLink(concept: string): string {
  const resourceMap = resources as Record<string, string>;
  if (resourceMap[concept]) {
    return resourceMap[concept];
  }
  return resourceMap['Default'] || 'https://programming.in.th/';
}

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app: Express = express();

// Middleware: CORS
app.use(cors());

// Middleware: Parse JSON
app.use(express.json({ limit: '10mb' }));

// Middleware: Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: config.environment,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get all problems
 */
app.get('/api/problems', (req: Request, res: Response) => {
  const problemsList = Object.entries(problems).map(([id, problem]: any) => ({
    id,
    title: problem.title,
    description: problem.description,
    difficulty: problem.difficulty,
    concept: problem.concept,
    testCaseCount: problem.testCases.length,
  }));
  
  res.json({
    success: true,
    problems: problemsList,
    total: problemsList.length,
  });
});

/**
 * Get specific problem details
 */
app.get('/api/problems/:problemId', (req: Request, res: Response) => {
  const { problemId } = req.params;
  const problem = (problems as any)[problemId];
  
  if (!problem) {
    return res.status(404).json({
      success: false,
      error: 'Problem not found',
    });
  }
  
  res.json({
    success: true,
    problem: {
      id: problemId,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      concept: problem.concept,
      testCaseCount: problem.testCases.length,
    },
  });
});

/**
 * Get all resources
 */
app.get('/api/resources', (req: Request, res: Response) => {
  res.json({
    success: true,
    resources,
  });
});

// ============================================================================
// ASSIGNMENT ENDPOINTS (NEW!)
// ============================================================================

/**
 * Create assignment (Teacher)
 * POST /api/classroom/:classroomId/assignments
 */
app.post('/api/classroom/:classroomId/assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classroomId } = req.params;
    const { problemIds, mode, dueDate, description, createdBy, minProblems } = req.body;

    if (!problemIds || !Array.isArray(problemIds) || problemIds.length === 0) {
      throw new ValidationError('problemIds must be a non-empty array');
    }

    if (!mode || !['guided', 'free'].includes(mode)) {
      throw new ValidationError('mode must be either "guided" or "free"');
    }

    const assignment: Assignment = {
      id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      classroomId,
      problemIds,
      mode,
      createdBy: createdBy || 'teacher_default',
      createdAt: new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      description,
      minProblems,
    };

    const savedAssignment = await repository.createAssignment(assignment);

    res.json({
      success: true,
      assignment: savedAssignment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get assignments for classroom (Teacher/Student)
 * GET /api/classroom/:classroomId/assignments
 */
app.get('/api/classroom/:classroomId/assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classroomId } = req.params;
    const assignments = await repository.getAssignments(classroomId);

    res.json({
      success: true,
      assignments,
      count: assignments.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get student's available problems (Student UI)
 * GET /api/students/:studentId/available-problems?classroomId=X
 */
app.get('/api/students/:studentId/available-problems', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const { classroomId } = req.query;

    if (!classroomId) {
      throw new ValidationError('classroomId is required');
    }

    // Get assignments for this classroom
    const assignments = await repository.getAssignments(classroomId as string);

    // Build available problems list
    const availableProblems: any[] = [];

    for (const assignment of assignments) {
      if (assignment.mode === 'guided') {
        // Add assigned problems
        for (const problemId of assignment.problemIds) {
          const isCompleted = await repository.isProblemaCompleted(studentId, problemId);
          availableProblems.push({
            problemId,
            title: (problems as any)[problemId]?.title || 'Unknown',
            difficulty: (problems as any)[problemId]?.difficulty || 'unknown',
            mode: 'assigned',
            dueDate: assignment.dueDate,
            isCompleted,
            assignmentId: assignment.id,
          });
        }
      } else if (assignment.mode === 'free') {
        // Add all problems for free practice
        const allProblemIds = Object.keys(problems);
        for (const problemId of allProblemIds) {
          const isCompleted = await repository.isProblemaCompleted(studentId, problemId);
          availableProblems.push({
            problemId,
            title: (problems as any)[problemId].title,
            difficulty: (problems as any)[problemId].difficulty,
            mode: 'practice',
            dueDate: null,
            isCompleted,
            assignmentId: assignment.id,
          });
        }
      }
    }

    res.json({
      success: true,
      studentId,
      classroomId,
      availableProblems,
      completedCount: availableProblems.filter(p => p.isCompleted).length,
      totalCount: availableProblems.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get student progress (Student UI)
 * GET /api/students/:studentId/progress?classroomId=X
 */
app.get('/api/students/:studentId/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const { classroomId } = req.query;

    if (!classroomId) {
      throw new ValidationError('classroomId is required');
    }

    const progress = await repository.getStudentProgress(studentId, classroomId as string);

    res.json({
      success: true,
      studentId,
      progress: progress.map(p => ({
        problemId: p.problemId,
        isCompleted: p.isCompleted,
        bestScore: p.bestScore,
        completedAt: p.completedAt,
      })),
      completedCount: progress.filter(p => p.isCompleted).length,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CODE SUBMISSION ENDPOINT
// ============================================================================

/**
 * Main submission endpoint
 * POST /api/submit
 */
app.post('/api/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, problemId, classroomId, code } = req.body as SubmitCodeRequest;

    // Validation
    if (!studentId || !problemId || !classroomId || !code) {
      throw new ValidationError('Missing required fields: studentId, problemId, classroomId, code');
    }

    // Get test cases from problems.json
    const problem = (problems as any)[problemId];
    if (!problem) {
      throw new ValidationError(`Problem '${problemId}' not found`);
    }

    const testCases = problem.testCases;
    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      throw new ValidationError(`Problem '${problemId}' has no test cases`);
    }

    console.log(`📝 Processing submission for student ${studentId} on problem ${problemId}`);

    const problemContext = {
      title: problem.title,
      description: problem.description,
      expectedOutput: problem.testCases[0]?.expectedOutput || 'output',
    };

    const result = await mentor.processSubmission(
      code,
      testCases,
      studentId,
      problemId,
      classroomId,
      problemContext
    );

    // Save to database
    console.log(`💾 Saving submission ${result.analyticsData.submissionId} to database`);
    await repository.saveSubmission(result.analyticsData);

    // Update analytics
    const studentStats = await repository.getOrCreateStudentStats(studentId, problemId, classroomId);
    studentStats.totalSubmissions += 1;
    if (result.status === 'success') {
      studentStats.successfulSubmissions += 1;
    }
    if (result.metrics.score > studentStats.bestScore) {
      studentStats.bestScore = result.metrics.score;
    }
    studentStats.lastSubmittedAt = new Date();
    await repository.updateStudentStats(studentStats);

    // Get resource link
    const resourceLink = getResourceLink(problem.concept);

    const response: SubmitCodeResponse = {
      success: true,
      submissionId: result.analyticsData.submissionId,
      status: result.status,
      metrics: result.metrics,
      studentUI: result.studentUI ? {
        ...result.studentUI,
        resourceLink,
      } : null,
      analyticsData: result.analyticsData,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

/**
 * Get teacher dashboard data
 * GET /api/classroom/:classroomId/dashboard
 */
app.get('/api/classroom/:classroomId/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classroomId } = req.params;
    const report = await repository.getClassroomReport(classroomId);

    res.json({
      classroomId,
      studentStats: report.students.map(s => ({
        studentId: s.studentId,
        problemId: s.problemId,
        totalSubmissions: s.totalSubmissions,
        bestScore: s.bestScore,
        successRate: s.totalSubmissions > 0 ? (s.successfulSubmissions / s.totalSubmissions) * 100 : 0,
        strugglingConcepts: s.strugglingConcepts.map(c => ({
          concept: c.concept,
          count: c.count,
        })),
      })),
      problemStats: report.problems.map(p => ({
        problemId: p.problemId,
        successRate: p.successRate,
        commonErrors: p.commonErrors.map(e => ({
          concept: e.concept,
          count: e.count,
        })),
      })),
      recentErrors: report.recentErrors.map(e => ({
        submissionId: e.id,
        studentId: e.studentId,
        problemId: e.problemId,
        status: e.status,
        score: e.score,
        concept: e.aiAnalysis?.concept,
        submittedAt: e.submittedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get student's submission history
 * GET /api/students/:studentId/submissions
 */
app.get('/api/students/:studentId/submissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const { problemId } = req.query;
    const submissions = await repository.getStudentSubmissions(studentId, problemId as string | undefined);

    res.json({
      studentId,
      submissions: submissions.map(s => ({
        id: s.id,
        problemId: s.problemId,
        status: s.status,
        score: s.score,
        submittedAt: s.submittedAt,
        aiConcept: s.aiAnalysis?.concept,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', error);

  if (error instanceof DebugBuddyError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.environment === 'production' ? 'An error occurred' : error.message,
    },
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// ============================================================================
// SERVER START
// ============================================================================

const server = app.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════╗
║  🚀 DebugBuddy Server Started            ║
╚══════════════════════════════════════════╝
  
Environment: ${config.environment}
Port: ${config.port}
Base URL: http://localhost:${config.port}

📌 Endpoints:
  - GET  /health
  - GET  /api/problems
  - GET  /api/problems/:problemId
  - GET  /api/resources
  
  📚 ASSIGNMENTS (NEW!):
  - POST /api/classroom/:classroomId/assignments
  - GET  /api/classroom/:classroomId/assignments
  - GET  /api/students/:studentId/available-problems
  - GET  /api/students/:studentId/progress
  
  📤 SUBMISSION:
  - POST /api/submit
  
  📊 DASHBOARD:
  - GET  /api/classroom/:classroomId/dashboard
  - GET  /api/students/:studentId/submissions

✅ Ready to accept submissions!
  `);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
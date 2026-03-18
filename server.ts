// /**
//  * DebugBuddy Server - WITH ASSIGNMENTS
//  *
//  * Express.js application with:
//  * - Middleware for logging, error handling, validation
//  * - API routes for submissions and dashboards
//  * - Assignment management for teachers
//  * - Problem completion tracking for students
//  * - Dependency injection for services
//  * - Graceful shutdown handling
//  */

// import 'dotenv/config';
// import express, { Express, Request, Response, NextFunction } from 'express';
// import cors from 'cors';
// import { GraderService } from './grader.service';
// import { GeminiService } from './gemini.service';
// import { MentorService } from './mentor.service';
// import { InMemoryRepository } from './database.repository';
// import {
//   SubmitCodeRequest,
//   SubmitCodeResponse,
//   Assignment,
//   DebugBuddyError,
//   ValidationError,
//   AppConfig,
// } from './types';

// // Import problems and resources from JSON
// import problems from '../data/problems.json' assert { type: 'json' };
// import resources from '../data/resources.json' assert { type: 'json' };

// // ============================================================================
// // CONFIGURATION
// // ============================================================================

// const config: AppConfig = {
//   port: parseInt(process.env.PORT || '3000'),
//   environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
//   gemini: {
//     apiKey: process.env.GEMINI_API_KEY || '',
//     model: 'models/gemini-2.5-flash',
//     maxRetries: 2,
//     timeoutMs: 10000,
//   },
//   wandbox: {
//     url: 'https://wandbox.org/api/compile.json',
//     timeoutMs: 10000,
//     maxCodeSize: 100000,
//   },
//   database: {
//     url: process.env.DATABASE_URL || '',
//     maxPoolSize: 10,
//   },
//   logging: {
//     level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
//   },
// };

// // Validate critical config
// if (!config.gemini.apiKey) {
//   console.error('❌ GEMINI_API_KEY is required. Set it in .env file.');
//   process.exit(1);
// }

// // ============================================================================
// // SERVICE INITIALIZATION
// // ============================================================================

// const grader = new GraderService();
// const gemini = new GeminiService(config.gemini.apiKey, config.gemini.model, config.gemini.maxRetries, config.gemini.timeoutMs);
// const mentor = new MentorService(grader, gemini);
// const repository = new InMemoryRepository();

// // ============================================================================
// // HELPER FUNCTIONS
// // ============================================================================

// function getResourceLink(concept: string): string {
//   const resourceMap = resources as Record<string, string>;
//   if (resourceMap[concept]) {
//     return resourceMap[concept];
//   }
//   return resourceMap['Default'] || 'https://programming.in.th/';
// }

// // ============================================================================
// // EXPRESS APP SETUP
// // ============================================================================

// const app: Express = express();

// // Middleware: CORS
// app.use(cors());

// // Middleware: Parse JSON
// app.use(express.json({ limit: '10mb' }));

// // Middleware: Request logging
// app.use((req: Request, res: Response, next: NextFunction) => {
//   const start = Date.now();
//   res.on('finish', () => {
//     const duration = Date.now() - start;
//     console.log(`[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`);
//   });
//   next();
// });

// // ============================================================================
// // ROUTES
// // ============================================================================

// /**
//  * Health check endpoint
//  */
// app.get('/health', (req: Request, res: Response) => {
//   res.json({
//     status: 'ok',
//     environment: config.environment,
//     timestamp: new Date().toISOString(),
//   });
// });

// /**
//  * Get all problems
//  */
// app.get('/api/problems', (req: Request, res: Response) => {
//   const problemsList = Object.entries(problems).map(([id, problem]: any) => ({
//     id,
//     title: problem.title,
//     description: problem.description,
//     difficulty: problem.difficulty,
//     concept: problem.concept,
//     testCaseCount: problem.testCases.length,
//   }));
  
//   res.json({
//     success: true,
//     problems: problemsList,
//     total: problemsList.length,
//   });
// });

// /**
//  * Get specific problem details
//  */
// app.get('/api/problems/:problemId', (req: Request, res: Response) => {
//   const { problemId } = req.params;
//   const problem = (problems as any)[problemId];
  
//   if (!problem) {
//     return res.status(404).json({
//       success: false,
//       error: 'Problem not found',
//     });
//   }
  
//   res.json({
//     success: true,
//     problem: {
//       id: problemId,
//       title: problem.title,
//       description: problem.description,
//       difficulty: problem.difficulty,
//       concept: problem.concept,
//       testCaseCount: problem.testCases.length,
//     },
//   });
// });

// /**
//  * Get all resources
//  */
// app.get('/api/resources', (req: Request, res: Response) => {
//   res.json({
//     success: true,
//     resources,
//   });
// });

// // ============================================================================
// // ASSIGNMENT ENDPOINTS (NEW!)
// // ============================================================================

// /**
//  * Create assignment (Teacher)
//  * POST /api/classroom/:classroomId/assignments
//  */
// app.post('/api/classroom/:classroomId/assignments', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { classroomId } = req.params;
//     const { problemIds, mode, dueDate, description, createdBy, minProblems } = req.body;

//     if (!problemIds || !Array.isArray(problemIds) || problemIds.length === 0) {
//       throw new ValidationError('problemIds must be a non-empty array');
//     }

//     if (!mode || !['guided', 'free'].includes(mode)) {
//       throw new ValidationError('mode must be either "guided" or "free"');
//     }

//     const assignment: Assignment = {
//       id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//       classroomId,
//       problemIds,
//       mode,
//       createdBy: createdBy || 'teacher_default',
//       createdAt: new Date(),
//       dueDate: dueDate ? new Date(dueDate) : undefined,
//       description,
//       minProblems,
//     };

//     const savedAssignment = await repository.createAssignment(assignment);

//     res.json({
//       success: true,
//       assignment: savedAssignment,
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// /**
//  * Get assignments for classroom (Teacher/Student)
//  * GET /api/classroom/:classroomId/assignments
//  */
// app.get('/api/classroom/:classroomId/assignments', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { classroomId } = req.params;
//     const assignments = await repository.getAssignments(classroomId);

//     res.json({
//       success: true,
//       assignments,
//       count: assignments.length,
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// /**
//  * Get student's available problems (Student UI)
//  * GET /api/students/:studentId/available-problems?classroomId=X
//  */
// app.get('/api/students/:studentId/available-problems', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { studentId } = req.params;
//     const { classroomId } = req.query;

//     if (!classroomId) {
//       throw new ValidationError('classroomId is required');
//     }

//     // Get assignments for this classroom
//     const assignments = await repository.getAssignments(classroomId as string);

//     // Use a Map keyed by problemId to prevent duplicates across multiple assignments
//     const problemMap = new Map<string, any>();

//     for (const assignment of assignments) {
//       if (assignment.mode === 'guided') {
//         for (const problemId of assignment.problemIds) {
//           if (!problemMap.has(problemId)) {
//             const isCompleted = await repository.isProblemaCompleted(studentId, problemId);
//             problemMap.set(problemId, {
//               problemId,
//               title: (problems as any)[problemId]?.title || 'Unknown',
//               difficulty: (problems as any)[problemId]?.difficulty || 'unknown',
//               mode: 'assigned',
//               dueDate: assignment.dueDate,
//               isCompleted,
//               assignmentId: assignment.id,
//             });
//           }
//         }
//       } else if (assignment.mode === 'free') {
//         for (const problemId of Object.keys(problems)) {
//           if (!problemMap.has(problemId)) {
//             const isCompleted = await repository.isProblemaCompleted(studentId, problemId);
//             problemMap.set(problemId, {
//               problemId,
//               title: (problems as any)[problemId].title,
//               difficulty: (problems as any)[problemId].difficulty,
//               mode: 'practice',
//               dueDate: null,
//               isCompleted,
//               assignmentId: assignment.id,
//             });
//           }
//         }
//       }
//     }

//     const availableProblems = Array.from(problemMap.values());

// res.json({
//   success: true,
//   problems: availableProblems.map(p => ({  // ← RIGHT KEY!
//     id: p.problemId,
//     title: p.title,
//     difficulty: p.difficulty,
//     isCompleted: p.isCompleted,
//   })),
//   totalCount: availableProblems.length,
// });
//   } catch (error) {
//     next(error);
//   }
// });

// /**
//  * Get student progress (Student UI)
//  * GET /api/students/:studentId/progress?classroomId=X
//  */
// app.get('/api/students/:studentId/progress', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { studentId } = req.params;
//     const { classroomId } = req.query;

//     if (!classroomId) {
//       throw new ValidationError('classroomId is required');
//     }

//     const progress = await repository.getStudentProgress(studentId, classroomId as string);

//     res.json({
//       success: true,
//       studentId,
//       progress: progress.map(p => ({
//         problemId: p.problemId,
//         isCompleted: p.isCompleted,
//         bestScore: p.bestScore,
//         completedAt: p.completedAt,
//       })),
//       completedCount: progress.filter(p => p.isCompleted).length,
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// // ============================================================================
// // CODE SUBMISSION ENDPOINT
// // ============================================================================

// /**
//  * Main submission endpoint
//  * POST /api/submit
//  */
// app.post('/api/submit', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { studentId, problemId, classroomId, code } = req.body as SubmitCodeRequest;

//     // Validation
//     if (!studentId || !problemId || !classroomId || !code) {
//       throw new ValidationError('Missing required fields: studentId, problemId, classroomId, code');
//     }

//     // Get test cases from problems.json
//     const problem = (problems as any)[problemId];
//     if (!problem) {
//       throw new ValidationError(`Problem '${problemId}' not found`);
//     }

//     const testCases = problem.testCases;
//     if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
//       throw new ValidationError(`Problem '${problemId}' has no test cases`);
//     }

//     console.log(`📝 Processing submission for student ${studentId} on problem ${problemId}`);

//     const problemContext = {
//       title: problem.title,
//       description: problem.description,
//       expectedOutput: problem.testCases[0]?.expectedOutput || 'output',
//     };

//     const result = await mentor.processSubmission(
//       code,
//       testCases,
//       studentId,
//       problemId,
//       classroomId,
//       problemContext
//     );

//     // Save to database
//     console.log(`💾 Saving submission ${result.analyticsData.submissionId} to database`);
//     await repository.saveSubmission(result.analyticsData);

//     // Update analytics
//     const studentStats = await repository.getOrCreateStudentStats(studentId, problemId, classroomId);
//     studentStats.totalSubmissions += 1;
//     if (result.status === 'success') {
//       studentStats.successfulSubmissions += 1;
//     }
//     if (result.metrics.score > studentStats.bestScore) {
//       studentStats.bestScore = result.metrics.score;
//     }
//     studentStats.lastSubmittedAt = new Date();
//     await repository.updateStudentStats(studentStats);

//     // Get resource link
//     const resourceLink = getResourceLink(problem.concept);

//     const response: SubmitCodeResponse = {
//       success: true,
//       submissionId: result.analyticsData.submissionId,
//       status: result.status,
//       metrics: result.metrics,
//       studentUI: result.studentUI ? {
//         ...result.studentUI,
//         resourceLink,
//       } : null,
//       analyticsData: result.analyticsData,
//     };

//     res.json(response);
//   } catch (error) {
//     next(error);
//   }
// });

// // ============================================================================
// // DASHBOARD ENDPOINTS
// // ============================================================================

// /**
//  * Get teacher dashboard data
//  * GET /api/classroom/:classroomId/dashboard
//  */
// app.get('/api/classroom/:classroomId/dashboard', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { classroomId } = req.params;
//     const report = await repository.getClassroomReport(classroomId);

//     res.json({
//       classroomId,
//       studentStats: report.students.map(s => ({
//         studentId: s.studentId,
//         problemId: s.problemId,
//         totalSubmissions: s.totalSubmissions,
//         bestScore: s.bestScore,
//         successRate: s.totalSubmissions > 0 ? (s.successfulSubmissions / s.totalSubmissions) * 100 : 0,
//         strugglingConcepts: s.strugglingConcepts.map(c => ({
//           concept: c.concept,
//           count: c.count,
//         })),
//       })),
//       problemStats: report.problems.map(p => ({
//         problemId: p.problemId,
//         successRate: p.successRate,
//         commonErrors: p.commonErrors.map(e => ({
//           concept: e.concept,
//           count: e.count,
//         })),
//       })),
//       recentErrors: report.recentErrors.map(e => ({
//         submissionId: e.id,
//         studentId: e.studentId,
//         problemId: e.problemId,
//         status: e.status,
//         score: e.score,
//         concept: e.aiAnalysis?.concept,
//         submittedAt: e.submittedAt,
//       })),
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// /**
//  * Get student's submission history
//  * GET /api/students/:studentId/submissions
//  */
// app.get('/api/students/:studentId/submissions', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { studentId } = req.params;
//     const { problemId } = req.query;
//     const submissions = await repository.getStudentSubmissions(studentId, problemId as string | undefined);

//     res.json({
//       studentId,
//       submissions: submissions.map(s => ({
//         id: s.id,
//         problemId: s.problemId,
//         status: s.status,
//         score: s.score,
//         submittedAt: s.submittedAt,
//         aiConcept: s.aiAnalysis?.concept,
//       })),
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// /**
//  * Create a new assignment
//  * POST /api/classroom/:classroomId/assignments
//  */
// // app.post('/api/classroom/:classroomId/assignments', async (req: Request, res: Response, next: NextFunction) => {
// //   try {
// //     const { classroomId } = req.params;
// //     const { problemIds, mode, description, dueDate } = req.body;
 
// //     // Validation
// //     if (!problemIds || !Array.isArray(problemIds) || problemIds.length === 0) {
// //       throw new ValidationError('problemIds must be a non-empty array');
// //     }
// //     if (!mode || !['guided', 'free'].includes(mode)) {
// //       throw new ValidationError('mode must be "guided" or "free"');
// //     }
 
// //     const assignment: Assignment = {
// //       id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
// //       classroomId,
// //       problemIds,
// //       mode,
// //       createdBy: 'teacher_001', // TODO: Get from auth token
// //       createdAt: new Date(),
// //       description,
// //       dueDate: dueDate ? new Date(dueDate) : undefined,
// //     };
 
// //     const savedAssignment = await repository.createAssignment(assignment);
 
// //     console.log(`✅ Assignment created: ${savedAssignment.id} with ${problemIds.length} problems`);
 
// //     res.status(201).json({
// //       success: true,
// //       assignment: {
// //         id: savedAssignment.id,
// //         classroomId: savedAssignment.classroomId,
// //         problemIds: savedAssignment.problemIds,
// //         mode: savedAssignment.mode,
// //         description: savedAssignment.description,
// //         dueDate: savedAssignment.dueDate,
// //         createdAt: savedAssignment.createdAt,
// //       },
// //     });
// //   } catch (error) {
// //     next(error);
// //   }
// // });
// // ============================================================================
// // BACKEND ASSIGNMENT ENDPOINTS FIX
// // ============================================================================
// // 
// // Replace the POST and GET /api/classroom/:classroomId/assignments endpoints
// // in your server.ts with these corrected versions
// //

// /**
//  * Create a new assignment
//  * POST /api/classroom/:classroomId/assignments
//  */
// app.post('/api/classroom/:classroomId/assignments', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { classroomId } = req.params;
//     const { name, problemIds, mode, description, dueDate } = req.body; // ✅ ADD: name
 
//     // Validation
//     if (!problemIds || !Array.isArray(problemIds) || problemIds.length === 0) {
//       throw new ValidationError('problemIds must be a non-empty array');
//     }
//     if (!mode || !['guided', 'free'].includes(mode)) {
//       throw new ValidationError('mode must be "guided" or "free"');
//     }
 
//     const assignment: Assignment = {
//       id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//       name, // ✅ ADD: name field
//       classroomId,
//       problemIds,
//       mode,
//       createdBy: 'teacher_001', // TODO: Get from auth token
//       createdAt: new Date(),
//       description,
//       dueDate: dueDate ? new Date(dueDate) : undefined,
//     };
 
//     const savedAssignment = await repository.createAssignment(assignment);
 
//     console.log(`✅ Assignment created: ${savedAssignment.id} (${savedAssignment.name}) with ${problemIds.length} problems`);
 
//     res.status(201).json({
//       success: true,
//       assignment: {
//         id: savedAssignment.id,
//         name: savedAssignment.name, // ✅ ADD: return name
//         classroomId: savedAssignment.classroomId,
//         problemIds: savedAssignment.problemIds,
//         mode: savedAssignment.mode,
//         description: savedAssignment.description,
//         dueDate: savedAssignment.dueDate,
//         createdAt: savedAssignment.createdAt,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// });
 
// /**
//  * Get all assignments for a classroom
//  * GET /api/classroom/:classroomId/assignments
//  */
// app.get('/api/classroom/:classroomId/assignments', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { classroomId } = req.params;
//     const assignments = await repository.getAssignments(classroomId);
 
//     // Enrich with problem details
//     const enrichedAssignments = assignments.map(assignment => ({
//       id: assignment.id,
//       name: assignment.name, // ✅ ADD: name field
//       classroomId: assignment.classroomId,
//       problemIds: assignment.problemIds,
//       problems: assignment.problemIds.map(problemId => {
//         const problem = (problems as any)[problemId];
//         return {
//           id: problemId,
//           title: problem?.title || 'Unknown',
//           difficulty: problem?.difficulty || 'medium',
//         };
//       }),
//       mode: assignment.mode,
//       description: assignment.description,
//       dueDate: assignment.dueDate,
//       createdAt: assignment.createdAt,
//     }));
 
//     res.json({
//       success: true,
//       classroomId,
//       assignments: enrichedAssignments,
//       total: enrichedAssignments.length,
//     });
//   } catch (error) {
//     next(error);
//   }
// });
 
// /**
//  * Get all assignments for a classroom
//  * GET /api/classroom/:classroomId/assignments
//  */
// // app.get('/api/classroom/:classroomId/assignments', async (req: Request, res: Response, next: NextFunction) => {
// //   try {
// //     const { classroomId } = req.params;
// //     const assignments = await repository.getAssignments(classroomId);
 
// //     // Enrich with problem details
// //     const enrichedAssignments = assignments.map(assignment => ({
// //       id: assignment.id,
// //       classroomId: assignment.classroomId,
// //       problemIds: assignment.problemIds,
// //       problems: assignment.problemIds.map(problemId => {
// //         const problem = (problems as any)[problemId];
// //         return {
// //           id: problemId,
// //           title: problem?.title || 'Unknown',
// //           difficulty: problem?.difficulty || 'medium',
// //         };
// //       }),
// //       mode: assignment.mode,
// //       description: assignment.description,
// //       dueDate: assignment.dueDate,
// //       createdAt: assignment.createdAt,
// //     }));
 
// //     res.json({
// //       success: true,
// //       classroomId,
// //       assignments: enrichedAssignments,
// //       total: enrichedAssignments.length,
// //     });
// //   } catch (error) {
// //     next(error);
// //   }
// // });
// // ============================================================================
// // ERROR HANDLING
// // ============================================================================

// app.use((error: any, req: Request, res: Response, next: NextFunction) => {
//   console.error('❌ Error:', error);

//   if (error instanceof DebugBuddyError) {
//     return res.status(error.statusCode).json({
//       success: false,
//       error: {
//         code: error.code,
//         message: error.message,
//       },
//     });
//   }

//   res.status(500).json({
//     success: false,
//     error: {
//       code: 'INTERNAL_SERVER_ERROR',
//       message: config.environment === 'production' ? 'An error occurred' : error.message,
//     },
//   });
// });

// app.use((req: Request, res: Response) => {
//   res.status(404).json({
//     success: false,
//     error: {
//       code: 'NOT_FOUND',
//       message: `Route ${req.method} ${req.path} not found`,
//     },
//   });
// });

// // ============================================================================
// // SERVER START
// // ============================================================================

// const server = app.listen(config.port, () => {
//   console.log(`
// ╔══════════════════════════════════════════╗
// ║  🚀 DebugBuddy Server Started            ║
// ╚══════════════════════════════════════════╝
  
// Environment: ${config.environment}
// Port: ${config.port}
// Base URL: http://localhost:${config.port}

// 📌 Endpoints:
//   - GET  /health
//   - GET  /api/problems
//   - GET  /api/problems/:problemId
//   - GET  /api/resources
  
//   📚 ASSIGNMENTS:
//   - POST /api/classroom/:classroomId/assignments
//   - GET  /api/classroom/:classroomId/assignments
//   - GET  /api/students/:studentId/available-problems
//   - GET  /api/students/:studentId/progress
  
//   📤 SUBMISSION:
//   - POST /api/submit
  
//   📊 DASHBOARD:
//   - GET  /api/classroom/:classroomId/dashboard
//   - GET  /api/students/:studentId/submissions

// ✅ Ready to accept submissions!
//   `);
// });

// process.on('SIGTERM', () => {
//   console.log('SIGTERM signal received: closing HTTP server');
//   server.close(() => {
//     console.log('HTTP server closed');
//     process.exit(0);
//   });
// });

// export default app;



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

// Old duplicate POST and GET routes removed — see corrected versions below

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

    // Use a Map keyed by problemId to prevent duplicates across multiple assignments
    const problemMap = new Map<string, any>();

    for (const assignment of assignments) {
      if (assignment.mode === 'guided') {
        for (const problemId of assignment.problemIds) {
          if (!problemMap.has(problemId)) {
            const isCompleted = await repository.isProblemaCompleted(studentId, problemId);
            problemMap.set(problemId, {
              problemId,
              title: (problems as any)[problemId]?.title || 'Unknown',
              difficulty: (problems as any)[problemId]?.difficulty || 'unknown',
              mode: 'assigned',
              dueDate: assignment.dueDate,
              isCompleted,
              assignmentId: assignment.id,
            });
          }
        }
      } else if (assignment.mode === 'free') {
        for (const problemId of Object.keys(problems)) {
          if (!problemMap.has(problemId)) {
            const isCompleted = await repository.isProblemaCompleted(studentId, problemId);
            problemMap.set(problemId, {
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
    }

    const availableProblems = Array.from(problemMap.values());

res.json({
  success: true,
  problems: availableProblems.map(p => ({  // ← RIGHT KEY!
    id: p.problemId,
    title: p.title,
    difficulty: p.difficulty,
    isCompleted: p.isCompleted,
  })),
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

/**
 * Create a new assignment
 * POST /api/classroom/:classroomId/assignments
 */
// app.post('/api/classroom/:classroomId/assignments', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { classroomId } = req.params;
//     const { problemIds, mode, description, dueDate } = req.body;
 
//     // Validation
//     if (!problemIds || !Array.isArray(problemIds) || problemIds.length === 0) {
//       throw new ValidationError('problemIds must be a non-empty array');
//     }
//     if (!mode || !['guided', 'free'].includes(mode)) {
//       throw new ValidationError('mode must be "guided" or "free"');
//     }
 
//     const assignment: Assignment = {
//       id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//       classroomId,
//       problemIds,
//       mode,
//       createdBy: 'teacher_001', // TODO: Get from auth token
//       createdAt: new Date(),
//       description,
//       dueDate: dueDate ? new Date(dueDate) : undefined,
//     };
 
//     const savedAssignment = await repository.createAssignment(assignment);
 
//     console.log(`✅ Assignment created: ${savedAssignment.id} with ${problemIds.length} problems`);
 
//     res.status(201).json({
//       success: true,
//       assignment: {
//         id: savedAssignment.id,
//         classroomId: savedAssignment.classroomId,
//         problemIds: savedAssignment.problemIds,
//         mode: savedAssignment.mode,
//         description: savedAssignment.description,
//         dueDate: savedAssignment.dueDate,
//         createdAt: savedAssignment.createdAt,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// });
// ============================================================================
// BACKEND ASSIGNMENT ENDPOINTS FIX
// ============================================================================
// 
// Replace the POST and GET /api/classroom/:classroomId/assignments endpoints
// in your server.ts with these corrected versions
//

/**
 * Create a new assignment
 * POST /api/classroom/:classroomId/assignments
 */
app.post('/api/classroom/:classroomId/assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classroomId } = req.params;
    const { name, problemIds, mode, description, dueDate } = req.body; // ✅ ADD: name
 
    // Validation
    if (!mode || !['guided', 'free'].includes(mode)) {
      throw new ValidationError('mode must be "guided" or "free"');
    }
    const normalizedProblemIds: string[] = Array.isArray(problemIds) ? problemIds : [];
    if (mode === 'guided' && normalizedProblemIds.length === 0) {
      throw new ValidationError('Guided mode requires at least one problem');
    }
 
    const assignment: Assignment = {
      id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      classroomId,
      problemIds: normalizedProblemIds,
      mode,
      createdBy: 'teacher_001', // TODO: Get from auth token
      createdAt: new Date(),
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    };
 
    const savedAssignment = await repository.createAssignment(assignment);
 
    console.log(`✅ Assignment created: ${savedAssignment.id} (${savedAssignment.name || 'unnamed'}) mode=${mode} problems=${normalizedProblemIds.length}`);
 
    res.status(201).json({
      success: true,
      assignment: {
        id: savedAssignment.id,
        name: savedAssignment.name, // ✅ ADD: return name
        classroomId: savedAssignment.classroomId,
        problemIds: savedAssignment.problemIds,
        mode: savedAssignment.mode,
        description: savedAssignment.description,
        dueDate: savedAssignment.dueDate,
        createdAt: savedAssignment.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});
 
/**
 * Get all assignments for a classroom
 * GET /api/classroom/:classroomId/assignments
 */
app.get('/api/classroom/:classroomId/assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classroomId } = req.params;
    const assignments = await repository.getAssignments(classroomId);
    // Get classroom report for submission tracking
    const classroomReport = await repository.getClassroomReport(classroomId);
    const recentSubs = classroomReport.recentErrors; // all recent submissions

    // Enrich with problem details + submittedCount
    const enrichedAssignments = assignments.map(assignment => {
      // Free mode: expose all problems; Guided mode: only selected ones
      const problemList = assignment.mode === 'free'
        ? Object.entries(problems as any).map(([id, p]: any) => ({ id, title: p.title, difficulty: p.difficulty, concept: p.concept || '' }))
        : assignment.problemIds.map(problemId => {
            const problem = (problems as any)[problemId];
            return { id: problemId, title: problem?.title || 'Unknown', difficulty: problem?.difficulty || 'medium', concept: problem?.concept || '' };
          });
      // Count unique students who submitted any problem in this assignment
      const assignmentProblemIds = assignment.mode === 'free'
        ? Object.keys(problems as any)
        : assignment.problemIds;
      const uniqueStudentsSubmitted = new Set(
        recentSubs
          .filter((s: any) => assignmentProblemIds.includes(s.problemId))
          .map((s: any) => s.studentId)
      ).size;
      return {
        id: assignment.id,
        name: assignment.name,
        classroomId: assignment.classroomId,
        problemIds: assignment.problemIds,
        problems: problemList,
        mode: assignment.mode,
        description: assignment.description,
        dueDate: assignment.dueDate,
        createdAt: assignment.createdAt,
        submittedCount: uniqueStudentsSubmitted,
      };
    });
 
    res.json({
      success: true,
      classroomId,
      assignments: enrichedAssignments,
      total: enrichedAssignments.length,
    });
  } catch (error) {
    next(error);
  }
});
 
/**
 * Get all assignments for a classroom
 * GET /api/classroom/:classroomId/assignments
 */
// app.get('/api/classroom/:classroomId/assignments', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { classroomId } = req.params;
//     const assignments = await repository.getAssignments(classroomId);
 
//     // Enrich with problem details
//     const enrichedAssignments = assignments.map(assignment => ({
//       id: assignment.id,
//       classroomId: assignment.classroomId,
//       problemIds: assignment.problemIds,
//       problems: assignment.problemIds.map(problemId => {
//         const problem = (problems as any)[problemId];
//         return {
//           id: problemId,
//           title: problem?.title || 'Unknown',
//           difficulty: problem?.difficulty || 'medium',
//         };
//       }),
//       mode: assignment.mode,
//       description: assignment.description,
//       dueDate: assignment.dueDate,
//       createdAt: assignment.createdAt,
//     }));
 
//     res.json({
//       success: true,
//       classroomId,
//       assignments: enrichedAssignments,
//       total: enrichedAssignments.length,
//     });
//   } catch (error) {
//     next(error);
//   }
// });
// ============================================================================
// STUDENT DASHBOARD ENDPOINT
// ============================================================================

/**
 * Get aggregated dashboard data for a student
 * GET /api/students/:studentId/dashboard?classroomId=X
 */
app.get('/api/students/:studentId/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const { classroomId } = req.query;

    if (!classroomId) {
      throw new ValidationError('classroomId is required');
    }

    // Fetch everything in parallel
    const [submissions, progress, assignments] = await Promise.all([
      repository.getStudentSubmissions(studentId, undefined),
      repository.getStudentProgress(studentId, classroomId as string),
      repository.getAssignments(classroomId as string),
    ]);

    const totalSubmissions = submissions.length;
    const completedProblems = progress.filter(p => p.isCompleted).length;
    const totalProblems = Object.keys(problems as any).length;

    // Best scores per problem
    const bestScores: Record<string, number> = {};
    for (const s of submissions) {
      if (!bestScores[s.problemId] || s.score > bestScores[s.problemId]) {
        bestScores[s.problemId] = s.score;
      }
    }

    // Submissions per month (last 12 months)
    const monthlyActivity: Record<string, number> = {};
    for (const s of submissions) {
      const d = new Date(s.submittedAt);
      const key = d.toLocaleString('en-US', { month: 'short' });
      monthlyActivity[key] = (monthlyActivity[key] || 0) + 1;
    }
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const activityData = months.map(m => ({ month: m, submissions: monthlyActivity[m] || 0 }));

    // Recent submissions enriched with problem title
    const recentSubmissions = submissions
      .sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 10)
      .map((s: any) => ({
        id: s.id,
        problemId: s.problemId,
        problemTitle: (problems as any)[s.problemId]?.title || s.problemId,
        status: s.status,
        score: s.score,
        submittedAt: s.submittedAt,
        aiConcept: s.aiAnalysis?.concept,
      }));

    // Current streak (consecutive days with submissions)
    const submissionDays = [...new Set(
      submissions.map((s: any) => new Date(s.submittedAt).toDateString())
    )].sort().reverse();
    let streak = 0;
    let checkDate = new Date();
    for (const day of submissionDays) {
      if (new Date(day).toDateString() === checkDate.toDateString()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
    }

    res.json({
      success: true,
      studentId,
      classroomId,
      stats: {
        totalSubmissions,
        completedProblems,
        totalProblems,
        streak,
        rank: 1267, // Hardcoded — leaderboard TBD
      },
      activityData,
      recentSubmissions,
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
  
  📚 ASSIGNMENTS:
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

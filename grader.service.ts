/**
 * Grader Service
 * 
 * Responsibilities:
 * - Execute code via Wandbox API
 * - Run multiple test cases
 * - Compare expected vs actual output
 * - Determine submission status (success, compile_error, etc.)
 * - Build error context for AI analysis
 */

import { TestCase, ExecutionResult, SubmissionStatus, ValidationError, ExternalServiceError } from './types';

export class GraderService {
  private wandboxUrl = 'https://wandbox.org/api/compile.json';
  private maxCodeSize = 100000; // bytes
  private timeout = 10000; // ms

  /**
   * Run all test cases for a submission
   * Returns status, score, and details about first failure
   */
  async gradeSubmission(code: string, testCases: TestCase[]): Promise<{
    status: SubmissionStatus;
    score: number;
    passedCases: number;
    totalCases: number;
    totalRuntime: number;
    firstFailedCase: {
      testCase: TestCase;
      expected: string;
      actual: string;
      error?: string;
    } | null;
  }> {
    // Validate input
    this.validateCode(code);
    this.validateTestCases(testCases);

    let passedCount = 0;
    let totalRuntime = 0;
    let firstFailedCase = null;
    let statusType: SubmissionStatus = 'success';

    // Run each test case
    for (const testCase of testCases) {
      try {
        const result = await this.executeCode(code, testCase.input);

        totalRuntime += result.duration;

        const actualOutput = result.stdout.trim();
        const expectedOutput = testCase.expectedOutput.trim();
        const hasError = result.compilerError || result.runtimeError;

        // Check if test case passed
        if (!hasError && actualOutput === expectedOutput) {
          passedCount++;
        } else {
          // Record first failure (for AI analysis)
          if (!firstFailedCase) {
            firstFailedCase = {
              testCase,
              expected: expectedOutput,
              actual: actualOutput,
              error: result.compilerError || result.runtimeError || undefined,
            };

            // Determine error type
            if (result.compilerError) {
              statusType = 'compile_error';
            } else if (result.runtimeError) {
              statusType = 'runtime_error';
            } else {
              statusType = 'logic_error';
            }
          }

          // Stop further testing if compilation failed
          if (result.compilerError) {
            break;
          }
        }
      } catch (error) {
        console.error(`❌ Error executing test case ${testCase.id}:`, error);

        if (!firstFailedCase) {
          firstFailedCase = {
            testCase,
            expected: testCase.expectedOutput,
            actual: 'N/A',
            error: `Execution error: ${error}`,
          };
          statusType = 'runtime_error';
        }
        break;
      }
    }

    const score = Math.floor((passedCount / testCases.length) * 100);

    return {
      status: statusType,
      score,
      passedCases: passedCount,
      totalCases: testCases.length,
      totalRuntime,
      firstFailedCase,
    };
  }

  /**
   * Execute code once via Wandbox
   */
  private async executeCode(code: string, stdin: string): Promise<ExecutionResult> {
    try {
      const response = await Promise.race([
        fetch(this.wandboxUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            compiler: 'gcc-head',
            code: code,
            stdin: stdin,
            save: true,
          }),
        }),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Wandbox timeout')), this.timeout)
        ),
      ]);

      if (!response.ok) {
        throw new ExternalServiceError('Wandbox', `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        passed: !data.compiler_error && !data.program_error,
        compilerError: data.compiler_error,
        runtimeError: data.program_error,
        stdout: data.program_output || '',
        stderr: data.compiler_error || data.program_error || '',
        duration: parseFloat(data.program_duration || '0'),
      };
    } catch (error) {
      console.error('❌ Wandbox API error:', error);
      throw new ExternalServiceError('Wandbox', `${error}`);
    }
  }

  /**
   * Validate code before submission
   */
  private validateCode(code: string): void {
    if (!code || typeof code !== 'string') {
      throw new ValidationError('Code must be a non-empty string');
    }

    if (code.length === 0) {
      throw new ValidationError('Code cannot be empty');
    }

    if (Buffer.byteLength(code, 'utf8') > this.maxCodeSize) {
      throw new ValidationError(`Code exceeds maximum size of ${this.maxCodeSize} bytes`);
    }
  }

  /**
   * Validate test cases
   */
  private validateTestCases(testCases: TestCase[]): void {
    if (!Array.isArray(testCases) || testCases.length === 0) {
      throw new ValidationError('Must provide at least one test case');
    }

    for (const tc of testCases) {
      if (!tc.id || !('input' in tc) || !('expectedOutput' in tc)) {
        throw new ValidationError('Each test case must have id, input, and expectedOutput');
      }
    }
  }

  /**
   * Build error context for AI analysis
   */
  buildErrorContext(code: string, failure: any): string {
    if (failure.error) {
      // Compiler or runtime error
      return failure.error;
    } else {
      // Logic error (wrong output)
      return (
        `Logic Error:\n` +
        `Input: "${failure.testCase.input}"\n` +
        `Expected: "${failure.expected}"\n` +
        `Got: "${failure.actual}"`
      );
    }
  }
}

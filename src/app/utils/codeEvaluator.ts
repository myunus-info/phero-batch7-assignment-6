import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { ProblemType } from "../../generated/prisma/enums";

export interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface ITestResult {
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  error?: string;
  isHidden?: boolean;
}

export interface IEvaluationResult {
  scoreAwarded: number;
  status: "PASSED" | "FAILED";
  testResults?: ITestResult[];
  details?: Record<string, any>;
  executionTimeMs: number;
}

function normalizeOutput(str: string): string {
  return (str || "")
    .trim()
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n");
}

function runCodeInNode(code: string, rawInput: string, timeoutMs = 3000): { actualOutput: string; error?: string } {
  if (!code || !code.trim()) {
    return { actualOutput: "", error: "No code submitted." };
  }

  const tmpDir = os.tmpdir();
  const scriptPath = path.join(tmpDir, `devjudge_exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.js`);

  const runnerScript = `
let __rawInput = "";
const fs = require("fs");
try {
  __rawInput = fs.readFileSync(0, "utf-8");
} catch(e) {}

// Cache and intercept fs.readFileSync so candidate code can safely read stdin multiple times
const __origReadFileSync = fs.readFileSync;
fs.readFileSync = function(fd, options) {
  if (fd === 0 || fd === "/dev/stdin" || fd === "0") {
    return __rawInput;
  }
  return __origReadFileSync.call(fs, fd, options);
};

let __output = "";
const __origLog = console.log;
console.log = function(...args) {
  __output += args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ") + "\\n";
};

try {
  const input = __rawInput;
  ${code}

  // If a solution function was defined but not called, and no output was printed, call it
  if (typeof solution === "function" && __output.trim().length === 0) {
    const __fnRes = solution(__rawInput);
    if (__fnRes !== undefined && __output.trim().length === 0) {
      __output += (typeof __fnRes === "object" ? JSON.stringify(__fnRes) : String(__fnRes)) + "\\n";
    }
  }

  process.stdout.write(__output);
} catch (err) {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
}
`;

  try {
    fs.writeFileSync(scriptPath, runnerScript, "utf-8");
    const proc = spawnSync(process.execPath || "node", [scriptPath], {
      input: rawInput,
      encoding: "utf-8",
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
    });

    if (
      proc.error &&
      ((proc.error as Error & { code?: string }).code === "ETIMEDOUT" || proc.error.name === "TimeoutError")
    ) {
      return {
        actualOutput: "",
        error: "Time Limit Exceeded (Timeout)",
      };
    }

    if (proc.status !== 0) {
      const errorMsg = (proc.stderr || proc.error?.message || "Execution Error").split("\n")[0].trim();
      return {
        actualOutput: (proc.stdout || "").trim(),
        error: errorMsg,
      };
    }

    return {
      actualOutput: (proc.stdout || "").trim(),
      error: undefined,
    };
  } catch (err: any) {
    return {
      actualOutput: "",
      error: err?.message || "Execution Error",
    };
  } finally {
    try {
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
    } catch (_) {}
  }
}

export const evaluateProblemSolution = (
  problemType: ProblemType,
  totalPoints: number,
  correctAnswers: any,
  testCases: any,
  submittedData: {
    submittedCode?: string;
    selectedOptions?: string[];
  },
): IEvaluationResult => {
  const startTime = Date.now();

  // 1. Evaluate MCQ or SINGLE_CHOICE
  if (problemType === ProblemType.MCQ || problemType === ProblemType.SINGLE_CHOICE) {
    const correctArr = Array.isArray(correctAnswers) ? correctAnswers : [correctAnswers];
    const selectedArr = Array.isArray(submittedData.selectedOptions) ? submittedData.selectedOptions : [];

    const isMatch =
      correctArr.length === selectedArr.length && correctArr.every((val: string) => selectedArr.includes(val));

    const score = isMatch ? totalPoints : 0;
    const executionTimeMs = Date.now() - startTime;

    return {
      scoreAwarded: score,
      status: isMatch ? "PASSED" : "FAILED",
      details: {
        totalOptions: correctArr.length,
        selectedCount: selectedArr.length,
        correct: isMatch,
      },
      executionTimeMs,
    };
  }

  // 2. Evaluate CODING problem using Node.js runtime against test cases
  const tests: ITestCase[] = Array.isArray(testCases) ? testCases : [];
  if (tests.length === 0) {
    return {
      scoreAwarded: totalPoints,
      status: "PASSED",
      testResults: [],
      executionTimeMs: Date.now() - startTime,
    };
  }

  const testResults: ITestResult[] = [];
  let passedCount = 0;
  const code = submittedData.submittedCode || "";

  for (const tc of tests) {
    const rawInput = tc.input || "";
    const expectedOutput = tc.expectedOutput || "";

    const execResult = runCodeInNode(code, rawInput, 3000);

    const actualNormalized = normalizeOutput(execResult.actualOutput);
    const expectedNormalized = normalizeOutput(expectedOutput);

    const passed = !execResult.error && actualNormalized === expectedNormalized;

    if (passed) {
      passedCount++;
    }

    testResults.push({
      passed,
      input: tc.isHidden ? "[HIDDEN]" : rawInput,
      expectedOutput: tc.isHidden ? "[HIDDEN]" : expectedOutput,
      actualOutput: tc.isHidden
        ? "[HIDDEN]"
        : execResult.error
          ? execResult.error
          : execResult.actualOutput || "(Empty Output)",
      error: execResult.error,
      isHidden: tc.isHidden || false,
    });
  }

  const fractionPassed = passedCount / tests.length;
  const scoreAwarded = Math.round(fractionPassed * totalPoints);
  const status = fractionPassed === 1 ? "PASSED" : "FAILED";
  const executionTimeMs = Date.now() - startTime;

  return {
    scoreAwarded,
    status,
    testResults,
    details: {
      totalTests: tests.length,
      passedTests: passedCount,
    },
    executionTimeMs,
  };
};

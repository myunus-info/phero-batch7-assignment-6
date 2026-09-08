import { CandidateAssessmentStatus, SubmissionStatus } from '../../../generated/prisma/enums';
import ApiError from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { logAuditEvent } from '../../utils/auditLogger';
import { evaluateProblemSolution } from '../../utils/codeEvaluator';
import { ISubmitProblemSolutionRequest } from './attempt.interface';
import httpStatus from 'http-status';

const getMyCandidateAssessments = async (candidateId: string, candidateEmail: string) => {
  const invitations = await prisma.assessmentCandidate.findMany({
    where: {
      OR: [{ candidateId }, { candidateEmail: candidateEmail.toLowerCase() }],
    },
    include: {
      assessment: {
        select: {
          id: true,
          title: true,
          description: true,
          durationMinutes: true,
          totalMarks: true,
          passingMarks: true,
          scheduleStart: true,
          scheduleEnd: true,
          recruiter: {
            select: {
              name: true,
              recruiterProfile: {
                select: { companyName: true },
              },
            },
          },
          _count: {
            select: { problems: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (invitations.length < 1) throw new ApiError(httpStatus.NOT_FOUND, 'No invitation found');

  return invitations;
};

const startAssessmentAttempt = async (
  assessmentId: string,
  candidateId: string,
  candidateEmail: string,
  ipAddress?: string,
) => {
  const candidateAssessment = await prisma.assessmentCandidate.findFirst({
    where: {
      assessmentId,
      OR: [{ candidateId }, { candidateEmail: candidateEmail.toLowerCase() }],
    },
    include: {
      assessment: {
        include: {
          problems: {
            orderBy: { orderIndex: 'asc' },
            include: {
              problem: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  description: true,
                  difficulty: true,
                  problemType: true,
                  points: true,
                  timeLimitSeconds: true,
                  starterCode: true,
                  mcqOptions: true,
                  testCases: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!candidateAssessment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'You are not invited or registered for this assessment.');
  }

  if (candidateAssessment.status === CandidateAssessmentStatus.COMPLETED) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You have already submitted and completed this assessment.');
  }

  // Check schedule constraints
  const now = new Date();
  if (candidateAssessment.assessment.scheduleStart && now < candidateAssessment.assessment.scheduleStart) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Assessment has not started yet according to schedule.');
  }

  if (candidateAssessment.assessment.scheduleEnd && now > candidateAssessment.assessment.scheduleEnd) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Assessment window has expired.');
  }

  // Update status to IN_PROGRESS if not already started
  const updatedAttempt = await prisma.assessmentCandidate.update({
    where: { id: candidateAssessment.id },
    data: {
      candidateId, // Link candidateId if it was invited via email alone
      status: CandidateAssessmentStatus.IN_PROGRESS,
      startedAt: candidateAssessment.startedAt || new Date(),
    },
    include: {
      assessment: {
        select: {
          id: true,
          title: true,
          durationMinutes: true,
          totalMarks: true,
        },
      },
    },
  });

  await logAuditEvent({
    userId: candidateId,
    action: 'START_ASSESSMENT',
    entityType: 'AssessmentCandidate',
    entityId: updatedAttempt.id,
    details: { assessmentId, startedAt: updatedAttempt.startedAt },
    ipAddress,
  });

  // Sanitize test cases to hide secrets/hidden test cases from candidate
  const problems = candidateAssessment.assessment.problems.map(ap => {
    const visibleTests = Array.isArray(ap.problem.testCases)
      ? (ap.problem.testCases as any[]).filter(tc => !tc.isHidden)
      : [];

    return {
      orderIndex: ap.orderIndex,
      points: ap.customPoints || ap.problem.points,
      problem: {
        id: ap.problem.id,
        title: ap.problem.title,
        slug: ap.problem.slug,
        description: ap.problem.description,
        difficulty: ap.problem.difficulty,
        problemType: ap.problem.problemType,
        starterCode: ap.problem.starterCode,
        mcqOptions: ap.problem.mcqOptions,
        testCases: visibleTests,
      },
    };
  });

  return {
    attemptId: updatedAttempt.id,
    assessmentId: updatedAttempt.assessmentId,
    title: candidateAssessment.assessment.title,
    durationMinutes: candidateAssessment.assessment.durationMinutes,
    startedAt: updatedAttempt.startedAt,
    problems,
  };
};

const submitProblemSolution = async (
  assessmentId: string,
  candidateId: string,
  candidateEmail: string,
  payload: ISubmitProblemSolutionRequest,
  ipAddress?: string,
) => {
  const candidateAssessment = await prisma.assessmentCandidate.findFirst({
    where: {
      assessmentId,
      OR: [{ candidateId }, { candidateEmail: candidateEmail.toLowerCase() }],
    },
  });

  if (!candidateAssessment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assessment session not found.');
  }

  if (candidateAssessment.status === CandidateAssessmentStatus.COMPLETED) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Assessment has already been completed. No further submissions allowed.',
    );
  }

  // Fetch problem and assessment custom points
  const assessmentProblem = await prisma.assessmentProblem.findUnique({
    where: {
      assessmentId_problemId: {
        assessmentId,
        problemId: payload.problemId,
      },
    },
    include: {
      problem: true,
    },
  });

  if (!assessmentProblem) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Problem does not belong to this assessment.');
  }

  const problem = assessmentProblem.problem;
  const problemPoints = assessmentProblem.customPoints || problem.points;

  // Run evaluator
  const evalResult = evaluateProblemSolution(
    problem.problemType,
    problemPoints,
    problem.correctAnswers,
    problem.testCases,
    {
      submittedCode: payload.submittedCode,
      selectedOptions: payload.selectedOptions,
    },
  );

  // Check if existing submission for this problem
  const existingSubmission = await prisma.submission.findFirst({
    where: {
      assessmentCandidateId: candidateAssessment.id,
      problemId: payload.problemId,
    },
  });

  let submission;
  if (existingSubmission) {
    submission = await prisma.submission.update({
      where: { id: existingSubmission.id },
      data: {
        submittedCode: payload.submittedCode || null,
        selectedOptions: payload.selectedOptions || undefined,
        executionResult: evalResult.testResults ? (evalResult.testResults as any) : evalResult.details,
        scoreAwarded: evalResult.scoreAwarded,
        status: evalResult.status === 'PASSED' ? SubmissionStatus.PASSED : SubmissionStatus.FAILED,
        executionTimeMs: evalResult.executionTimeMs,
      },
    });
  } else {
    submission = await prisma.submission.create({
      data: {
        assessmentCandidateId: candidateAssessment.id,
        problemId: payload.problemId,
        candidateId,
        submittedCode: payload.submittedCode || null,
        selectedOptions: payload.selectedOptions || undefined,
        executionResult: evalResult.testResults ? (evalResult.testResults as any) : evalResult.details,
        scoreAwarded: evalResult.scoreAwarded,
        status: evalResult.status === 'PASSED' ? SubmissionStatus.PASSED : SubmissionStatus.FAILED,
        executionTimeMs: evalResult.executionTimeMs,
      },
    });
  }

  await logAuditEvent({
    userId: candidateId,
    action: 'SUBMIT_PROBLEM',
    entityType: 'Submission',
    entityId: submission.id,
    details: {
      problemId: payload.problemId,
      scoreAwarded: evalResult.scoreAwarded,
      status: evalResult.status,
    },
    ipAddress,
  });

  return {
    submissionId: submission.id,
    problemId: payload.problemId,
    scoreAwarded: evalResult.scoreAwarded,
    maxPoints: problemPoints,
    status: evalResult.status,
    testResults: evalResult.testResults,
  };
};

const finishAssessment = async (
  assessmentId: string,
  candidateId: string,
  candidateEmail: string,
  ipAddress?: string,
) => {
  const candidateAssessment = await prisma.assessmentCandidate.findFirst({
    where: {
      assessmentId,
      OR: [{ candidateId }, { candidateEmail: candidateEmail.toLowerCase() }],
    },
    include: {
      assessment: true,
      submissions: true,
    },
  });

  if (!candidateAssessment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assessment session not found.');
  }

  if (candidateAssessment.status === CandidateAssessmentStatus.COMPLETED) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Assessment is already submitted and finished.');
  }

  // Calculate total score from all submissions
  const totalScore = candidateAssessment.submissions.reduce((sum, sub) => sum + sub.scoreAwarded, 0);

  const isPassed = totalScore >= candidateAssessment.assessment.passingMarks;

  const finishedAttempt = await prisma.assessmentCandidate.update({
    where: { id: candidateAssessment.id },
    data: {
      status: CandidateAssessmentStatus.COMPLETED,
      totalScore,
      isPassed,
      submittedAt: new Date(),
    },
    include: {
      assessment: {
        select: {
          title: true,
          totalMarks: true,
          passingMarks: true,
        },
      },
    },
  });

  await logAuditEvent({
    userId: candidateId,
    action: 'FINISH_ASSESSMENT',
    entityType: 'AssessmentCandidate',
    entityId: finishedAttempt.id,
    details: {
      assessmentId,
      totalScore,
      isPassed,
      submittedAt: finishedAttempt.submittedAt,
    },
    ipAddress,
  });

  return {
    attemptId: finishedAttempt.id,
    assessmentTitle: finishedAttempt.assessment.title,
    totalScore: finishedAttempt.totalScore,
    totalMarks: finishedAttempt.assessment.totalMarks,
    passingMarks: finishedAttempt.assessment.passingMarks,
    isPassed: finishedAttempt.isPassed,
    status: finishedAttempt.status,
    submittedAt: finishedAttempt.submittedAt,
  };
};

const getAssessmentResult = async (assessmentId: string, userId: string, candidateEmail?: string) => {
  const result = await prisma.assessmentCandidate.findFirst({
    where: {
      assessmentId,
      OR: [{ candidateId: userId }, { candidateEmail: candidateEmail?.toLowerCase() }],
    },
    include: {
      assessment: {
        select: {
          id: true,
          title: true,
          description: true,
          totalMarks: true,
          passingMarks: true,
          durationMinutes: true,
        },
      },
      submissions: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              problemType: true,
              points: true,
            },
          },
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assessment result not found.');
  }

  return result;
};

export const AttemptService = {
  getMyCandidateAssessments,
  startAssessmentAttempt,
  submitProblemSolution,
  finishAssessment,
  getAssessmentResult,
};

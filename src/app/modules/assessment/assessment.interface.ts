import type { AssessmentStatus } from "../../../generated/prisma/enums";

export interface IAssessmentFilterRequest {
  searchTerm?: string;
  status?: AssessmentStatus;
  recruiterId?: string;
}

export interface ICreateAssessmentRequest {
  title: string;
  description?: string;
  durationMinutes: number;
  totalMarks?: number;
  passingMarks: number;
  scheduleStart?: string;
  scheduleEnd?: string;
  status?: AssessmentStatus;
  problemIds: Array<
    | string
    | {
        problemId: string;
        orderIndex?: number;
        customPoints?: number;
      }
  >;
}

export interface IInviteCandidateRequest {
  email: string;
  candidateId?: string;
}

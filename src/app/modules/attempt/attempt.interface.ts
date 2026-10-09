export interface ISubmitProblemSolutionRequest {
  problemId: string;
  submittedCode?: string;
  code?: string;
  language?: string;
  selectedOptions?: string[];
  selectedOptionId?: string;
}

export interface IAttemptFilterRequest {
  status?: string;
}

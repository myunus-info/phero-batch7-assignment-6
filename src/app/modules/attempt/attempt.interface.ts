export interface ISubmitProblemSolutionRequest {
  problemId: string;
  submittedCode?: string;
  selectedOptions?: string[];
}

export interface IAttemptFilterRequest {
  status?: string;
}

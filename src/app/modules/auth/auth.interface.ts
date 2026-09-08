import { UserRole } from '../../../generated/prisma/enums';

export interface IRegisterUserRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  companyName?: string;
  companyWebsite?: string;
  headline?: string;
  skills?: string[];
}

export interface ILoginUserRequest {
  email: string;
  password: string;
}

export interface IGoogleLoginRequest {
  idToken: string;
  role?: UserRole;
}

export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string | null;
  };
}

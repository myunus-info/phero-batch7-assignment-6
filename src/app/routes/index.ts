import express from 'express';
import { AuthRoutes } from '../modules/auth/auth.routes';
// import { UserRoutes } from '../modules/user/user.routes';
// import { ProblemRoutes } from '../modules/problem/problem.routes';
// import { AssessmentRoutes } from '../modules/assessment/assessment.routes';
// import { AttemptRoutes } from '../modules/attempt/attempt.routes';
// import { PaymentRoutes } from '../modules/payment/payment.routes';
import { AdminRoutes } from '../modules/admin/admin.routes';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  // {
  //   path: '/users',
  //   route: UserRoutes,
  // },
  // {
  //   path: '/problems',
  //   route: ProblemRoutes,
  // },
  // {
  //   path: '/assessments',
  //   route: AssessmentRoutes,
  // },
  // {
  //   path: '/attempts',
  //   route: AttemptRoutes,
  // },
  // {
  //   path: '/payments',
  //   route: PaymentRoutes,
  // },
  {
    path: '/admin',
    route: AdminRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;

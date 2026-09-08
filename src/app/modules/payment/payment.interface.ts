export type CreditPlanKey = "STARTER_PACK" | "PRO_PACK" | "ENTERPRISE_PACK";

export interface ICreditPlan {
	name: CreditPlanKey;
	title: string;
	credits: number;
	amount: number; // in USD
	description: string;
}

export const CREDIT_PLANS: Record<CreditPlanKey, ICreditPlan> = {
	STARTER_PACK: {
		name: "STARTER_PACK",
		title: "Starter Credit Pack",
		credits: 25,
		amount: 29.0,
		description: "25 Assessment candidate invitations",
	},
	PRO_PACK: {
		name: "PRO_PACK",
		title: "Pro Recruiter Pack",
		credits: 75,
		amount: 79.0,
		description: "75 Assessment candidate invitations with priority evaluation",
	},
	ENTERPRISE_PACK: {
		name: "ENTERPRISE_PACK",
		title: "Enterprise Scale Pack",
		credits: 250,
		amount: 199.0,
		description: "250 Assessment invitations with custom problem hosting",
	},
};

export interface ICreateCheckoutSessionRequest {
	planName: CreditPlanKey;
}

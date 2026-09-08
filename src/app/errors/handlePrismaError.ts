import { Prisma } from "../../generated/prisma/client";
import type { IGenericErrorMessage, IGenericErrorResponse } from "./handleZodError";

const handlePrismaError = (
	error:
		| Prisma.PrismaClientKnownRequestError
		| Prisma.PrismaClientValidationError,
): IGenericErrorResponse => {
	let errors: IGenericErrorMessage[] = [];
	let statusCode = 400;
	let message = "Database Error";

	if (error instanceof Prisma.PrismaClientValidationError) {
		statusCode = 400;
		message = "Validation Error in database query";
		errors = [{ path: "", message: error.message }];
	} else if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.code === "P2002") {
			statusCode = 409;
			const target = (error.meta?.target as string[]) || ["field"];
			message = `Duplicate key violation: ${target.join(", ")} already exists`;
			errors = target.map((field) => ({
				path: field,
				message: `${field} already exists and must be unique`,
			}));
		} else if (error.code === "P2025") {
			statusCode = 404;
			message = (error.meta?.cause as string) || "Record not found";
			errors = [{ path: "", message }];
		} else if (error.code === "P2003") {
			statusCode = 400;
			message = "Foreign key constraint failed";
			errors = [{ path: "", message: "Related record was not found" }];
		} else {
			statusCode = 400;
			message = error.message;
			errors = [{ path: "", message: error.message }];
		}
	}

	return {
		statusCode,
		message,
		errorMessages: errors,
	};
};

export default handlePrismaError;

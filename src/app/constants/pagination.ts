export const paginationFields = ["page", "limit", "sortBy", "sortOrder"];

export interface IPaginationOptions {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface IGenericResponse<T> {
	meta?: {
		page: number;
		limit: number;
		total: number;
		totalPage: number;
	};
	data: T;
}

export const calculatePagination = (options: IPaginationOptions) => {
	const page = Number(options.page || 1);
	const limit = Number(options.limit || 10);
	const skip = (page - 1) * limit;

	const sortBy = options.sortBy || "createdAt";
	const sortOrder = options.sortOrder === "asc" ? "asc" : "desc";

	return {
		page,
		limit,
		skip,
		sortBy,
		sortOrder,
	};
};

import type { ApiError } from '@scrajo/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

function getErrorCode(error: Error): string | undefined {
	return 'code' in error ? (error as { code: string }).code : undefined;
}

export function errorHandler(error: Error, _request: FastifyRequest, reply: FastifyReply) {
	if (error instanceof ZodError) {
		const body: ApiError = {
			error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
			code: 'VALIDATION_ERROR',
			statusCode: 400,
		};
		return reply.status(400).send(body);
	}

	const code = getErrorCode(error);
	if (code === 'P2025') {
		const body: ApiError = {
			error: 'Resource not found',
			code: 'NOT_FOUND',
			statusCode: 404,
		};
		return reply.status(404).send(body);
	}

	if (code === 'P2002') {
		const body: ApiError = {
			error: 'Resource already exists',
			code: 'CONFLICT',
			statusCode: 409,
		};
		return reply.status(409).send(body);
	}

	if ('statusCode' in error && typeof error.statusCode === 'number') {
		const body: ApiError = {
			error: error.message,
			code: 'VALIDATION_ERROR',
			statusCode: error.statusCode,
		};
		return reply.status(error.statusCode).send(body);
	}

	_request.log.error(error);
	const body: ApiError = {
		error: 'Internal server error',
		code: 'INTERNAL_ERROR',
		statusCode: 500,
	};
	return reply.status(500).send(body);
}

export function notFoundHandler(_request: FastifyRequest, reply: FastifyReply) {
	const body: ApiError = {
		error: 'Not found',
		code: 'NOT_FOUND',
		statusCode: 404,
	};
	return reply.status(404).send(body);
}

export function sendError(reply: FastifyReply, statusCode: number, error: string, code: string) {
	const body: ApiError = { error, code, statusCode };
	return reply.status(statusCode).send(body);
}

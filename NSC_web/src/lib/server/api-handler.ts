import { NextRequest, NextResponse } from "next/server";

class JsonError extends Error {
    public status: number;
    public extra?: Record<string, unknown>;
    constructor(error: string, status: number, extra?: Record<string, unknown>) {
        super(error);
        this.status = status;
        this.extra = extra;
    }
}

export function withApiHandler(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
    return async (req: NextRequest, ...args: any[]) => {
        try {
            return await handler(req, ...args);
        } catch (error) {
            if (error instanceof JsonError) {
                return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status });
            }
            console.error('Unhandled API Error:', error);
            return NextResponse.json({ error: 'Internal server error'}, { status: 500 });
        }
    }
};
import { NextRequest, NextResponse } from 'next/server'

/**
 * Wraps an API route handler with try/catch error handling.
 * Prevents unhandled rejections from causing Vercel function timeouts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apiHandler(fn: (...args: any[]) => Promise<Response>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (...args: any[]): Promise<Response> => {
    try {
      return await fn(...args)
    } catch (error) {
      const req = args[0] as NextRequest
      const method = req?.method ?? 'UNKNOWN'
      const path = req?.nextUrl?.pathname ?? 'unknown'
      console.error(`[API Error] ${method} ${path}:`, error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Standardized API response format
 * Tüm API route'larında tutarlı response formatı için
 */

import { NextResponse } from 'next/server'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  count?: number
}

export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200,
  count?: number
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  }

  if (message) {
    response.message = message
  }

  if (count !== undefined) {
    response.count = count
  }

  return NextResponse.json(response, { status })
}

export function errorResponse(
  error: string,
  message?: string,
  status: number = 500
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error,
  }

  if (message) {
    response.message = message
  }

  return NextResponse.json(response, { status })
}

export function unauthorizedResponse(message: string = 'Yetkisiz erişim'): NextResponse<ApiResponse> {
  return errorResponse('Unauthorized', message, 401)
}

export function notFoundResponse(message: string = 'Kayıt bulunamadı'): NextResponse<ApiResponse> {
  return errorResponse('Not Found', message, 404)
}

export function badRequestResponse(message: string = 'Geçersiz istek'): NextResponse<ApiResponse> {
  return errorResponse('Bad Request', message, 400)
}

export function validationErrorResponse(
  errors: string | string[]
): NextResponse<ApiResponse> {
  const errorMessage = Array.isArray(errors) ? errors.join(', ') : errors
  return errorResponse('Validation Error', errorMessage, 400)
}



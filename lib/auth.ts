import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

export interface AuthUser {
  userId: string
  email: string
  role: 'admin' | 'editor'
}

export function verifyToken(request: NextRequest): AuthUser | null {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    
    // Role validation
    if (!decoded.role || (decoded.role !== 'admin' && decoded.role !== 'editor')) {
      return null
    }
    
    return decoded
  } catch (error) {
    return null
  }
}

export async function verifyAdmin(request: NextRequest): Promise<AuthUser | null> {
  const decoded = verifyToken(request)
  if (!decoded || decoded.role !== 'admin') {
    return null
  }
  
  // Ekstra güvenlik: Veritabanında kullanıcının hala admin olduğunu kontrol et
  try {
    await connectDB()
    const user = await User.findById(decoded.userId)
    if (!user || user.role !== 'admin') {
      return null
    }
  } catch (error) {
    // Veritabanı hatası durumunda token'ı geçersiz say
    return null
  }
  
  return decoded
}

export function unauthorizedResponse(message: string = 'Bu işlem için admin yetkisi gereklidir.') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  )
}

export function forbiddenResponse(message: string = 'Bu işlem için yeterli yetkiniz yok.') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  )
}




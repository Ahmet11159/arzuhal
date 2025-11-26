import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyAdmin(request)
    
    if (!decoded) {
      return NextResponse.json(
        { valid: false, error: 'Geçersiz veya süresi dolmuş token' },
        { status: 401 }
      )
    }

    return NextResponse.json({ 
      valid: true, 
      user: { 
        email: decoded.email, 
        role: decoded.role 
      } 
    })
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error.message || 'Token doğrulama hatası' },
      { status: 500 }
    )
  }
}



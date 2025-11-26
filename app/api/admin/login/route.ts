import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

// Basit rate limiting (memory-based, production'da Redis kullanılmalı)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 dakika

function checkRateLimit(identifier: string): { allowed: boolean; remainingTime?: number } {
  const attempts = loginAttempts.get(identifier)
  
  if (!attempts) {
    return { allowed: true }
  }

  const timeSinceLastAttempt = Date.now() - attempts.lastAttempt

  if (attempts.count >= MAX_ATTEMPTS) {
    if (timeSinceLastAttempt < LOCKOUT_DURATION) {
      return { 
        allowed: false, 
        remainingTime: Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 1000 / 60) 
      }
    } else {
      // Lockout süresi doldu, sıfırla
      loginAttempts.delete(identifier)
      return { allowed: true }
    }
  }

  return { allowed: true }
}

function recordFailedAttempt(identifier: string) {
  const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 }
  attempts.count += 1
  attempts.lastAttempt = Date.now()
  loginAttempts.set(identifier, attempts)
}

function clearAttempts(identifier: string) {
  loginAttempts.delete(identifier)
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-posta ve şifre gereklidir' },
        { status: 400 }
      )
    }

    // Rate limiting kontrolü
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const identifier = `${email}-${clientIp}`
    
    const rateLimitCheck = checkRateLimit(identifier)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: `Çok fazla başarısız giriş denemesi. Lütfen ${rateLimitCheck.remainingTime} dakika sonra tekrar deneyin.` 
        },
        { status: 429 }
      )
    }

    // Şifre uzunluk kontrolü (minimum güvenlik)
    if (password.length < 6) {
      recordFailedAttempt(identifier)
      return NextResponse.json(
        { error: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      )
    }

    const user = await User.findOne({ email })
    if (!user) {
      recordFailedAttempt(identifier)
      // Güvenlik için aynı mesajı döndür (timing attack koruması)
      await bcrypt.compare(password, '$2a$10$dummyHashForTimingProtection')
      return NextResponse.json(
        { error: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      )
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      recordFailedAttempt(identifier)
      return NextResponse.json(
        { error: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      )
    }

    // Başarılı giriş - attempt'leri temizle
    clearAttempts(identifier)

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return NextResponse.json({ token, user: { email: user.email, role: user.role } })
  } catch (error: any) {
    console.error('Login error:', error)
    
    // MongoDB bağlantı hatası
    if (error.name === 'MongooseServerSelectionError' || error.message?.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { 
          error: 'Veritabanı bağlantısı kurulamadı. Lütfen MongoDB\'nin çalıştığından emin olun veya admin kullanıcısını oluşturun: npm run create:admin' 
        },
        { status: 503 }
      )
    }
    
    // Genel hata
    return NextResponse.json(
      { error: error.message || 'Giriş sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}


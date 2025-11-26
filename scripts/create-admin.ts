/**
 * İlk admin kullanıcısını oluşturur
 * 
 * Kullanım:
 * npm run create:admin
 * 
 * Varsayılan bilgiler:
 * Email: admin@arzuhal.com
 * Password: admin123
 */

// .env.local dosyasını yükle
require('dotenv').config({ path: '.env.local' })

const connectDBFn = require('../lib/mongodb').default
const User = require('../models/User').default
const bcrypt = require('bcryptjs')

async function createAdmin() {
  try {
    await connectDBFn()
    
    const email = process.env.ADMIN_EMAIL || 'admin@arzuhal.com'
    const password = process.env.ADMIN_PASSWORD || 'admin123'
    
    // Kullanıcı zaten var mı kontrol et
    const existing = await User.findOne({ email })
    if (existing) {
      console.log('⚠ Admin kullanıcısı zaten mevcut!')
      console.log(`Email: ${email}`)
      console.log('Şifreyi değiştirmek için mevcut kullanıcıyı silip tekrar oluşturun.')
      process.exit(0)
    }
    
    // Şifre güçlülük kontrolü
    if (password.length < 8) {
      console.error('❌ Şifre en az 8 karakter olmalıdır!')
      process.exit(1)
    }

    // Şifreyi hash'le (salt rounds: 12 - daha güvenli)
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Admin kullanıcısını oluştur
    const admin = new User({
      email,
      password: hashedPassword,
      role: 'admin',
    })
    
    await admin.save()
    
    console.log('✅ Admin kullanıcısı başarıyla oluşturuldu!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 Email:', email)
    console.log('🔑 Şifre:', password)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚠️  ÖNEMLİ: Bu bilgileri güvenli bir yerde saklayın!')
    console.log('⚠️  İlk girişten sonra şifrenizi değiştirmeniz önerilir.')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

createAdmin()


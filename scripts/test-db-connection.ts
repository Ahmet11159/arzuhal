require('dotenv').config({ path: '.env.local' })

const mongoose = require('mongoose')

async function testConnection() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable bulunamadı!')
      process.exit(1)
    }
    
    console.log('🔄 MongoDB bağlantısı test ediliyor...')
    console.log('📍 URI:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')) // Şifreyi gizle
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    
    console.log('✅ MongoDB bağlantısı başarılı!')
    
    // Veritabanı adını göster
    const dbName = mongoose.connection.db.databaseName
    console.log(`📊 Veritabanı: ${dbName}`)
    
    // Koleksiyonları listele
    const collections = await mongoose.connection.db.listCollections().toArray()
    console.log(`📁 Koleksiyonlar (${collections.length}):`)
    collections.forEach((col: any) => {
      console.log(`   - ${col.name}`)
    })
    
    await mongoose.disconnect()
    console.log('✅ Bağlantı kapatıldı')
    process.exit(0)
  } catch (error: any) {
    console.error('❌ MongoDB bağlantı hatası:')
    console.error('   Mesaj:', error.message)
    
    if (error.name === 'MongooseServerSelectionError') {
      console.error('\n💡 Olası nedenler:')
      console.error('   1. MongoDB Atlas cluster\'ı durmuş olabilir')
      console.error('   2. IP adresi whitelist\'te olmayabilir')
      console.error('   3. Kullanıcı adı/şifre yanlış olabilir')
      console.error('   4. Network bağlantı sorunu olabilir')
    }
    
    process.exit(1)
  }
}

testConnection()





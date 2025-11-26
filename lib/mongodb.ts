import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null }

if (!global.mongooseCache) {
  global.mongooseCache = cached
}

async function connectDB() {
  // Eğer bağlantı varsa ve bağlıysa, onu kullan
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn
  }

  // Eğer bağlantı varsa ama kopmuşsa, cache'i temizle
  if (cached.conn && mongoose.connection.readyState !== 1) {
    cached.conn = null
    cached.promise = null
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 saniye timeout
      socketTimeoutMS: 45000,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    }).catch((error) => {
      // Hata durumunda cache'i temizle
      cached.promise = null
      throw error
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    cached.conn = null
    throw e
  }

  return cached.conn
}

export default connectDB


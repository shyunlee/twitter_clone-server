import dotenv from 'dotenv'
dotenv.config()

function required (key, defaultValue = undefined) {
    const value = process.env[key] || defaultValue
    if (value == null) {
        throw new Error(`Key (${key}) is undefined`)
    }
    return value
}

export const config = {
    jwt:{
        secret: required('JWT_SECRET'),
        expiredInSec : parseInt(required('JWT_EXPIRES_SEC', 86400)),
    },
    bcrypt:{
        saltRounds : parseInt(required('BCRYPT_SALT_ROUNDS', 12))
    },
    host:{
        port: parseInt(required('HOST_PORT', 8080))
    },
    db: {
        user: required('DB_USER', 'root'),
        password: required('DB_PASSWORD'),
        database: required('DB_DATABASE'),
        host: required('DB_HOST', 'localhost'),
        port: parseInt(required('DB_PORT', 3306)),
    },
    cors:{
        allowedOrigin: required('CORS_ALLOW_ORIGIN')
    },
    csrf:{
        plainToken: required('CSRF_SECRET_KEY')
    },
    rateLimit:{
        windowMs: 60000,
        maxRequest: 100
    }
}
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { findById } from '../data/auth.js'

export async function isAuth (req, res, next) {
    const auth = req.get('Authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(404).json({message: 'invalid token'})
    }
    const token = auth.split(' ')[1]
    jwt.verify(token, config.jwt.accessSecret, async (err, decoded) => {
        if (err) {
            return res.status(401).json({message: 'Authentication Error1'})
        }
        const userFound = await findById(decoded.id)
        if (!userFound) {
            return res.status(401).json({message: 'Authentication Error2'})
        }
        req.userId = userFound.id
        req.token = token
        next()
    })
}
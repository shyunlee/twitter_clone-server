import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { findById } from '../data/auth.js'

export async function isAuth (req, res, next) {
    let token;
    const auth = req.get('Authorization')
    if (auth && auth.startsWith('Bearer ')) {
        token = auth.split(' ')[1]
    }
    if (!token) {
        token = req.cookies['token']
    }
    if (!token) {
        return res.status(404).json({message: 'invalid token'})
    }
    
    jwt.verify(token, config.jwt.secret, async (err, decoded) => {
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
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import * as authRepo from '../data/auth.js'
import { config } from '../config.js'

export const signup = async (req, res) => {
    const {username, password} = req.body
    const isRegistered = await authRepo.findByUsername(username)
    if (isRegistered) {
        return res.status(400).json({message:'user already registered'})
    }
    let hashed = await bcrypt.hash(password, config.bcrypt.saltRounds)
    const newUserInfo = {
        ...req.body,
        password: hashed,
    }
    const userId = await authRepo.createUser(newUserInfo)
    const token = createJwtToken(userId)
    setToken(res, token)
    res.status(201).json({token, userId, username})
// }
}

export const login = async (req, res) => {
    const {username, password} = req.body
    const userFound = await authRepo.findByUsername(username)
    if (userFound) {
        const isMatched = await bcrypt.compare(password, userFound.password)
        if (isMatched) {
            const token = createJwtToken(userFound.id)
            const userId = userFound.id
            setToken(res, token)
            return res.status(200).json({token, userId, username})
        }
    }
    res.status(401).json({message:'login failed'})
}

export const logout = async (req, res) => {
    res.cookie('token', '')
    res.status(200).json({message:'User has been logged out'})
}

export const me = async (req, res) => {
    const userFound = await authRepo.findById(req.userId)
    if (!userFound) {
        return res.status(404).json({message: 'User not found'})
    }
    res.status(200).json({username:userFound.username, userId:userFound.id, token:req.token})
}

export const csrfToken = async (req, res) => {
    const csrfToken = await generateCSRFToken()
    res.status(200).json({csrfToken})
}

function createJwtToken (id) {
    return jwt.sign({id}, config.jwt.secret, {expiresIn: config.jwt.expiredInSec})
}

function setToken(res, token) {
    const options = {
        maxAge: config.jwt.expiredInSec * 1000,
        httpOnly: true,
        sameSite: 'none',
        secure: true
    }
    res.cookie('token', token, options)
}

const generateCSRFToken = async () => {
    return bcrypt.hash(config.csrf.plainToken, 1)
}
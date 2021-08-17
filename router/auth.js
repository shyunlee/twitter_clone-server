import express from 'express'
import * as authController from '../controller/auth.js'
import { body } from 'express-validator'
import { validate } from '../middleware/validator.js'
import { isAuth } from '../middleware/auth.js'

const router = express.Router()

const validateCredential = [
    body('username')
        .trim()
        .notEmpty()
        .isLength({min:3})
        .withMessage('username should be at least 5 characters'),
    body('password')
        .trim()
        .isLength({min:3})
        .withMessage('password should be at least 5 characters'),
    validate,
]

const validateSignup = [
    ...validateCredential,
    body('name').notEmpty().withMessage('name is missing'),
    body('email').isEmail().normalizeEmail().withMessage('invalid email'),
    body('url')
        .isURL()
        .withMessage('invalid url')
        .optional({nullable:true, checkFalsy: true}),
    validate,
]

router.post('/signup', validateSignup, authController.signup)

router.post('/login', validateCredential, authController.login)

router.post('/logout', authController.logout)

router.get('/me', isAuth, authController.me)

router.get('/csrf-token', authController.csrfToken)

export default router
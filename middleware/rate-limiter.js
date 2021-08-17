import rateLimit from 'express-rate-limit'
import { config } from '../config'

export default rateLimit({
    windowMs:config.rateLimit.windowMs,
    max: config.rateLimit.maxRequest,
    keyGenerator: (req, res) => 'twitter_clone-client'
})
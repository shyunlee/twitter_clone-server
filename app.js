import express from 'express'
import 'express-async-errors'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import tweetsRouter from './router/tweet.js'
import { TweetController } from './controller/tweet.js'
import * as tweetRepository from './data/tweet.js'
import authRouter from './router/auth.js'
import { config } from './config.js'
import { initSocket, getSocketIO } from './connection/socket.js'
import { sequelize } from './db/database.js'
import { csrfCheck } from './middleware/csrf.js'
import rateLimit from './middleware/rate-limiter.js'

const app = express()

const corsOption = {
    origin: config.cors.allowedOrigin,
    optionsSuccessStatus:200,
    credentials: true
}

app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({extended: false}))
app.use(helmet())
app.use(cors(corsOption))
app.use(morgan('tiny'))
app.use(rateLimit)

app.use('/tweets', tweetsRouter(new TweetController(tweetRepository, getSocketIO)))
app.use('/auth', authRouter)
app.use(csrfCheck)

app.use((err, req, res, next) => {
    console.error(err)
    res.sendStatus(500)
})

sequelize.sync().then(client => {
    const server = app.listen(process.env.PORT, () => {
        console.log(`server is started at ${new Date()} on ${process.env.PORT}`)
    })
    initSocket(server)
})



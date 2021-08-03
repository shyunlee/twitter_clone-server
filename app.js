import express from 'express'
import 'express-async-errors'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import tweetsRouter from './router/tweet.js'
import authRouter from './router/auth.js'
import { config } from './config.js'
import { initSocket } from './connection/socket.js'
import { sequelize } from './db/database.js'

const app = express()

const corsOption = {
    origin: config.cors.allowedOrigin,
    optionsSuccessStatus:200,
}

app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(helmet())
app.use(cors(corsOption))
app.use(morgan('tiny'))

app.use('/tweets', tweetsRouter)
app.use('/auth', authRouter)

app.use((err, req, res, next) => {
    console.error(err)
    res.sendStatus(500)
})

sequelize.sync().then(client => {
    const server = app.listen(config.host.port, () => {
        console.log(`server is on-T[${new Date()}]`)
    })
    initSocket(server)
})



import { getSocketIO } from '../connection/socket.js'
import * as tweetRepo from '../data/tweet.js'

export async function getTweets (req, res) {
    try {
        if (req.query.username) {
            const filteredTweets = await tweetRepo.getByUsername(req.query.username)
            return res.status(200).json(filteredTweets)
        }
        res.status(200).send(await tweetRepo.getAllTweets())
    } catch (error) {
        res.sendStatus(404)
    }
}

export async function createTweet (req, res) {
    try {
        const newTweet = await tweetRepo.create(req.body)
        res.status(201).json(newTweet)
        getSocketIO().emit('tweets', {command:'create', data:newTweet})
    } catch (error) {
        res.sendStatus(404)
    }
}

export async function getTweetById (req, res) {
    try {
        const tweetFound = await tweetRepo.getById(req.params.id)
        if (tweetFound) {
            res.status(200).json(tweetFound)
        } else {
            res.status(404).json({message: 'tweet id not found'})
        }
    } catch (error) {
        res.sendStatus(404)
    }
}

export async function updateTweet (req, res) {
    try {
        const tweetId = req.params.id
        const text = req.body.text
        const tweet = await tweetRepo.getById(tweetId)
        if (!tweet) {
            return res.sendStatus(404)
        }
        if (tweet.userId !== req.userId) {
            return res.sendStatus(403)
        }
        const updatedTweet = await tweetRepo.update(tweetId, text)
        res.status(200).json(updatedTweet)
        getSocketIO().emit('tweets', {command:'update', data:updatedTweet})
    } catch (error) {
        res.status(404).json({ message: `Tweet not found: ${tweetId}` })
    }
}


export async function deleteTweet (req, res) {
    try {
        const tweetId = req.params.id
        const tweet = await tweetRepo.getById(tweetId)
        if (!tweet) {
            return res.sendStatus(404)
        }
        if (tweet.userId !== req.userId) {
            return res.sendStatus(403)
        }
        await tweetRepo.remove(tweetId)
        res.sendStatus(200)
        getSocketIO().emit('tweets', {command:'delete', data:Number(tweetId)})
    } catch (error) {
        console.log(error)
        res.sendStatus(404)
    }
}
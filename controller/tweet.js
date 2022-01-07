export class TweetController {
    constructor (tweetRepository, getSocket) {
        this.tweetRepo = tweetRepository
        this.getSocket = getSocket
    }

 getTweets = async (req, res) => {
        try {
            if (req.query.username) {
                const filteredTweets = await this.tweetRepo.getByUsername(req.query.username)
                return res.status(200).json(filteredTweets)
            }
            res.status(200).json(await this.tweetRepo.getAllTweets())
        } catch (error) {
            res.sendStatus(404)
        }
    }
    
 createTweet = async (req, res) => {
        try {
            const newTweet = await this.tweetRepo.create({text: req.body.text, userId: req.userId})
            res.status(201).json(newTweet)
            this.getSocket().emit('tweets', {command:'create', data:newTweet})
        } catch (error) {
            res.sendStatus(404)
        }
    }
    
 getTweetById = async (req, res) => {
        try {
            const tweetFound = await this.tweetRepo.getById(req.params.id)
            if (tweetFound) {
                res.status(200).json(tweetFound)
            } else {
                res.status(404).json({message: 'tweet id not found'})
            }
        } catch (error) {
            res.sendStatus(404)
        }
    }
    
 updateTweet = async (req, res) => {
        try {
            const tweetId = req.params.id
            const text = req.body.text
            const tweet = await this.tweetRepo.getById(tweetId)
            if (!tweet) {
                return res.status(404).json({message: 'Tweet not found by tweet id'})
            }
            if (tweet.userId !== req.userId) {
                return res.status(403).json({message: 'User not matched for the tweet'})
            }
            const updatedTweet = await this.tweetRepo.update(tweetId, text)
            res.status(200).json(updatedTweet)
            this.getSocket().emit('tweets', {command:'update', data:updatedTweet})
        } catch (error) {
            res.status(404).json({ message: `Tweet not found: ${tweetId}` })
        }
    }
    
    
 deleteTweet = async (req, res) => {
        try {
            const tweetId = req.params.id
            const tweet = await this.tweetRepo.getById(tweetId)
            if (!tweet) {
                return res.sendStatus(404)
            }
            if (tweet.userId !== req.userId) {
                return res.sendStatus(403)
            }
            await this.tweetRepo.remove(tweetId)
            res.sendStatus(200)
            this.getSocket().emit('tweets', {command:'delete', data:Number(tweetId)})
        } catch (error) {
            console.log(error)
            res.sendStatus(404)
        }
    }  
}


import { TweetController } from "../tweet.js";
import httpMocks from "node-mocks-http";
import faker from "faker";

describe("TweetController Test", () => {
  let tweetsRepository;
  let tweetController;
  let mockedSocket;
  beforeEach(() => {
    tweetsRepository = {};
    mockedSocket = {
      emit: jest.fn(),
    };
    tweetController = new TweetController(tweetsRepository, () => mockedSocket);
  });

  describe("getTweets", () => {
    it("returns all tweets when username is not provided", async () => {
      const request = httpMocks.createRequest();
      const response = httpMocks.createResponse();
      const allTweets = [
        {text: faker.random.words(3)},
        {text: faker.random.words(3)}
      ]
      tweetsRepository.getAllTweets = () => allTweets

      await tweetController.getTweets(request, response)

      expect(response.statusCode).toBe(200)
      expect(response._getJSONData()).toEqual(allTweets)
    });

    it("returns tweets for the given user when username is provided", async () => {
      const username = faker.internet.userName()
      const request = httpMocks.createRequest({
        query: {
          username
        }
      });
      const response = httpMocks.createResponse();
      const userTweets = [
        {text: faker.random.words(3)},
        {text: faker.random.words(3)}
      ]
      tweetsRepository.getByUsername = (userName) => userTweets

      await tweetController.getTweets(request, response)

      expect(response.statusCode).toBe(200)
      expect(response._getJSONData()).toEqual(userTweets)
    });

    it("returns 404 error for the unverified user when username is provided", async () => {
      const request = httpMocks.createRequest({
        query: {
          username: undefined
        }
      });
      const response = httpMocks.createResponse();
      const userTweets = [
        {text: faker.random.words(3)},
        {text: faker.random.words(3)}
      ]
      tweetsRepository.getByUsername = (userName) => new Error('unverified username')

      await tweetController.getTweets(request, response)

      expect(response.statusCode).toBe(404)
    });

  });

  describe('createTweet', () => {
    let newTweet, request, response
    beforeEach(() => {
      newTweet = {
        text: faker.random.words(3),
        userId: faker.random.alphaNumeric(16)
      }
      request = httpMocks.createRequest({
        body: newTweet
      })
      response = httpMocks.createResponse()
    })

    it('returns 201 with new tweet', async () => {
      tweetsRepository.create = (newTweet) => newTweet

      await tweetController.createTweet(request, response)

      expect(response.statusCode).toBe(201)
      expect(response._getJSONData()).toMatchObject(newTweet)
      expect(mockedSocket.emit).toHaveBeenCalledWith('tweets', {command: 'create', data: newTweet})
    })
  })

  describe('getTweetById', () => {
    let tweetId, request, response
    beforeEach(() => { 
      tweetId = faker.random.alphaNumeric(16)
      request = httpMocks.createRequest({
        params:{id: tweetId }
      })
      response = httpMocks.createResponse()
    })

    it('returns 200 with a tweet found by tweet Id provided', async () => {
      const aTweet = {text: faker.random.words(3)}
      tweetsRepository.getById = jest.fn(() => aTweet)

      await tweetController.getTweetById(request, response)

      expect(response.statusCode).toBe(200)
      expect(response._getJSONData()).toMatchObject(aTweet)
      expect(tweetsRepository.getById).toHaveBeenCalledWith(tweetId)
    })

    it('returns 404 with error message when no tweet found', async () => {
      tweetsRepository.getById = jest.fn(() => undefined)

      await tweetController.getTweetById(request, response)

      expect(response.statusCode).toBe(404)
      expect(response._getJSONData()).toMatchObject({message: 'tweet id not found'})
      expect(tweetsRepository.getById).toHaveBeenCalledWith(tweetId)
    })
  })

  describe('updateTweet', () => {
    let tweetId, tweetText, authorId, request, response
    beforeEach(() => {
      tweetId = faker.random.alphaNumeric(16)
      tweetText = faker.random.words(3)
      authorId = faker.random.alphaNumeric(16)
      request = httpMocks.createRequest({
        body: {
          text: tweetText,
          userId: authorId
        },
        params: {
          id: tweetId
        },
        userId: authorId
      })
      response = httpMocks.createResponse()
    })

    it('returns 404 status when tweet does not exist', async () => {
      tweetsRepository.getById = jest.fn(() => undefined)
      
      await tweetController.updateTweet(request, response)

      expect(response.statusCode).toBe(404)
      expect(tweetsRepository.getById).toBeCalled()
    })

    it('returns 403 status when the userId is different with the id for the tweet found', async () => {
      const aTweet = {text: faker.random.words(3), userId:faker.random.alphaNumeric(16)}
      tweetsRepository.getById = jest.fn(() => aTweet)
      
      await tweetController.updateTweet(request, response)

      expect(response.statusCode).toBe(403)
      expect(tweetsRepository.getById).toHaveBeenCalledWith(tweetId)
    })

    it('returns 200 status with updated tweet', async () => {
      const tweetFound = {text: faker.random.words(3), userId: authorId}
      const updatedTweet = {text: tweetText, userId: authorId}
      tweetsRepository.getById = jest.fn(() => tweetFound)
      tweetsRepository.update = jest.fn(() => updatedTweet)

      await tweetController.updateTweet(request, response)

      expect(response.statusCode).toBe(200)
      expect(response._getJSONData()).toMatchObject(updatedTweet)
      expect(tweetsRepository.update).toHaveBeenCalledWith(tweetId, tweetText)
    })

    it('calls socket emit function when tweet is updated successfully', async () => {
      const tweetFound = {text: faker.random.words(3), userId: authorId}
      const updatedTweet = {text: tweetText, userId: authorId}
      tweetsRepository.getById = jest.fn(() => tweetFound)
      tweetsRepository.update = jest.fn(() => updatedTweet)

      await tweetController.updateTweet(request, response)

      expect(mockedSocket.emit).toHaveBeenCalledWith('tweets', {command: 'update', data:updatedTweet})
    })
     
  })

  describe('deleteTweet', () => {
    let tweetId, authorId, request, response

    beforeEach(() => {
      tweetId = faker.random.alphaNumeric(16)
      authorId = faker.random.alphaNumeric(16)
      request = httpMocks.createRequest({
        params: {id: tweetId},
        userId: authorId
      })
      response = httpMocks.createResponse()
    })

    it('returns 404 status when tweet does not exist', async () => {
      tweetsRepository.getById = jest.fn(() => undefined)
      await tweetController.deleteTweet(request, response)

      expect(response.statusCode).toBe(404)
    })

    it('returns 403 status when the userId is different with the id for the tweet found', async () => {
      const tweetFound = {text:faker.random.words(3), userId: faker.random.alphaNumeric(16)}
      tweetsRepository.getById = jest.fn(() => tweetFound)
      await tweetController.deleteTweet(request, response)

      expect(response.statusCode).toBe(403)
    })

    it('returns 200 when removing the tweet found', async () => {
      const tweetFound = {text:faker.random.words(3), userId: authorId}
      tweetsRepository.getById = jest.fn(() => tweetFound)
      tweetsRepository.remove = jest.fn()
      await tweetController.deleteTweet(request, response)

      expect(response.statusCode).toBe(200)
      expect(tweetsRepository.remove).toHaveBeenCalledWith(tweetId)
    })

    it('calls socket emit function when the tweet is deleted successfully', async () => {
      const tweetFound = {text:faker.random.words(3), userId: authorId}
      tweetsRepository.getById = jest.fn(() => tweetFound)
      tweetsRepository.remove = jest.fn()
      await tweetController.deleteTweet(request, response)

      expect(mockedSocket.emit).toHaveBeenCalledWith('tweets', {command: 'delete', data:Number(tweetId)})
    })
  })
});

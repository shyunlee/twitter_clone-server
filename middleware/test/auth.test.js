import httpMocks from 'node-mocks-http'
import faker from 'faker'
import { isAuth } from '../auth.js'
import jwt from 'jsonwebtoken'
import * as userRepository from '../../data/auth.js'

jest.mock('jsonwebtoken')
jest.mock('../../data/auth.js')

describe('Auth Middleware', () => {
  it('returns 404 for the requests without Authorization header', async () => {
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/tweets'
    });
    const response = httpMocks.createResponse()
    const next = jest.fn()

    await isAuth(request, response, next)

    expect(response.statusCode).toBe(404)
    expect(response._getJSONData().message).toBe('invalid token')
    expect(next).not.toBeCalled()
  })

  it('returns 404 for the requests with unsupported Authorization header', async () => {
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/tweets',
      headers: {Authorization: 'Basic'}
    });
    const response = httpMocks.createResponse()
    const next = jest.fn()

    await isAuth(request, response, next)

    expect(response.statusCode).toBe(404)
    expect(response._getJSONData().message).toBe('invalid token')
    expect(next).not.toBeCalled()
  })

  it('returns 404 for the requests without token in cookies', async () => {
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/tweets',
      cookies: {
        token: ''
      }
    });
    const response = httpMocks.createResponse()
    const next = jest.fn()

    await isAuth(request, response, next)

    expect(response.statusCode).toBe(404)
    expect(response._getJSONData().message).toBe('invalid token')
    expect(next).not.toBeCalled()
  })

  it('returns 401 for the requests with unverified jwt token', async () => {
    const token = faker.random.alphaNumeric(128)
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/tweets',
      headers: {Authorization: `Bearer ${token}`}
    });
    const response = httpMocks.createResponse()
    const next = jest.fn()
    jwt.verify = jest.fn((token, secret, callback) => {
      callback(new Error('bad token'), undefined)
    })

    await isAuth(request, response, next)

    expect(response.statusCode).toBe(401)
    expect(response._getJSONData().message).toBe('Authentication Error1')
    expect(next).not.toBeCalled()
  })

  it('returns 401 for the requests with unauthorized user', async () => {
    const token = faker.random.alphaNumeric(128)
    const userId = faker.random.alphaNumeric(32)
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/tweets',
      headers: {Authorization: `Bearer ${token}`}
    });
    const response = httpMocks.createResponse()
    const next = jest.fn()
    jwt.verify = jest.fn((token, secret, callback) => {
      callback(false, {id: userId})
    })

    userRepository.findById = jest.fn( id => Promise.resolve(undefined))

    await isAuth(request, response, next)

    expect(response.statusCode).toBe(401)
    expect(response._getJSONData().message).toBe('Authentication Error2')
    expect(next).not.toBeCalled()
  })

  it('passes a request with valid Authrorization request with token', async () => {
    const token = faker.random.alphaNumeric(128)
    const userId = faker.random.alphaNumeric(32)
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/tweets',
      headers: {Authorization: `Bearer ${token}`}
    });
    const response = httpMocks.createResponse()
    const next = jest.fn()
    jwt.verify = jest.fn((token, secret, callback) => {
      callback(false, {id: userId})
    })

    userRepository.findById = jest.fn( id => Promise.resolve({id}))

    await isAuth(request, response, next)

    expect(request).toMatchObject({userId, token})
    expect(next).toHaveBeenCalledTimes(1)
  })

 
})
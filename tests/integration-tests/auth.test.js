import { startServer, stopServer } from "../../app.js";
import axios from 'axios'
import { sequelize } from "../../db/database.js";
import faker from 'faker'


describe('Auth API Test', () => {
  let server;
  let httpRequest;
  beforeAll(async () => {
    server = await startServer()
    httpRequest = axios.create({
      baseURL: 'http://localhost:8080',
      validateStatus: null
    })
  })

  afterAll(async () => {
    await sequelize.drop()
    await stopServer(server)
  })

  describe('POST to /auth/signup', () => {
    it('returns 201 and authorization token when user details are valid', async () => {
      const user = createValidUserDetail()
      const response = await httpRequest.post('/auth/signup', user)
      
      expect(response.status).toBe(201)
      expect(response.data.token.length).toBeGreaterThan(0)
    })

    it('returns 409 when username is already registered', async () => {
      const user = createValidUserDetail()
      let response = await httpRequest.post('/auth/signup', user)
      expect(response.status).toBe(201)

      response = await httpRequest.post('/auth/signup', user)

      expect(response.status).toBe(409)
      expect(response.data.message).toBe('user already registered')
    })

    test.each([
      {missingFieldName: 'name', expectedMessage:'name is missing'},
      {missingFieldName:'username', expectedMessage:'username should be at least 5 characters'},
      {missingFieldName:'email', expectedMessage: 'invalid email'},
      {missingFieldName:'password', expectedMessage:'password should be at least 5 characters'},
    ])('returns 400 when $missingFieldName field is missing', async ({missingFieldName, expectedMessage})=> {
      const user = createValidUserDetail()
      delete user[missingFieldName]
      const response = await httpRequest.post('/auth/signup', user)

      expect(response.status).toBe(400)
      expect(response.data.message).toBe(expectedMessage)
    })

    it('returns 400 when password is too short', async () => {
      const user = {...createValidUserDetail(), password: '123'}

      const response = await httpRequest.post('/auth/signup', user)

      expect(response.status).toBe(400)
      expect(response.data.message).toBe('password should be at least 5 characters')

    })

  })
})

function createValidUserDetail () {
  const fakeUser = faker.helpers.userCard()
  const {name, username, email} = fakeUser
  const password = faker.internet.password(10, true)
  const user = {name, username, email, password}

  return user
}
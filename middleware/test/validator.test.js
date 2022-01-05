import httpMocks from 'node-mocks-http'
import faker from 'faker'
import * as validator from "express-validator";
import { validate } from '../validator.js'

jest.mock('express-validator')

describe('validator middleware', () => {
  it('calls next function when there are no validation errors', () => {
    const request = httpMocks.createRequest()
    const response = httpMocks.createResponse()
    const next = jest.fn()
    validator.validationResult = jest.fn(() => ({
      isEmpty: () => true
    }))

    validate(request, response, next) 

    expect(next).toBeCalled()
  })

  it('response with status code 400 when there are errors', () => {
    const request = httpMocks.createRequest()
    const response = httpMocks.createResponse()
    const next = jest.fn()
    validator.validationResult = jest.fn(() => ({
      isEmpty: () => false,
      array: () => 'Error!'
    }))

    validate(request, response, next) 

    expect(response.statusCode).toBe(400)
    expect(response._getJSONData().message).toBe('Error!')
    expect(next).not.toBeCalled()
  })
})

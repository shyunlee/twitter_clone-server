import axios from "axios";
import faker from 'faker'
import { io as SocketClient } from "socket.io-client";
import { startServer, stopServer } from "../../app.js";
import { createNewUser } from './auth_utils.js'

describe("Sockets Test", () => {
  let server;
  let httpRequest;
  let clientSocket;
  let baseURL;

  beforeAll(async () => {
    server = await startServer();
    baseURL = `http://localhost:${server.address().port}`;
    httpRequest = axios.create({ baseURL, validateStatus: null });
  });

  afterAll(async () => {
    await stopServer(server);
  });

  beforeEach(() => {
    clientSocket = new SocketClient(baseURL);
  });

  afterEach(() => {
    clientSocket.disconnect();
  })

  it('not allowed connection when authorization token is not valid', (done) => {
    clientSocket.on('connect_error', () => {
      done()
    })

    clientSocket.on('connect', () => {
      done(new Error('Accepted even though authorization token is invalid'))
    })

    clientSocket.connect()
  })

  it('shold accept a connection when authorization token is given and valid', async () => {
    const user = await createNewUser(httpRequest)
    clientSocket.auth = (callback) => callback({token:user.jwt})

    const socketPromise = new Promise((resolve, reject) => {
      clientSocket.on('connect', () => {
        resolve('success')
      })

      clientSocket.on('connect_error', () => {
        reject(new Error('Should have rejected the connection'))
      })
    })

    clientSocket.connect()
    await expect(socketPromise).resolves.toEqual('success')
  })

  it('emits "tweets" event when new tweet is posted', async () => {
    const user = await createNewUser(httpRequest)
    clientSocket.auth = (cb) => cb({token: user.jwt})
    const text = faker.random.words(3)

    clientSocket.on('connect', async () => {
      await httpRequest.post('/tweets', {text}, {headers: {Authorization: `Bearer ${user.jwt}`}})
    })

    const socketPromise = new Promise((resolve) => {
      clientSocket.on('tweets', (tweet) => resolve(tweet))
    })
  
    clientSocket.connect()
  
    await expect(socketPromise).resolves.toMatchObject({
      command: 'create',
      data: {
        username: user.username,
        name: user.name,
        text
      }
    })
  
  })

  

});

import { startServer, stopServer } from "../../app.js";
import axios from "axios";
import { sequelize } from "../../db/database.js";
import faker from "faker";

describe("Auth API Test", () => {
  let server;
  let httpRequest;
  beforeAll(async () => {
    server = await startServer();
    httpRequest = axios.create({
      baseURL: "http://localhost:8080",
      validateStatus: null,
    });
  });

  afterAll(async () => {
    await sequelize.drop();
    await stopServer(server);
  });

  describe("POST to /auth/signup", () => {
    it("returns 201 and authorization token when user details are valid", async () => {
      const user = createValidUserDetail();
      const response = await httpRequest.post("/auth/signup", user);

      expect(response.status).toBe(201);
      expect(response.data.token.length).toBeGreaterThan(0);
    });

    it("returns 409 when username is already registered", async () => {
      const user = createValidUserDetail();
      let response = await httpRequest.post("/auth/signup", user);
      expect(response.status).toBe(201);

      response = await httpRequest.post("/auth/signup", user);

      expect(response.status).toBe(409);
      expect(response.data.message).toBe("user already registered");
    });

    test.each([
      { missingFieldName: "name", expectedMessage: "name is missing" },
      {
        missingFieldName: "username",
        expectedMessage: "Invalid value",
      },
      { missingFieldName: "email", expectedMessage: "invalid email" },
      {
        missingFieldName: "password",
        expectedMessage: "password should be at least 5 characters",
      },
    ])(
      "returns 400 when $missingFieldName field is missing",
      async ({ missingFieldName, expectedMessage }) => {
        const user = createValidUserDetail();
        delete user[missingFieldName];
        const response = await httpRequest.post("/auth/signup", user);

        expect(response.status).toBe(400);
        expect(response.data.message).toBe(expectedMessage);
      }
    );

    it("returns 400 when password is too short", async () => {
      const user = { ...createValidUserDetail(), password: "123" };

      const response = await httpRequest.post("/auth/signup", user);

      expect(response.status).toBe(400);
      expect(response.data.message).toBe(
        "password should be at least 5 characters"
      );
    });
  });

  describe("POST to /auth/login", () => {
    it("returns 200 status when logged in successfully", async () => {
      const newUser = await createNewUser();
      const response = await httpRequest.post("/auth/login", {
        username: newUser.username,
        password: newUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.data.token.length).toBeGreaterThan(0);
    });

    test.each([
      { inputData: "username", expectedMessage: "login failed" },
      { inputData: "password", expectedMessage: "login failed" },
    ])(
      "returns 401 status when login is failed with wrong $wrongData",
      async ({ inputData, expectedMessage }) => {
        const newUser = await createNewUser();
        newUser[inputData] = newUser[inputData].toUpperCase().concat("test");
        const response = await httpRequest.post("/auth/login", {
          username: newUser.username,
          password: newUser.password,
        });

        expect(response.status).toBe(401);
        expect(response.data.message).toBe(expectedMessage);
      }
    );

    test.each([
      {
        inputData: "username",
        expectedMessage: "username should be at least 5 characters",
      },
      {
        inputData: "password",
        expectedMessage: "password should be at least 5 characters",
      },
    ])(
      "returns 400 when validation is failed due to $inputData",
      async ({ inputData, expectedMessage }) => {
        const newUser = await createNewUser();
        newUser[inputData] = "ab";
        const response = await httpRequest.post("/auth/login", {
          username: newUser.username,
          password: newUser.password,
        });

        expect(response.status).toBe(400);
        expect(response.data.message).toBe(expectedMessage);
      }
    );
  });

  describe("GET to /auth/me", () => {
    it("returns 200 status when token in Authorization header is valid", async () => {
      const userRegistered = await createNewUser();
      const response = await httpRequest.get("/auth/me", {
        headers: { Authorization: `Bearer ${userRegistered.jwt}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        username: userRegistered.username,
        userId: userRegistered.userId,
        token: userRegistered.jwt,
      });
    });

    it("returns 404 status when token in Authorization header is invalid", async () => {
      const userRegistered = await createNewUser();
      userRegistered.jwt = undefined;
      const response = await httpRequest.get("/auth/me", {
        headers: { Authorization: `Bearer ${userRegistered.jwt}` },
      });

      expect(response.status).toBe(401);
      expect(response.data.message).toBe("Authentication Error1");
    });
  });

  async function createNewUser() {
    const userDetail = createValidUserDetail();
    const userRegistered = await httpRequest.post("/auth/signup", userDetail);
    return {
      ...userDetail,
      userId: userRegistered.data.userId,
      jwt: userRegistered.data.token,
    };
  }

  describe("Tweets APIs Test", () => {
    describe("POST to /tweets", () => {
      it("returns 201 with tweet data when authorized users create a new tweet", async () => {
        const text = faker.random.words(3);
        const user = await createNewUser();
        const requestHeader = { Authorization: `Bearer ${user.jwt}` };
        const response = await httpRequest.post(
          "/tweets",
          { text },
          { headers: requestHeader }
        );

        expect(response.status).toBe(201)
        expect(response.data).toMatchObject({
          text: text,
          userId: user.userId,
          name: user.name,
          username: user.username
        })
      });

      it('returns 400 when a tweet text is less than 3 characters', async () => {
        const text = faker.random.alpha({count: 2})
        const user = await createNewUser()
        const requestHeader = {Authorization: `Bearer ${user.jwt}`}

        const response = await httpRequest.post('/tweets', {text}, {headers: requestHeader})

        expect(response.status).toBe(400)
        expect(response.data.message).toBe('text should be at least 3 characters')
      })
    });

    describe("GET to /tweets", () => {
      it("returns 200 when username is given in query and does exist", async () => {
        const text = faker.random.words(3)
        const user1 = await createNewUser()
        const user2 = await createNewUser()
        const user1Headers = {Authorization: `Bearer ${user1.jwt}`}
        const user2Headers = {Authorization: `Bearer ${user2.jwt}`}

        await httpRequest.post('/tweets', {text}, {headers: user1Headers})
        await httpRequest.post('/tweets', {text}, {headers: user2Headers})

        const response = await httpRequest.get(
          `/tweets?username=${user1.username}`,
          {headers: user1Headers}
        );

        expect(response.status).toBe(200)
        expect(response.data.length).toEqual(1)
        expect(response.data[0].username).toBe(user1.username)
      });

      it('returns all tweets when username is not specified in the query', async () => {
        const text = faker.random.words(3)
        const user1 = await createNewUser()
        const user2 = await createNewUser()
        const user1Headers = {Authorization: `Bearer ${user1.jwt}`}
        const user2Headers = {Authorization: `Bearer ${user2.jwt}`}

        await httpRequest.post('/tweets', {text}, {headers: user1Headers})
        await httpRequest.post('/tweets', {text}, {headers: user2Headers})

        const response = await httpRequest.get('/tweets', {headers: user1Headers})

        expect(response.status).toBe(200)
        expect(response.data.length).toBeGreaterThanOrEqual(2)
      })
    });

    describe('GET to /tweets/:id', () => {
      it("returns 200 status with a tweet filtered by tweet id when tweet id is provided", async () => {
        const text1 = faker.random.words(3)
        const text2 = faker.random.words(3)
        const user = await createNewUser()
        const userHeaders = {Authorization:`Bearer ${user.jwt}`}

        const res1 = await httpRequest.post('/tweets', {text:text1}, {headers: userHeaders})
        await httpRequest.post('/tweets', {text:text2}, {headers: userHeaders})
        console.log(res1.data.id)
        const response = await httpRequest.get(`/tweets/${res1.data.id}`, {headers: userHeaders})

        expect(response.status).toBe(200)
        expect(response.data.text).toMatch(text1)
      })

      it("returns 404 when tweet id is not provided in query", async () => {
        const text = faker.random.words(3)
        const user = await createNewUser()
        const userHeaders = {Authorization: `Bearer ${user.jwt}`}
        await httpRequest.post('/tweets', {text}, {headers: userHeaders})

        const response = await httpRequest.get('/tweets/none', {headers: userHeaders})

        expect(response.status).toBe(404)
        expect(response.data.message).toBe('tweet id not found')
      })
    })

    describe('PUT to /tweets/:id', () => {
      it('returns 200 when tweet id provided and user is matched', async () => {
        const text = faker.random.words(3)
        const updatedText = faker.random.words(3)
        const user = await createNewUser()
        const userHeaders = {Authorization: `Bearer ${user.jwt}`}
        const createdTweet = await httpRequest.post('/tweets', {text}, {headers: userHeaders})

        const response = await httpRequest.put(`/tweets/${createdTweet.data.id}`, {text:updatedText}, {headers: userHeaders})

        expect(response.status).toBe(200)
        expect(response.data.text).toMatch(updatedText)
      })

      it('returns 404 when tweet id is not provided', async () => {
        const text = faker.random.words(3)
        const updatedText = faker.random.words(3)
        const user = await createNewUser()
        const userHeaders = {Authorization: `Bearer ${user.jwt}`}
        await httpRequest.post('/tweets', {text}, {headers: userHeaders})

        const response = await httpRequest.put(`/tweets/none`, {text: updatedText}, {headers: userHeaders})

        expect(response.status).toBe(404)
        expect(response.data.message).toBe('Tweet not found by tweet id')
      })

      it('returns 403 when user is not matched', async () => {
        const text = faker.random.words(3)
        const updatedText = faker.random.words(3)
        const user = await createNewUser()
        const bUser = await createNewUser()
        const userHeaders = {Authorization: `Bearer ${user.jwt}`}
        const bUserHeaders = {Authorization: `Bearer ${bUser.jwt}`}
        await httpRequest.post('/tweets', {text}, {headers: userHeaders})
        const tweetCreated2 = await httpRequest.post('/tweets', {text}, {headers: bUserHeaders})

        const response = await httpRequest.put(`/tweets/${tweetCreated2.data.id}`, {text: updatedText}, {headers: userHeaders})

        expect(response.status).toBe(403)
        expect(response.data.message).toBe('User not matched for the tweet')
      })
    })

    describe('DELETE to /tweets/:id', () => {
      it('returns 404 when tweet id is not provided', async () => {
        const text = faker.random.words(3)
        const updatedText = faker.random.words(3)
        const user = await createNewUser()
        const userHeaders = {Authorization: `Bearer ${user.jwt}`}
        await httpRequest.post('/tweets', {text}, {headers: userHeaders})

        const response = await httpRequest.delete(`/tweets/none`, {headers: userHeaders})

        expect(response.status).toBe(404)
      })

      it('returns 403 when user is not matched', async () => {
        const text = faker.random.words(3)
        const updatedText = faker.random.words(3)
        const user = await createNewUser()
        const bUser = await createNewUser()
        const userHeaders = {Authorization: `Bearer ${user.jwt}`}
        const bUserHeaders = {Authorization: `Bearer ${bUser.jwt}`}
        await httpRequest.post('/tweets', {text}, {headers: userHeaders})
        const tweetCreated2 = await httpRequest.post('/tweets', {text}, {headers: bUserHeaders})

        const response = await httpRequest.delete(`/tweets/${tweetCreated2.data.id}`, {headers: userHeaders})

        expect(response.status).toBe(403)
      })

      it('returns 200 when delete completed with tweet id', async () => {
        const text = faker.random.words(3)
        const user = await createNewUser()
        const userHeaders = {Authorization: `Bearer ${user.jwt}`}
        const tweetCreated = await httpRequest.post('/tweets', {text}, {headers: userHeaders})

        const response = await httpRequest.delete(`/tweets/${tweetCreated.data.id}`, {headers: userHeaders})

        expect(response.status).toBe(200)
      })
    })


  });
});

function createValidUserDetail() {
  const fakeUser = faker.helpers.userCard();
  const { name, username, email } = fakeUser;
  const password = faker.internet.password(10, true);
  const user = { name, username, email, password };

  return user;
}

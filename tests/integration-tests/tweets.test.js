import { startServer, stopServer } from "../../app.js";
import axios from "axios";
import { sequelize } from "../../db/database.js";
import faker from "faker";
import { createNewUser } from "./auth_utils.js";

describe("Tweets API Test", () => {
  let server;
  let httpRequest;
  beforeAll(async () => {
    server = await startServer();
    httpRequest = axios.create({
      baseURL: `http://localhost:${server.address().port}`,
      validateStatus: null,
    });
  });

  afterAll(async () => {
    // await sequelize.drop();
    await stopServer(server);
  });

  describe("POST to /tweets", () => {
    it("returns 201 with tweet data when authorized users create a new tweet", async () => {
      const text = faker.random.words(3);
      const user = await createNewUser(httpRequest);
      const requestHeader = { Authorization: `Bearer ${user.jwt}` };
      const response = await httpRequest.post(
        "/tweets",
        { text },
        { headers: requestHeader }
      );

      expect(response.status).toBe(201);
      expect(response.data).toMatchObject({
        text: text,
        userId: user.userId,
        name: user.name,
        username: user.username,
      });
    });

    it("returns 400 when a tweet text is less than 3 characters", async () => {
      const text = faker.random.alpha({ count: 2 });
      const user = await createNewUser(httpRequest);
      const requestHeader = { Authorization: `Bearer ${user.jwt}` };

      const response = await httpRequest.post(
        "/tweets",
        { text },
        { headers: requestHeader }
      );

      expect(response.status).toBe(400);
      expect(response.data.message).toBe(
        "text should be at least 3 characters"
      );
    });
  });

  describe("GET to /tweets", () => {
    it("returns 200 when username is given in query and does exist", async () => {
      const text = faker.random.words(3);
      const user1 = await createNewUser(httpRequest);
      const user2 = await createNewUser(httpRequest);
      const user1Headers = { Authorization: `Bearer ${user1.jwt}` };
      const user2Headers = { Authorization: `Bearer ${user2.jwt}` };

      await httpRequest.post("/tweets", { text }, { headers: user1Headers });
      await httpRequest.post("/tweets", { text }, { headers: user2Headers });

      const response = await httpRequest.get(
        `/tweets?username=${user1.username}`,
        { headers: user1Headers }
      );

      expect(response.status).toBe(200);
      expect(response.data.length).toEqual(1);
      expect(response.data[0].username).toBe(user1.username);
    });

    it("returns all tweets when username is not specified in the query", async () => {
      const text = faker.random.words(3);
      const user1 = await createNewUser(httpRequest);
      const user2 = await createNewUser(httpRequest);
      const user1Headers = { Authorization: `Bearer ${user1.jwt}` };
      const user2Headers = { Authorization: `Bearer ${user2.jwt}` };

      await httpRequest.post("/tweets", { text }, { headers: user1Headers });
      await httpRequest.post("/tweets", { text }, { headers: user2Headers });

      const response = await httpRequest.get("/tweets", {
        headers: user1Headers,
      });

      expect(response.status).toBe(200);
      expect(response.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("GET to /tweets/:id", () => {
    it("returns 200 status with a tweet filtered by tweet id when tweet id is provided", async () => {
      const text1 = faker.random.words(3);
      const text2 = faker.random.words(3);
      const user = await createNewUser(httpRequest);
      const userHeaders = { Authorization: `Bearer ${user.jwt}` };

      const res1 = await httpRequest.post(
        "/tweets",
        { text: text1 },
        { headers: userHeaders }
      );
      await httpRequest.post(
        "/tweets",
        { text: text2 },
        { headers: userHeaders }
      );
      const response = await httpRequest.get(`/tweets/${res1.data.id}`, {
        headers: userHeaders,
      });

      expect(response.status).toBe(200);
      expect(response.data.text).toMatch(text1);
    });

    it("returns 404 when tweet id is not provided in query", async () => {
      const text = faker.random.words(3);
      const user = await createNewUser(httpRequest);
      const userHeaders = { Authorization: `Bearer ${user.jwt}` };
      await httpRequest.post("/tweets", { text }, { headers: userHeaders });

      const response = await httpRequest.get("/tweets/none", {
        headers: userHeaders,
      });

      expect(response.status).toBe(404);
      expect(response.data.message).toBe("tweet id not found");
    });
  });

  describe("PUT to /tweets/:id", () => {
    it("returns 200 when tweet id provided and user is matched", async () => {
      const text = faker.random.words(3);
      const updatedText = faker.random.words(3);
      const user = await createNewUser(httpRequest);
      const userHeaders = { Authorization: `Bearer ${user.jwt}` };
      const createdTweet = await httpRequest.post(
        "/tweets",
        { text },
        { headers: userHeaders }
      );

      const response = await httpRequest.put(
        `/tweets/${createdTweet.data.id}`,
        { text: updatedText },
        { headers: userHeaders }
      );

      expect(response.status).toBe(200);
      expect(response.data.text).toMatch(updatedText);
    });

    it("returns 404 when tweet id is not provided", async () => {
      const text = faker.random.words(3);
      const updatedText = faker.random.words(3);
      const user = await createNewUser(httpRequest);
      const userHeaders = { Authorization: `Bearer ${user.jwt}` };
      await httpRequest.post("/tweets", { text }, { headers: userHeaders });

      const response = await httpRequest.put(
        `/tweets/none`,
        { text: updatedText },
        { headers: userHeaders }
      );

      expect(response.status).toBe(404);
      expect(response.data.message).toBe("Tweet not found by tweet id");
    });

    it("returns 403 when user is not matched", async () => {
      const text = faker.random.words(3);
      const updatedText = faker.random.words(3);
      const user = await createNewUser(httpRequest);
      const bUser = await createNewUser(httpRequest);
      const userHeaders = { Authorization: `Bearer ${user.jwt}` };
      const bUserHeaders = { Authorization: `Bearer ${bUser.jwt}` };
      await httpRequest.post("/tweets", { text }, { headers: userHeaders });
      const tweetCreated2 = await httpRequest.post(
        "/tweets",
        { text },
        { headers: bUserHeaders }
      );

      const response = await httpRequest.put(
        `/tweets/${tweetCreated2.data.id}`,
        { text: updatedText },
        { headers: userHeaders }
      );

      expect(response.status).toBe(403);
      expect(response.data.message).toBe("User not matched for the tweet");
    });
  });

  describe("DELETE to /tweets/:id", () => {
    it("returns 404 when tweet id is not provided", async () => {
      const text = faker.random.words(3);
      const updatedText = faker.random.words(3);
      const user = await createNewUser(httpRequest);
      const userHeaders = { Authorization: `Bearer ${user.jwt}` };
      await httpRequest.post("/tweets", { text }, { headers: userHeaders });

      const response = await httpRequest.delete(`/tweets/none`, {
        headers: userHeaders,
      });

      expect(response.status).toBe(404);
    });

    it("returns 403 when user is not matched", async () => {
      const text = faker.random.words(3);
      const updatedText = faker.random.words(3);
      const user = await createNewUser(httpRequest);
      const bUser = await createNewUser(httpRequest);
      const userHeaders = { Authorization: `Bearer ${user.jwt}` };
      const bUserHeaders = { Authorization: `Bearer ${bUser.jwt}` };
      await httpRequest.post("/tweets", { text }, { headers: userHeaders });
      const tweetCreated2 = await httpRequest.post(
        "/tweets",
        { text },
        { headers: bUserHeaders }
      );

      const response = await httpRequest.delete(
        `/tweets/${tweetCreated2.data.id}`,
        { headers: userHeaders }
      );

      expect(response.status).toBe(403);
    });

    it("returns 200 when delete completed with tweet id", async () => {
      const text = faker.random.words(3);
      const user = await createNewUser(httpRequest);
      const userHeaders = { Authorization: `Bearer ${user.jwt}` };
      const tweetCreated = await httpRequest.post(
        "/tweets",
        { text },
        { headers: userHeaders }
      );

      const response = await httpRequest.delete(
        `/tweets/${tweetCreated.data.id}`,
        { headers: userHeaders }
      );

      expect(response.status).toBe(200);
    });
  });
});

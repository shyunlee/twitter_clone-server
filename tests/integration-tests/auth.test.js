import { startServer, stopServer } from "../../app.js";
import axios from "axios";
import { sequelize } from "../../db/database.js";
import faker from "faker";
import { createValidUserDetail, createNewUser } from './auth_utils.js'

describe("Auth API Test", () => {
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
      const newUser = await createNewUser(httpRequest);
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
        const newUser = await createNewUser(httpRequest);
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
        const newUser = await createNewUser(httpRequest);
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
      const userRegistered = await createNewUser(httpRequest);
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
      const userRegistered = await createNewUser(httpRequest);
      userRegistered.jwt = undefined;
      const response = await httpRequest.get("/auth/me", {
        headers: { Authorization: `Bearer ${userRegistered.jwt}` },
      });

      expect(response.status).toBe(401);
      expect(response.data.message).toBe("Authentication Error1");
    });
  });
});



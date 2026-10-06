import "dotenv/config";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import User from "../models/User.js";

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST);
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

const creds = { name: "Ada", email: "ada@test.com", password: "password123" };

test("register rejects a weak password", async () => {
  const res = await request(app).post("/api/auth/register").send({ ...creds, password: "123" });
  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
});

test("register returns a token and never the password", async () => {
  const res = await request(app).post("/api/auth/register").send(creds);
  expect(res.status).toBe(201);
  expect(res.body.data.token).toBeDefined();
  expect(res.body.data.user.password).toBeUndefined();
});

test("register rejects a duplicate email", async () => {
  const res = await request(app).post("/api/auth/register").send(creds);
  expect(res.status).toBe(409);
});

test("login rejects a wrong password", async () => {
  const res = await request(app).post("/api/auth/login").send({ email: creds.email, password: "wrongpass1" });
  expect(res.status).toBe(401);
});

test("login succeeds with correct credentials", async () => {
  const res = await request(app).post("/api/auth/login").send({ email: creds.email, password: creds.password });
  expect(res.status).toBe(200);
  expect(res.body.data.token).toBeDefined();
});

test("protected route without a token returns 401", async () => {
  const res = await request(app).get("/api/notifications");
  expect(res.status).toBe(401);
});

test("protected route with a malformed header returns 401", async () => {
  const res = await request(app).get("/api/notifications").set("Authorization", "not-a-bearer-token");
  expect(res.status).toBe(401);
});

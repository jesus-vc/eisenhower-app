import request from "supertest";

import app from "./app";

describe("App.js configuration", function () {
  test("not found for site 404", async function () {
    const resp = await request(app).get("/no-such-path");
    expect(resp.statusCode).toEqual(404);
    expect(resp.body.error.err.message).toEqual("Not Found");
  });
});

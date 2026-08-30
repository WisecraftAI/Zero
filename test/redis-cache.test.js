"use strict";

const { wrapRedis } = require("@zero/cloud/redisCache");

describe("Redis cache subscriptions", () => {
  it("absorbs disconnect races while an SSE subscription is cleaned up", async () => {
    const subscriber = {
      subscribe: jest.fn().mockResolvedValue(1),
      unsubscribe: jest.fn().mockRejectedValue(new Error("Connection is closed")),
      on: jest.fn(),
      off: jest.fn(),
      disconnect: jest.fn()
    };
    const redis = {
      duplicate: jest.fn(() => subscriber)
    };

    const cache = wrapRedis(redis);
    const unsubscribe = cache.subscribe("state.run-1", jest.fn());

    await expect(unsubscribe()).resolves.toBeUndefined();
    expect(subscriber.off).toHaveBeenCalledWith("message", expect.any(Function));
    expect(subscriber.disconnect).toHaveBeenCalled();
  });
});

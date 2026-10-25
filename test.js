// Self-check for the pure parsing. Run: npm test
const assert = require("assert");
const { parseCreds, parseUsage } = require("./lib");

const creds = (o) => JSON.stringify({ claudeAiOauth: o });
assert.strictEqual(parseCreds(creds({ accessToken: "t", expiresAt: Date.now() + 1e6, subscriptionType: "pro" }), "x").token, "t");
assert.strictEqual(parseCreds(creds({ accessToken: "t" }), "x").token, "t");                       // no expiry given
assert.throws(() => parseCreds(creds({ accessToken: "t", expiresAt: 1 }), "x"), { code: "expired" });
assert.throws(() => parseCreds("not json", "x"), { code: "unreadable" });
assert.throws(() => parseCreds(creds({}), "x"), { code: "unreadable" });

const u = parseUsage(JSON.stringify({ five_hour: { utilization: 13, resets_at: "2026-10-25T10:00:00Z" }, seven_day: null }), { plan: "pro", source: "x" });
assert.strictEqual(u.rate_limits.five_hour.used_percentage, 13);
assert.strictEqual(u.rate_limits.five_hour.resets_at, Date.parse("2026-10-25T10:00:00Z") / 1000);
assert.strictEqual(u.rate_limits.seven_day, null);
console.log("ok");

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildUnifiedInstagramLoginUrl, createInstagramOAuthState, decryptInstagramToken,
  encryptInstagramToken, metricValue, normalizeInstagramUsername,
  validTokenEncryptionKey, verifyInstagramOAuthState,
} from "../api/_instagram-core.js";

const key = Buffer.alloc(32, 7).toString("base64");

test("Unified Login uses config_id without legacy scope parameters", () => {
  const url = new URL(buildUnifiedInstagramLoginUrl({
    appId: "28267748919563564", configId: "config-test",
    redirectUri: "https://vilco-manager.example/api/meta-callback", state: "test-state",
  }));
  assert.equal(url.searchParams.get("config_id"), "config-test");
  assert.equal(url.searchParams.get("scope"), null);
  assert.equal(url.searchParams.get("response_type"), "code");
});
test("OAuth state verifies signature and expiration", () => {
  const created = createInstagramOAuthState("session-secret", 1000);
  assert.equal(verifyInstagramOAuthState(created.state, created.cookieValue, "session-secret", 2000), true);
  assert.equal(verifyInstagramOAuthState("other", created.cookieValue, "session-secret", 2000), false);
  assert.equal(verifyInstagramOAuthState(created.state, created.cookieValue, "wrong-secret", 2000), false);
  assert.equal(verifyInstagramOAuthState(created.state, created.cookieValue, "session-secret", 700000), false);
});
test("Instagram tokens use authenticated encryption at rest", () => {
  const token = "temporary-test-token-not-a-real-credential";
  const encrypted = encryptInstagramToken(token, key);
  assert.equal(encrypted.includes(token), false);
  assert.equal(decryptInstagramToken(encrypted, key), token);
  assert.throws(() => decryptInstagramToken(encrypted, Buffer.alloc(32, 8).toString("base64")));
});
test("encryption key validation requires canonical 32-byte base64", () => {
  assert.equal(validTokenEncryptionKey(key), true);
  assert.equal(validTokenEncryptionKey("not-a-key"), false);
});
test("Instagram handle comparison ignores case and leading @", () => {
  assert.equal(normalizeInstagramUsername("@Vilco.Laborde"), "vilco.laborde");
});
test("missing metrics remain null and a returned zero remains zero", () => {
  assert.equal(metricValue({ data: [] }, "reach"), null);
  assert.equal(metricValue({ data: [{ name: "reach", total_value: { value: 0 } }] }, "reach"), 0);
  assert.equal(metricValue({ data: [{ name: "reach", values: [{ value: 2 }, { value: 3 }] }] }, "reach"), 5);
});

/**
 * @jest-environment ./android-test-env.js
 */
const { castToError, VkSdkError, ExponentialBackoffClass } = require('./index');
const VkSdk = require('./index').default;

test('test-env-works', () => {
  expect(VkSdk.supports('FakeTestMethod')).toBe(true);
});


test("network error check", async (done) => {
  // VkSdk.addLogCallback(console.log);
  window.AndroidBridge.ResetFirstCall()
  try {
    await VkSdk.api("network.fail", {}, 'bad-network', 3)
    throw new Error("fail response")
  } catch (e) {
    expect(e).toBeInstanceOf(VkSdkError)
    if (e instanceof VkSdkError) {
      expect(e.type).toBe(VkSdkError.NETWORK_ERROR)
    }
  }
  done()
}, 60000)

test("test network crash on get-token", async (done) => {
  window.AndroidBridge.ResetFirstCall()
  // VkSdk.addLogCallback(console.log);
  const {response: [{id}]} = await VkSdk.api("users.get", {}, 'bad-network', 3)
  expect(id).toBe(100)
  done()
})


test("test network crash on get-token and api fail", async (done) => {
  window.AndroidBridge.ResetFirstCall()
  // VkSdk.addLogCallback(console.log);
  const {response: [{id}]} = await VkSdk.api("network.single-fail", {}, 'bad-network', 3)
  expect(id).toBe(101)
  done()
})


test("test single internal and token crash", async (done) => {
  window.AndroidBridge.ResetFirstCall()
  VkSdk.addLogCallback(console.log);
  const {response: [{id}]} = await VkSdk.api("backend.single-internal", {}, 'bad-network', 3)
  expect(id).toBe(102)
  done()
})

test("test single token lost and token crash", async (done) => {
  window.AndroidBridge.ResetFirstCall()
  // VkSdk.addLogCallback(console.log);
  const {response: [{id}]} = await VkSdk.api("backend.single-token-drop", {}, '', 3)
  expect(id).toBe(103)
  done()
})


test("ideal case", async (done) => {
  window.AndroidBridge.ResetFirstCall()
  // VkSdk.addLogCallback(console.log);
  const {response: [{id}]} = await VkSdk.api("users.get", {}, 'friends', 3)
  expect(id).toBe(100)
  done()
})

const { castToError, VkSdkError, ExponentialBackoffClass } = require('./index');
const VkSdk = require('./index').default;

const errors = [
  {
    platform: 'web',
    name: 'User reject request: VKWebAppGetEmail',
    raw: { 'error_type': 'client_error', 'error_data': { 'error_code': 4, 'error_reason': 'User denied' } },
    match: {
      type: VkSdkError.USER_REJECT,
      code: 4,
    },
  },
  {
    platform: 'mobile_iphone',
    name: 'VKWebAppGetAuthToken without network',
    raw: {
      'request_id': 8,
      'error_type': 'auth_error',
      'error_data': {
        'error_code': -1009,
        'error_domain': 'NSURLErrorDomain',
        'error_description': 'Вероятно, соединение с интернетом прервано.',
      },
    },
    match: {
      type: VkSdkError.NETWORK_ERROR,
    },
  },
  {
    platform: 'mobile_android',
    name: 'VKWebAppGetAuthToken without network',
    raw: { 'error_type': 'auth_error', 'error_data': { 'error': '', 'error_description': '', 'error_reason': '' } },
    match: {
      type: VkSdkError.NETWORK_ERROR,
    },
  },
  {
    platform: 'mobile_iphone',
    name: 'VKWebAppGetAuthToken without network',
    raw: { 'error_type': 'auth_error', 'error_data': { 'error_code': 0 } },
    match: {
      type: VkSdkError.NETWORK_ERROR,
    },
  },
  {
    platform: 'mobile_android',
    name: 'Потеря соединения при выполнении запроса к апи',
    raw: { 'error_type': 'client_error', 'error_data': { 'error_code': 3, 'error_reason': 'Connection lost' } },
    match: {
      type: VkSdkError.NETWORK_ERROR,
    },
  },
  {
    platform: 'mobile_iphone',
    name: 'Обрыв соединения во время VKWebAppGetAuthToken',
    raw: {
      'error_type': 'auth_error',
      'error_data': {
        'error_code': 53,
        'error_domain': 'NSPOSIXErrorDomain',
        'error_description': 'Не удалось завершить операцию. Программа вызвала разрыв подключения',
      },
    },
    match: {
      type: VkSdkError.NETWORK_ERROR,
    },
  },
  {
    platform: 'mobile_iphone',
    name: 'VKWebAppGetAuthToken с косячным токеном',
    raw: {
      'error_type': 'auth_error',
      'error_data': { 'error': 'invalid_token', 'error_description': 'token is incorrect' },
    },
    match: {
      type: VkSdkError.CLIENT_ERROR,
    },
  },
  {
    platform: 'desktop_web',
    name: 'VKWebAppOpenPayForm пользователь закрыл окно оплаты',
    raw: {
      'error_type': 'client_error',
      'error_data': {
        'error_code': 1,
        'error_reason': {
          'type': 'transaction',
          'action': 'pay-to-group',
          'status': false,
          'transaction_id': null,
          'amount': null,
          'extra': null,
          'error_msg': 'VK Pay payment failed',
        },
      },
    },
    match: {
      type: VkSdkError.USER_REJECT,
    },
  },
  {
    platform: 'mobile_iphone',
    name: 'VKWebAppOpenPayForm пользователь закрыл окно оплаты',
    raw: {
      'request_id': 2,
      'error_type': 'client_error',
      'error_data': { 'error_code': 4, 'error_reason': 'User denied' },
    },
    match: {
      type: VkSdkError.USER_REJECT,
    },
  },
  {
    platform: 'desktop_web',
    name: 'VKWebAppCallAPIMethod bad api request',
    raw: {
      'error_type': 'client_error',
      'error_data': {
        'error_code': 1,
        'error_reason': {
          'error_code': 5,
          'error_msg': 'User authorization failed: no access_token passed.',
          'request_params': [{ 'key': 'method', 'value': 'users.get' }, { 'key': 'oauth', 'value': '1' }, { 'key': '?api_id', 'value': '6703670' }, {
            'key': 'format',
            'value': 'json',
          }, { 'key': 'v', 'value': '5.101' }, { 'key': 'user_ids', 'value': '1,2,3' }, { 'key': 'request_id', 'value': '12345' }],
        },
      },
    },
    match: {
      type: VkSdkError.API_ERROR,
      code: 5,
    },
  },
  {
    platform: 'mobile_iphone',
    name: 'VKWebAppCallAPIMethod таймаут 1',
    raw: { 'error_type': 'api_error', 'error_data': { 'error_code': -1001, 'error_domain': 'NSURLErrorDomain', 'error_description': 'Превышен лимит времени на запрос.' } },
    match: {
      type: VkSdkError.NETWORK_ERROR,
      code: -1001
    }
  },
  {
    platform: 'mobile_iphone',
    name: 'VKWebAppCallAPIMethod таймаут 2',
    raw: {"error_type":"api_error","error_data":{"error_code":-1005,"error_domain":"NSURLErrorDomain","error_description":"Сетевое соединение потеряно."}},
    match: {
      type: VkSdkError.NETWORK_ERROR,
      code: -1005
    }
  },
  {
    platform: 'mobile_iphone',
    name: 'VKWebAppCallAPIMethod таймаут 3',
    raw: {"error_type":"api_error","error_data":{"error_code":-1001,"error_domain":"NSURLErrorDomain","error_description":"The request timed out."}},
    match: {
      type: VkSdkError.NETWORK_ERROR,
      code: -1001
    }
  },
  // {"error_type":"auth_error","error_data":{"error":"invalid_request","error_description":"application was deleted","error_reason":""}}
];
errors.forEach(({ platform, name, raw, match }) => {
  test(`[${platform}] ${name}`, () => {
    const error = castToError(raw);
    expect(error).toMatchObject(match);
  });
});

test('Log function', () => {
  let msg = '';

  function log(m) {
    msg = m;
  }

  VkSdk.addLogCallback(log);
  VkSdk.log('test');
  expect(msg).toBe('test');
});

function between(x, min, max) {
  return x >= min && x <= max;
}

test('ExponentialBackoff', async (done) => {
  const startDelay = 100;
  const bo = new ExponentialBackoffClass(startDelay);
  const t0 = Date.now();
  await bo.wait();
  const t1 = Date.now();
  expect(t1).toBeGreaterThanOrEqual(t0 + (startDelay * Math.pow(Math.E / 2, 0)));
  await bo.wait();
  const t2 = Date.now();
  expect(t2).toBeGreaterThanOrEqual(t1 + (startDelay * Math.pow(Math.E / 2, 1)));
  await bo.wait();
  const t3 = Date.now();
  expect(t3).toBeGreaterThanOrEqual(t2 + (startDelay * Math.pow(Math.E / 2, 2)));
  await bo.wait();
  const t4 = Date.now();
  expect(t4).toBeGreaterThanOrEqual(t3 + (startDelay * Math.pow(Math.E / 2, 3)));
  await bo.wait();
  const t5 = Date.now();
  expect(t5).toBeGreaterThanOrEqual(t4 + (startDelay * Math.pow(Math.E / 2, 4)));
  expect(bo.canRetry()).toBeFalsy();
  done();
}, 10000);

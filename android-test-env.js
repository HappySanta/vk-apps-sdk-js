const NodeEnvironment = require('jest-environment-jsdom');

class CustomEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.testPath = context.testPath;
    this.docblockPragmas = context.docblockPragmas;
  }

  async setup() {
    await super.setup();
    // await someSetupTasks(this.testPath);
    // this.global.someGlobalObject = {}

    const getRequestId = args => {
      const x = JSON.parse(args);
      return x.request_id;
    };

    const response = (type, data, request_id) => {
      data.request_id = request_id;
      this.global.window.dispatchEvent(new this.global.window.CustomEvent('VKWebAppEvent', {
        detail: {
          type,
          data,
        },
      }));
    };

    let isFirstCallGetAuthToken = true;
    let isFirstCallAPIMethod = true;
    let badToken = '';

    this.global.window.AndroidBridge = {
      FakeTestMethod: (args) => {

      },
      ResetFirstCall: () => {
        isFirstCallGetAuthToken = true;
        isFirstCallAPIMethod = true;
      },
      VKWebAppGetClientVersion: (args) => {
        response('VKWebAppGetClientVersionResult', {
          platform: 'jest-test',
          version: '1.0.0',
        }, getRequestId(args));
      },
      VKWebAppGetAuthToken: (args) => {
        const data = JSON.parse(args);

        if (data.scope === 'bad-network') {
          if (isFirstCallGetAuthToken) {
            isFirstCallGetAuthToken = false;
            return response('VKWebAppGetAuthTokenFailed', {
              'error_type': 'client_error',
              'error_data': { 'error_code': 3, 'error_reason': 'GetAuthToken fake connection lost' },
            }, getRequestId(args));
          }
        }

        response('VKWebAppGetAuthTokenResult', {
          'access_token': (Math.random()*100000).toString().substr(0,3)+'jest-test-token-',
          'scope': data.scope,
        }, getRequestId(args));
      },
      VKWebAppCallAPIMethod: (args) => {
        const data = JSON.parse(args);
        if (data.method === 'network.fail') {
          return response('VKWebAppCallAPIMethodFailed', {
            'error_type': 'client_error',
            'error_data': { 'error_code': 3, 'error_reason': 'Connection lost' },
          }, getRequestId(args));
        }

        if (data.method === 'network.single-fail') {
          if (isFirstCallAPIMethod) {
            isFirstCallAPIMethod = false;
            return response('VKWebAppCallAPIMethodFailed', {
              'error_type': 'client_error',
              'error_data': { 'error_code': 3, 'error_reason': 'Connection lost' },
            }, getRequestId(args));
          } else {
            return response('VKWebAppCallAPIMethodResult', {
              response: [
                { id: 101, first_name: 'Test' },
              ],
            }, getRequestId(args));
          }
        }

        if (data.method === 'backend.single-internal') {
          if (isFirstCallAPIMethod) {
            isFirstCallAPIMethod = false;
            return response('VKWebAppCallAPIMethodFailed', {
              'error_type': 'client_error',
              'error_data': {
                'error_code': 1,
                'error_reason': {
                  'error_code': 10,
                  'error_msg': 'Internal server error',
                  'request_params': [{ 'key': 'method', 'value': 'users.get' }, { 'key': 'oauth', 'value': '1' }, { 'key': '?api_id', 'value': '6703670' }, {
                    'key': 'format',
                    'value': 'json',
                  }, { 'key': 'v', 'value': '5.101' }, { 'key': 'user_ids', 'value': '1,2,3' }, { 'key': 'request_id', 'value': '12345' }],
                },
              },
            }, getRequestId(args));
          } else {
            return response('VKWebAppCallAPIMethodResult', {
              response: [
                { id: 102, first_name: 'Test' },
              ],
            }, getRequestId(args));
          }
        }

        if (data.method === 'backend.single-token-drop') {
          if (badToken === '' || badToken === data.params.access_token) {
            badToken = data.params.access_token
            return response('VKWebAppCallAPIMethodFailed', {
              'error_type': 'client_error',
              'error_data': {
                'error_code': 1,
                'error_reason': {
                  'error_code': 5,
                  'error_msg': 'Bad access token:'+data.params.access_token,
                  'request_params': [{ 'key': 'method', 'value': 'users.get' }, { 'key': 'oauth', 'value': '1' }, { 'key': '?api_id', 'value': '6703670' }, {
                    'key': 'format',
                    'value': 'json',
                  }, { 'key': 'v', 'value': '5.101' }, { 'key': 'user_ids', 'value': '1,2,3' }, { 'key': 'request_id', 'value': '12345' }],
                },
              },
            }, getRequestId(args));
          } else {
            return response('VKWebAppCallAPIMethodResult', {
              response: [
                { id: 103, first_name: 'Test' },
              ],
            }, getRequestId(args));
          }
        }

        if (data.method === 'users.get') {
          return response('VKWebAppCallAPIMethodResult', {
            response: [
              { id: 100, first_name: 'Test' },
            ],
          }, getRequestId(args));
        }

        response('VKWebAppCallAPIMethodFailed', {
          'error_type': 'client_error',
          'error_data': { 'error_code': 9999, 'error_reason': 'Test env not support method: ' + data.method },
        }, getRequestId(args));
      },
    };

    // // Will trigger if docblock contains @my-custom-pragma my-pragma-value
    // if (this.docblockPragmas['my-custom-pragma'] === 'my-pragma-value') {
    //   // ...
    // }
  }

  async teardown() {
    this.global.someGlobalObject = null;
    // await someTeardownTasks();
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }

  // async handleTestEvent(event, state) {
  //   if (event.name === 'test_start') {
  //     // ...
  //   }
  // }
}

module.exports = CustomEnvironment;

const {castToError, VkSdkError} = require("./index")
const VkSdk = require('./index').default


const errors = [
	{
		platform: "web",
		name: "User reject request: VKWebAppGetEmail",
		raw: {"error_type": "client_error", "error_data": {"error_code": 4, "error_reason": "User denied"}},
		match: {
			type: VkSdkError.USER_REJECT,
			code: 4,
		}
	},
	{
		platform: "mobile_iphone",
		name: "VKWebAppGetAuthToken without network",
		raw: {
			"request_id": 8,
			"error_type": "auth_error",
			"error_data": {
				"error_code": -1009,
				"error_domain": "NSURLErrorDomain",
				"error_description": "Вероятно, соединение с интернетом прервано."
			}
		},
		match: {
			type: VkSdkError.NETWORK_ERROR,
		}
	},
	{
		platform: "mobile_android",
		name: "VKWebAppGetAuthToken without network",
		raw: {"error_type": "auth_error", "error_data": {"error": "", "error_description": "", "error_reason": ""}},
		match: {
			type: VkSdkError.NETWORK_ERROR,
		}
	},
	{
		platform: "mobile_iphone",
		name: "VKWebAppGetAuthToken without network",
		raw: {"error_type": "auth_error", "error_data": {"error_code": 0}},
		match: {
			type: VkSdkError.NETWORK_ERROR,
		}
	},
	{
		platform: "mobile_android",
		name: "Потеря соединения при выполнении запроса к апи",
		raw: {"error_type": "client_error", "error_data": {"error_code": 3, "error_reason": "Connection lost"}},
		match: {
			type: VkSdkError.NETWORK_ERROR,
		}
	},
	{
		platform: "mobile_iphone",
		name: "Обрыв соединения во время VKWebAppGetAuthToken",
		raw: {"error_type":"auth_error","error_data":{"error_code":53,"error_domain":"NSPOSIXErrorDomain","error_description":"Не удалось завершить операцию. Программа вызвала разрыв подключения"}},
		match: {
			type: VkSdkError.NETWORK_ERROR,
		}
	},
	{
		platform: 'mobile_iphone',
		name: "VKWebAppGetAuthToken с косячным токеном",
		raw: {"error_type":"auth_error","error_data":{"error":"invalid_token","error_description":"token is incorrect"}},
		match: {
			type: VkSdkError.CLIENT_ERROR,
		}
	}
]
errors.forEach(({platform, name, raw, match}) => {
	test(`[${platform}] ${name}`, () => {
		const error = castToError(raw)
		expect(error).toMatchObject(match)
	})
})


test("Log function", () => {
	let msg = ""

	function log(m) {
		msg = m
	}

	VkSdk.addLogCallback(log)
	VkSdk.log("test")
	expect(msg).toBe('test')
})

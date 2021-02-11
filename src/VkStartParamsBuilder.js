import VkStartParams from "./VkStartParams"

export default class VkStartParamsBuilder {


	static fromQueryParams(params) {

		let TYPE_INTEGER = 'integer'
		let TYPE_STRING = 'string'
		let TYPE_BOOLEAN = 'boolean'
		let TYPE_OBJECT_FROM_JSON = 'json_to_object'
		let TYPE_BASE64_TO_JSON = 'type_base64_to_json'

		function snakeToCamel(s) {
			return s.replace(/(_\w)/g, function (m) {
				return m[1].toUpperCase()
			})
		}

		function ss(target, source, key, type, def) {
			let value = def
			if (source[key] !== undefined) {
				value = source[key]
			}

			if (type === TYPE_STRING) {
				value = (value || "").toString()
			} else if (type === TYPE_INTEGER) {
				value = parseInt(value, 10)
			} else if (type === TYPE_BOOLEAN) {
				value = !!+value
			} else if (type === TYPE_OBJECT_FROM_JSON) {
				value = value ? JSON.parse(value) : null
			} else if (type === TYPE_BASE64_TO_JSON) {
				try {
					value = value ? JSON.parse(atob(value)) : {}
				} catch (e) {
					value = {}
				}
			}

			target[snakeToCamel(key.replace('vk_', ''))] = value
		}

		let v = new VkStartParams()
		ss(v, params, 'vk_user_id', TYPE_INTEGER, 0)
		ss(v, params, 'vk_app_id', TYPE_INTEGER, 0)
		ss(v, params, 'vk_is_app_user', TYPE_BOOLEAN, false)
		ss(v, params, 'vk_are_notifications_enabled', TYPE_BOOLEAN, false)
		ss(v, params, 'vk_language', TYPE_STRING, 'ru')
		ss(v, params, 'vk_access_token_settings', TYPE_STRING, '')
		ss(v, params, 'vk_group_id', TYPE_INTEGER, 0)
		ss(v, params, 'vk_viewer_group_role', TYPE_STRING, 'none')
		ss(v, params, 'vk_platform', TYPE_STRING, '')
		ss(v, params, 'vk_sign', TYPE_STRING, '')
		ss(v, params, 'vk_ref', TYPE_STRING, '')
		ss(v, params, 'vk_is_favorite', TYPE_BOOLEAN, '')
		ss(v, params, 'sign', TYPE_STRING, '')
		ss(v, params, 'vk_experiment', TYPE_BASE64_TO_JSON, '')

		return v

	}

}

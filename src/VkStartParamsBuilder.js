import VkStartParams from "./VkStartParams"
export default class VkStartParamsBuilder {


	static fromQueryParams( params ) {

		let TYPE_INTEGER = 'integer'
		let TYPE_STRING = 'string'
		let TYPE_BOOLEAN = 'boolean'
		let TYPE_OBJECT_FROM_JSON = 'json_to_object'

		function snakeToCamel(s){
			return s.replace(/(_\w)/g, function(m){return m[1].toUpperCase();});
		}

		function ss( target, source, key, type, def ) {
			let value = def
			if (source[key] !== undefined) {
				value = source[key]
			}

			if (type === TYPE_STRING) {
				value = value.toString()
			} else if (type === TYPE_INTEGER) {
				value = parseInt(value, 10)
			} else if (type === TYPE_BOOLEAN) {
				value = !!+value
			} else if (type === TYPE_OBJECT_FROM_JSON) {
				value = value ? JSON.parse(value) : null
			}

			target[ snakeToCamel( key.replace('vk_', '') ) ] = value
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
        ss(v, params, 'vk_sign', TYPE_STRING, '')

		return v

	}

}

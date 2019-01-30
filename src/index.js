import queryString from 'query-string'
import VkStartParamsBuilder from "./VkStartParamsBuilder"

export default class VkSdk {

    static startParams = null
    static startSearch = ""

	/**
	 * @returns {VkStartParams}
	 */
	static getStartParams() {
		if (VkSdk.startParams === null) {
			VkSdk.startParams = VkStartParamsBuilder.fromQueryParams(queryString.parse(window.location.search))
			VkSdk.startSearch = window.location.search
		}
		return VkSdk.startParams
	}
}

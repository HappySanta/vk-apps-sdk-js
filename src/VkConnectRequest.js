import VKConnect from "@vkontakte/vk-connect"

export class VkConnectRequest {

	command
	params
	successEvent
	failEvent

	constructor(command, params = {}, successEvent = undefined, failEvent = undefined) {
		this.command = command
		this.params = params
		this.successEvent = successEvent
		this.failEvent = failEvent
	}

	send(requestId = undefined, onEnd = () => {}) {
		return new Promise((resolve, reject) => {
			if (this.successEvent !== undefined || this.failEvent !== undefined) {
				const callback = (e) => {
					let vkEvent = e.detail
					if (!vkEvent) {
						return
					}

					let eventType = vkEvent['type']
					let data = vkEvent['data']

					const onFind = (data, isResolve) => {
						VKConnect.unsubscribe(callback)
						if (typeof onEnd === "function") {
							setTimeout(onEnd,1)
						}
						isResolve ? resolve(data) : reject(data)
					}

					if (this.successEvent !== undefined && this.successEvent === eventType) {
						if (requestId && data['request_id'] && requestId === data['request_id']) {
							onFind(data, true)
						} else if (!requestId) {
							onFind(data, true)
						}
					} else if (this.failEvent !== undefined && this.failEvent === eventType) {
						if (requestId && data['request_id'] && requestId === data['request_id']) {
							onFind(data, false)
						} else if (!requestId) {
							onFind(data, false)
						}
					}
				}

				VKConnect.subscribe(callback)
			}

			VKConnect.send(this.command, this.params).catch(() => {})
		})
	}
}

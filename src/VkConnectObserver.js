import VKConnect from "@vkontakte/vk-connect"

export default class VkConnectObserver {

    static subjects = []

    static subscribe(eventType, callback) {
        if (!VkConnectObserver.subjects.length) {
            VKConnect.subscribe(VkConnectObserver.observerCallback)
        }
        VkConnectObserver.subjects.push({eventType, callback})
    }

    static unsubscribe(eventType, callback) {
        VkConnectObserver.subjects = VkConnectObserver.subjects.filter(subject =>
            subject.eventType !== eventType && callback !== subject.callback)
        if (!VkConnectObserver.subjects.length) {
            VKConnect.unsubscribe(VkConnectObserver.observerCallback)
        }
    }

    static observerCallback = (e) => {
        let vkEvent = e.detail
        if (!vkEvent) {
            return
        }
        let eventType = vkEvent['type']
        let data = vkEvent['data']
        VkConnectObserver.subjects.forEach(subject => {
            if (subject.eventType === eventType) {
                subject.callback(data)
            }
        })
    }
}


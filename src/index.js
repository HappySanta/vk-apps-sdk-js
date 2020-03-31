import queryString from 'query-string'
import VkStartParamsBuilder from "./VkStartParamsBuilder"
import VkConnectObserver from "./VkConnectObserver"
import VKBridge from "@vkontakte/vk-bridge"
import VkConnectRequest from "./VkConnectRequest"

export const VkConnectRequestClass = VkConnectRequest

export class VkSdkError extends Error {

	static UNKNOWN_TYPE = 'UNKNOWN_TYPE'
	static CLIENT_ERROR = 'client_error'
	static API_ERROR = 'api_error'
	static NETWORK_ERROR = 'network_error'
	static ACCESS_ERROR = 'access_error'

	constructor(message) {
		super(message)
		this.message = message
		this.type = VkSdkError.UNKNOWN_TYPE
		this.code = 0
		this.retry = 0
	}
}

export class VkApiError extends VkSdkError {
	constructor(message) {
		super(message)
		this.type = VkSdkError.API_ERROR
	}
}


export function isVkApiError(object) {
	return castToVkApi(object) !== null
}

export function castToVkApi(error) {
	if (error instanceof Error) return error
	const data = getVkApiErrorCodeAndMessage(error)
	if (data) {
		const [error_code, error_msg, error_text, method] = data
		const err = new VkApiError(error_msg + " \nmethod: " + method)
		err.code = error_code
		if (error_text) {
			err.text = error_text
		}
		return err
	}
	return null
}

function normalize(str) {
	return str.toString().split(',').map(x => x.trim().toLowerCase()).sort().join(",")
}

export function isEqualScope(left, right) {
	/*
	 * Возможно иногда не приходять scope с каких-то клиентов
	 * в этом случае надеемся что они выданы
	 */
	if (typeof right !== 'string') {
		return true
	}
	if (typeof left !== 'string') {
		return true
	}
	return normalize(left) === normalize(right)
}

export function getVkApiErrorCodeAndMessage(object) {
	if (!object) return null
	const {error_data, error_type} = object
	if (error_data === undefined && error_type === undefined) {
		return null
	}
	let method = "unknown"
	const {error_code, error_reason, error_msg, error_text, request_params} = error_data
	if (Array.isArray(request_params)) {
		request_params.forEach(node => {
			if (node && node.key === "method") {
				method = node.value
			}
		})
	}
	if (error_code === undefined && error_reason === undefined) {
		return null
	}
	if (error_code !== undefined && error_msg) {
		return [error_code, error_msg, error_text, method]
	}
	if (typeof error_reason === "object" && error_reason) {
		const {error_code, error_msg, error_text, request_params} = error_reason
		if (Array.isArray(request_params)) {
			request_params.forEach(node => {
				if (node && node.key === "method") {
					method = node.value
				}
			})
		}
		if (error_code !== undefined && error_msg) {
			return [error_code, error_msg, error_text, method]
		}
	}
	return null
}

export function castToError(object, ex = "") {
	if (object instanceof Error) {
		return object
	}
	const error = new VkSdkError(JSON.stringify(object) || "SUPER UNKNOWN ERROR BY @happysanta/vk-apps-sdk library")
	error.origin = object
	if (object && object.error_data && object.error_data.error_reason) {
		if (typeof object.error_data.error_reason === 'string') {
			error.message = `#${object.error_data.error_code} ${object.error_data.error_reason}`
		} else if (object.error_data.error_reason.error_msg) {
			error.message = `API ERROR: #${object.error_data.error_reason.error_code} ${object.error_data.error_reason.error_msg}`
			error.code = object.error_data.error_reason.error_code
			error.request_params = object.error_data.error_reason.request_params
			error.type = VkSdkError.API_ERROR
			if (Array.isArray(error.request_params)) {
				error.request_params.forEach(node => {
					if (node && node.key === "method") {
						error.message += ' \nmethod: ' + node.value
					}
				})
			}
		}
	}
	if (object && object.error_data && object.error_data.error_code) {
		error.code = object.error_data.error_code
	}
	if (object && object.error_type) {
		error.type = object.error_type
		//На андроиде такая ошибка приходит при остуствии интернета и запросе токена
		if (error.type === 'auth_error') {
			error.type = VkSdkError.CLIENT_ERROR
		}
	}

	//На iOS такой набор ошибок в случае пропажи интернета во время вызова метода апи
	if (error.code === 3 && error.type === 'client_error') {
		error.type = VkSdkError.NETWORK_ERROR
	}
	//Пользователь что-то запретил
	if (error.code === 4 && error.type === 'client_error') {
		error.type = VkSdkError.ACCESS_ERROR
	}

	//Пользователь что-то запретил (такое приходи когда на вебе отказаться от публикации записи на стене)
	if (error.message.indexOf('Operation denied by user') !==-1) {
		error.type = VkSdkError.ACCESS_ERROR
	}

	// Кастуем ситацию запроса токена и отстуствия интернета на андроид
	if (object && object.error_type && object.error_type === 'auth_error') {
		if (object && object.error_data) {
			const data = object.error_data
			if (data.error_reason === "" && data.error === "") {
				error.type = VkSdkError.NETWORK_ERROR
			}
		}
	}

	// Обработка ситации запроса токена и отстуствия интернета на iOS https://vk.com/bug204658
	if (object && object.error_type && object.error_type === 'auth_error') {
		if (object && object.error_data) {
			const data = object.error_data
			// Коды ошибок подсмотрели тут https://github.com/apple/swift/blob/3a75394c670bb7143397327ac7bf5b5fe8d50588/stdlib/public/SDK/Foundation/NSError.swift#L642
			if (data.error_code < 0 && data.error_code > -4000) {
				error.type = VkSdkError.NETWORK_ERROR
				error.message = data.error_description || error.message
			}
		}
	}
	if (ex) {
		error.message += " " + ex
	}
	return error
}


export const VK_API_AUTH_FAIL = 5
export const VK_API_UNKNOWN_ERROR = 1
export const VK_API_TOO_MANY_REQUEST = 6
export const VK_API_TOO_MANY_SAME_ACTIONS = 9

/*
Считается @in что если вызов апи вернулся с этим кодом, то запрос можно повторить
 */
export const SOFT_ERROR_CODES = [
	VK_API_UNKNOWN_ERROR, //Произошла неизвестная ошибка.
	VK_API_TOO_MANY_REQUEST, //Слишком много запросов в секунду.
	VK_API_TOO_MANY_SAME_ACTIONS, //Слишком много однотипных действий.
]

export function delay(time) {
	return new Promise(resolve => setTimeout(resolve, time))
}

export default class VkSdk {

	static startParams = null
	static startSearch = ""
	static defaultApiVersion = '5.103'
	static tokenCache = {}

	/**
	 * Возвращает объект с параметрами запуска приложения
	 * @returns {VkStartParams}
	 */
	static getStartParams() {
		if (VkSdk.startParams === null) {
			VkSdk.startParams = VkStartParamsBuilder.fromQueryParams(queryString.parse(window.location.search))
			VkSdk.startSearch = window.location.search
		}
		return VkSdk.startParams
	}

	/**
	 * Подписаться на соббытие VkConnect
	 * @param {string} event - Тип события VkConnect
	 * @param {function} callback - колбек
	 * @deprecated
	 */
	static subscribeEvent(event, callback) {
		VkConnectObserver.subscribe(event, callback)
	}

	/**
	 * Отписаться от соббытия VkConnect
	 * @param {string} event - Тип события VkConnect
	 * @param {function} callback - колбек
	 * @deprecated
	 */
	static unsubscribeEvent(event, callback) {
		VkConnectObserver.unsubscribe(event, callback)
	}

	/**
	 * Подписаться на соббытие VkConnect
	 * @param {string} event - Тип события VkConnect
	 * @param {function} callback - колбек
	 */
	static subscribe(event, callback) {
		VkConnectObserver.subscribe(event, callback)
	}

	/**
	 * Отписаться от соббытия VkConnect
	 * @param {string} event - Тип события VkConnect
	 * @param {function} callback - колбек
	 */
	static unsubscribe(event, callback) {
		VkConnectObserver.unsubscribe(event, callback)
	}

	/**
	 * Проверяет, поддерживается ли событие на текущей платформе.
	 * @param {string} method
	 * @return {boolean}
	 */
	static supports(method) {
		return VKBridge.supports(method)
	}

	/**
	 * Инициализация VK Connect
	 * Первое событие, которое Ваше приложение должно отправить официальному приложению, чтобы начать работу с VK Connect.
	 * В противном случае сервис может не работать на мобильных клиентах iOS и Android.
	 */
	static init() {
		return VKBridge.send("VKWebAppInit", {}).catch(e => {
			throw castToError(e, "VKWebAppInit")
		})
	}

	/**
	 * Получение данных профиля
	 * Позволяет получить основные данные о профиле текущего пользователя.
	 * @returns {Promise}
	 */
	static getUserInfo() {
		return VKBridge.send('VKWebAppGetUserInfo', {}).catch(e => {
			throw castToError(e, "VKWebAppGetUserInfo")
		})
	}

	/**
	 * Получение номера телефона
	 * Позволяет получить номер телефона текущего пользователя.
	 * Официальное приложение отображает экран с запросом разрешения пользователя на передачу его номера телефона в приложение.
	 * @returns {Promise}
	 */
	static getPhoneNumber() {
		return VKBridge.send('VKWebAppGetPhoneNumber', {}).catch(e => {
			throw castToError(e, "VKWebAppGetPhoneNumber")
		})
	}

	/**
	 * Получение e-mail
	 * Позволяет получить адрес электронной почты пользователя.
	 * После вызова отображает экран с запросом прав на доступ к e-mail.
	 * @returns {Promise}
	 */
	static getEmail() {
		return VKBridge.send('VKWebAppGetEmail', {}).catch(e => {
			throw castToError(e, "VKWebAppGetEmail")
		})
	}

	/**
	 * Получение геопозиции
	 * Позволяет получить данные о геопозиции пользователя. Событие не принимает параметров.
	 * Официальное приложение показывает окно с запросом разрешения на передачу местоположения.
	 * @returns {Promise}
	 */
	static getGeodata() {
		return VKBridge.send('VKWebAppGetGeodata', {}).catch(e => {
			throw castToError(e, "VKWebAppGetGeodata")
		})
	}

	/**
	 * Выбор контакта из телефонной книги
	 * Открывает окно выбора контактов из телефонной книги на устройстве пользователя.
	 * @returns {Promise<{phone:string,first_name:string}>}
	 */
	static openContacts() {
		return VKBridge.send('VKWebAppOpenContacts', {}).catch(e => {
			throw castToError(e, "VKWebAppOpenContacts")
		})
	}

	/**
	 * Авторизация пользователя
	 * Позволяет запросить права доступа у пользователя и получить ключ для работы с API.
	 * Для получения токена без дополнительных прав передайте в параметре пустую строку.
	 * @param {string} scope - Список прав доступа, перечисленных через запятую. {@url  https://vk.com/dev/permissions}
	 * @param {number|null} appId
	 * @returns {Promise}
	 */
	static getAuthToken(scope = '', appId = null) {
		const params = {
			app_id: appId || this.getStartParams().appId, scope
		}
		return VKBridge.send('VKWebAppGetAuthToken', params)
			.catch(e => {
				e = castToError(e)
				e.message = "VKWebAppGetAuthToken error " + JSON.stringify(params) + ": " + e.message
				throw e
			})
	}

	/**
	 * Вызов методов API
	 * Позволяет получить результат вызова метода API ВКонтакте.
	 * Обратите внимание, что для работы с API нужно передать ключ доступа пользователя с соответствующими правами,
	 * полученный с помощью VKWebAppGetAuthToken {@see getAuthToken}
	 * @param {string} method - название метода API. {@url https://vk.com/dev/methods}
	 * @param {Object} params - параметры метода в виде JSON
	 * @param {boolean} cast - обработаывать ошибку
	 * @returns {Promise}
	 */
	static callAPIMethod(method, params = {}, cast = true) {
		if (params.v === undefined) {
			params.v = VkSdk.defaultApiVersion
		}
		const p = VKBridge.send('VKWebAppCallAPIMethod', {method, params})
		if (cast) {
			return p.catch(e => {
				throw castToError(e)
			})
		} else {
			return p
		}

	}

	/**
	 * Вызов методов API с запросов токена если нужно
	 * Позволяет получить результат вызова метода API ВКонтакте.
	 * @param {string} method - название метода API. {@url https://vk.com/dev/methods}
	 * @param {Object} params - параметры метода в виде JSON
	 * @param {string} scope - права необходимые для этого запроса, через запятую
	 * @param {Number} retry - допустимое количество повторов которое можно сделать если с первого раза не получится
	 * @throws VkSdkError
	 * @returns {Promise<Object>}
	 */
	static api(method, params = {}, scope = "", retry = 7) {
		const passedTokenInParams = !!params.access_token
		const p = {...params}
		if (!VkSdk.tokenCache[scope] && !p.access_token) {
			return VkSdk.getAuthToken(scope)
				.then(({access_token, scope: scopeFact}) => {
					if (!isEqualScope(scope, scopeFact)) {
						const error = new VkSdkError("LESS_SCOPE_THAN_REQUEST")
						error.retry = retry
						error.type = VkSdkError.ACCESS_ERROR
						throw error
					}
					if (!access_token) {
						const error = new VkSdkError("ACCESS_TOKEN_NOT_RETURNED_FROM_VK")
						error.retry = retry
						error.type = VkSdkError.ACCESS_ERROR
						throw error
					}
					VkSdk.tokenCache[scope] = access_token
					return VkSdk.api(method, params, scope, retry - 1)
				})
				.catch(e => {
					const err = isVkApiError(e) ? castToVkApi(e) : castToError(e)
					err.retry = retry
					throw e
				})
		}

		if (!p.access_token) {
			p.access_token = VkSdk.tokenCache[scope]
		}

		return VkSdk.callAPIMethod(method, p, false)
			.catch(e => {
				if (!isVkApiError(e)) {
					const e = castToError(e)
					e.retry = retry
					e.message = "API: " + method + ': ' + e.message
					throw e
				}
				const vkError = castToVkApi(e)
				vkError.retry = retry
				if (retry <= 0) {
					throw vkError
				}
				if (vkError.code === VK_API_AUTH_FAIL) {
					if (passedTokenInParams) {
						throw vkError
					}
					delete VkSdk.tokenCache[scope]
					return VkSdk.api(method, params, scope, retry - 1)
				}
				if (SOFT_ERROR_CODES.indexOf(vkError.code) !== -1) {
					return delay(300)
						.then(() => VkSdk.api(method, params, scope, retry - 1))
				}
				throw vkError
			})
	}

	/**
	 * Вызов диалога Share
	 * Позволяет поделиться ссылкой
	 * @returns {Promise}
	 */
	static share(link = undefined) {
		return VKBridge.send('VKWebAppShare', {link}).catch(e => {
			throw castToError(e, "VKWebAppShare")
		})
	}

	/**
	 * Публикация записей на стене
	 * @param {Object} params - См. описание метода wall.post. {@url https://vk.com/dev/wall.post}
	 * Позволяет пользователю опубликовать запись на стене
	 * @returns {Promise}
	 */
	static showWallPostBox(params = {}) {
		return VKBridge.send('VKWebAppShowWallPostBox', params).catch(e => {
			throw castToError(e, "VKWebAppShowWallPostBox")
		})
	}

	/**
	 * Нативный просмотр изображений iOS, Android
	 * @param {string[]} images
	 * @param {number} start_index
	 * @return {Promise}
	 */
	static showImages(images, start_index = 0) {
		return VKBridge.send("VKWebAppShowImages", {images, start_index}).catch(e => {
			throw castToError(e, "VKWebAppShowImages")
		})
	}

	static canShowImage() {
		return VKBridge.supports("VKWebAppShowImages")
	}

	/**
	 * Получение версии официального приложения
	 * Возвращает номер версии официального приложения ВКонтакте.
	 * @returns {Promise}
	 */
	static getClientVersion() {
		return VKBridge.send('VKWebAppGetClientVersion', {}).catch(e => {
			throw castToError(e, "VKWebAppGetClientVersion")
		})
	}

	/**
	 * Платёж VK Pay
	 * Поднимает экран VK Pay для платежа
	 * @param {"pay-to-service"|"pay-to-user"|"pay-to-group"|"transfer-to-group"|"transfer-to-user"} action -
	 * @param {{amount:number,description:string,data:object,group_id:number}|{amount:number,description:string,user_id:number}|{description:string,user_id:number}|{description:string,group_id:number}} params - параметры платёжной формы VK Pay
	 * @param {number|null} appId
	 * @returns {Promise}
	 */
	static openPayForm(action, params, appId = null) {
		return VKBridge.send('VKWebAppOpenPayForm', {
			app_id: appId || VkSdk.getStartParams().appId,
			action,
			params
		}).catch(e => {
			throw castToError(e, 'VKWebAppOpenPayForm')
		})
	}

	/**
	 * Включение уведомлений
	 * Позволяет запросить у пользователя разрешение на отправку уведомлений от приложения.
	 * @returns {Promise}
	 */
	static allowNotifications() {
		return VKBridge.send("VKWebAppAllowNotifications", {}).catch(e => {
			throw castToError(e, "VKWebAppAllowNotifications")
		})
	}

	/**
	 * Выключение уведомлений
	 * Позволяет отключить уведомления от приложения.
	 * @returns {Promise}
	 */
	static denyNotifications() {
		return VKBridge.send('VKWebAppDenyNotifications', {}).catch(e => {
			throw castToError(e, "VKWebAppDenyNotifications")
		})
	}

	/**
	 * Добавление сервиса в избранные
	 * вызывает окно запроса на добавление сервиса в избранное.
	 * @return {Promise<{result:boolean}>}
	 */
	static addToFavorites() {
		return VKBridge.send("VKWebAppAddToFavorites", {}).catch(e => {
			throw castToError(e, "VKWebAppAddToFavorites")
		})
	}

	/**
	 * Сканирование QR-кода
	 * позволяет открыть камеру для считывания QR-кода и получить результат сканирования. (только для мобильных устройств)
	 * @return {Promise<{code_data:string}>}
	 */
	static openCodeReader() {
		return VKBridge.send("VKWebAppOpenCodeReader", {}).catch(e => {
			throw castToError(e, "VKWebAppOpenCodeReader")
		})
	}

	static canOpenCodeReader() {
		return VKBridge.supports("VKWebAppOpenCodeReader")
	}

	/**
	 * Сканирование QR-кода
	 * Позволяет открыть камеру для считывания QR-кода и получить результат сканирования.
	 * @deprecated openCodeReader
	 * @returns {Promise}
	 */
	static openQR() {
		return VKBridge.send('VKWebAppOpenQR', {}).catch(e => {
			throw castToError(e, "VKWebAppOpenQR")
		})
	}

	/**
	 * Установка хэша
	 * Позволяет установить новое значение хэша
	 * @returns {Promise}
	 */
	static setLocation(location) {
		return VKBridge.send('VKWebAppSetLocation', {location}).catch(e => {
			throw castToError(e, "VKWebAppSetLocation")
		})
	}

	/**
	 * Подписка на сообщения сообщества
	 * Позволяет запросить у пользователя разрешение на отправку сообщений от имени сообщества.
	 * @param {int} groupId - идентификатор сообщества
	 * @param {string} key - произвольная строка. Этот параметр можно использовать для идентификации пользователя.
	 * Его значение будет возвращено в событии message_allow Callback API.
	 * @returns {Promise}
	 */
	static allowMessagesFromGroup(groupId, key) {
		return VKBridge.send('VKWebAppAllowMessagesFromGroup', {group_id: groupId, key}).catch(e => {
			throw castToError(e, "VKWebAppAllowMessagesFromGroup")
		})
	}

	/**
	 * Получение токена сообщества
	 * @param {string} scope stories,photos,app_widget,messages,docs,manage
	 * @param {number|null} groupId
	 * @param {number|null} appId
	 */
	static getCommunityAuthToken(scope = "messages", groupId = null, appId = null) {
		return VKBridge.send("VKWebAppGetCommunityAuthToken", {
			scope,
			app_id: appId || VkSdk.getStartParams().appId,
			group_id: groupId || VkSdk.getStartParams().groupId
		}).catch(e => {
			throw castToError(e, 'VKWebAppGetCommunityAuthToken')
		})
	}

	/**
	 * Добавление сервиса в сообщество
	 * Обратите внимание: для вызова в управлении приложением https://vk.com/editapp?id={app_id}
	 * должна быть установлена галочка напротив "Разрешить установку в сообществах".
	 * Приложение должно быть включено и доступно всем.
	 * @return {Promise<{group_id:number}>}
	 */
	static addToCommunity() {
		return VKBridge.send("VKWebAppAddToCommunity", {}).catch(e => {
			throw castToError(e, "VKWebAppAddToCommunity")
		})
	}

	/**
	 * Предпросмотр виджета сообщества
	 * Виджетам приложений сообществ посвящено отдельное руководство. (https://vk.com/dev/objects/appWidget) (https://vk.com/dev/apps_widgets)
	 * @param {"text" | "list" | "table" | "tiles" | "compact_list" | "cover_list" | "match" | "matches"} type
	 * @param {string} code
	 * @param {number|null}groupId
	 * @throws VkSdkError
	 * @return {Promise<{result:boolean}>}
	 */
	static showCommunityWidgetPreviewBox(type, code, groupId = null) {
		return VKBridge.send("VKWebAppShowCommunityWidgetPreviewBox", {
			type, code, group_id: groupId || VkSdk.getStartParams().groupId
		}).catch(e => {
			throw castToError(e, 'VKWebAppShowCommunityWidgetPreviewBox')
		})
	}


	/**
	 * Отправка события в сообщество
	 * @param payload
	 * @param {number|null} groupId
	 * @return {Promise<{result:boolean}>}
	 */
	static sendPayload(payload, groupId = null) {
		return VKBridge.send("VKWebAppSendPayload", {
			group_id: groupId || VkSdk.getStartParams().groupId,
			payload
		}).catch(e => {
			throw castToError(e, 'VKWebAppSendPayload')
		})
	}

	/**
	 * Вступление в сообщество
	 * Позволяет пользователю вступить в сообщество.
	 * @param {int} groupId - идентификатор сообщества
	 * @returns {Promise}
	 */
	static joinGroup(groupId) {
		return VKBridge.send('VKWebAppJoinGroup', {group_id: groupId}).catch(e => {
			throw castToError(e, "VKWebAppJoinGroup")
		})
	}

	/**
	 * Открытие другого приложения
	 * @param {int} appId - идентификатор приложения, которое должно быть открыто
	 * @param {string} location - хэш, строка после # в URL вида https://vk.com/app123456#
	 * @returns {Promise}
	 */
	static openApp(appId, location = '') {
		return VKBridge.send('VKWebAppOpenApp', {app_id: appId, location}).catch(e => {
			throw castToError(e, "VKWebAppOpenApp")
		})
	}

	/**
	 * @return {boolean}
	 */
	static canOpenApp() {
		return VKBridge.supports('VKWebAppOpenApp').catch(e => {
			throw castToError(e, "VKWebAppOpenApp")
		})
	}


	/**
	 * Закрытие приложения
	 * @param {"success"|"failed"} status
	 * @param {object} payload
	 * @return {Promise}
	 */
	static close(status = "success", payload = {}) {
		return VKBridge.send("VKWebAppClose", {status, payload}).catch(e => {
			throw castToError(e, "VKWebAppClose")
		})
	}

	static canClose() {
		return VKBridge.supports("VKWebAppClose")
	}

	/**
	 * Копирование текста в буфер обмена
	 * @param text
	 * @return {Promise<{result:boolean}>}
	 */
	static copyText(text) {
		return VKBridge.send("VKWebAppCopyText", {text}).catch(e => {
			throw castToError(e, "VKWebAppCopyText")
		})
	}

	/**
	 *
	 * @return {boolean}
	 */
	static canCopyText() {
		return VKBridge.supports("VKWebAppCopyText")
	}


	/**
	 * Изменение внешнего вида клиента
	 * Клиент устанавливает тему для иконок в статус-баре исходя из параметра
	 * status_bar_style и цвет статус-бара исходя из параметра action_bar_color.
	 * @param {"light" | "dark"} statusBarStyle - тема для иконок статус-бара. Возможные варианты: "light", "dark"
	 * @param {string} actionBarColor - 	цвет экшн-бара. Возможные варианты: hex-код (#00ffff), "none" - прозрачный.
	 * @param {string} navigation_bar_color цвет нав-бара. Возможные варианты: hex-код (#00ffff). Работает только на Android
	 * Параметр работает только на Android
	 * @returns {Promise}
	 */
	static setViewSettings(statusBarStyle, actionBarColor = undefined, navigation_bar_color = undefined) {
		let params = {status_bar_style: statusBarStyle}
		if (actionBarColor) {
			params.action_bar_color = actionBarColor
		}
		if (navigation_bar_color) {
			params.navigation_bar_color
		}
		return VKBridge.send('VKWebAppSetViewSettings', params).catch(e => {
			throw castToError(e, "VKWebAppSetViewSettings")
		})
	}

	static supportSetViewSettings() {
		return VKBridge.supports("VKWebAppSetViewSettings")
	}

	static setViewSettingsIf(statusBarStyle, actionBarColor = undefined, navigation_bar_color = undefined) {
		if (VkSdk.supportSetViewSettings()) {
			return VkSdk.setViewSettings(statusBarStyle, actionBarColor, navigation_bar_color)
		} else {
			return Promise.resolve()
		}
	}

	/**
	 * Прокрутка окна приложения
	 * Инициирует скроллинг окна браузера по вертикали.
	 * @param {int} top - смещение скролла относительно нулевой координаты окна. Верх страницы: top === 0
	 * @param {int} speed
	 * @returns {Promise}
	 */
	static scroll(top, speed = 100) {
		return VKBridge.send('VKWebAppScroll', {top, speed}).catch(e => {
			throw castToError(e, "VKWebAppScroll")
		})
	}

	/**
	 *
	 * @return {boolean}
	 */
	static supportScroll() {
		return VKBridge.supports('VKWebAppScroll')
	}

	/**
	 * Изменение размеров окна приложения
	 * Инициирует изменение ширины и высоты элемента IFrame.
	 * @param {int} width - ширина окна. Может принимать значения от 600px до 1000px
	 * @param {int} height - высота окна. Может принимать значения от 500px до 4050px.
	 * @returns {Promise}
	 */
	static resizeWindow(width, height) {
		return VKBridge.send('VKWebAppResizeWindow', {width, height}).catch(e => {
			throw castToError(e, "VKWebAppResizeWindow")
		})
	}

	/**
	 * Вызов карточки контактов
	 * «Карточка контактов» — это то место, где пользователь указывает контактные данные (номер телефона, адрес, e-mail),
	 * которыми он готов поделиться с сервисами сторонних разработчиков.
	 * @param {"phone"|"email"|"address"[]} type - массив строк. Возможные значения: phone, email, address
	 * @returns {Promise}
	 */
	static getPersonalCard(type) {
		return VKBridge.send('VKWebAppGetPersonalCard', {type}).catch(e => {
			throw castToError(e, "VKWebAppGetPersonalCard")
		})
	}


	/**
	 * Вызов списка друзей пользователя
	 * @param multi
	 * @return {Promise<{users:{id:number,first_name:string,last_name:string}[]}>}
	 */
	static getFriends(multi) {
		return VKBridge.send("VKWebAppGetFriends", {multi}).catch(e => {
			throw castToError(e, "VKWebAppGetFriends")
		})
	}

	/**
	 * @deprecated use getVkBridge
	 * @return {VKBridge}
	 */
	static getVkConnect() {
		return VKBridge
	}

	static getVkBridge() {
		return VKBridge
	}

	/**
	 * Получение значения ключа
	 * @param {string[]} keys
	 * @return {Promise<{keys:{key:string,value:string}[]}>}
	 */
	static storageGet(keys) {
		return VKBridge.send("VKWebAppStorageGet", {keys}).catch(e => {
			throw castToError(e, "VKWebAppStorageGet")
		})
	}

	/**
	 * Установка значения переменной
	 * @param {string} key
	 * @param {string} value
	 * @return {Promise<{result:boolean}>}
	 */
	static storageSet(key, value) {
		return VKBridge.send("VKWebAppStorageSet", {key, value}).catch(e => {
			throw castToError(e, "VKWebAppStorageSet")
		})
	}

	/**
	 * Получение ключей
	 * @param {number} count
	 * @param {number} offset
	 */
	static storageGetKeys(count = 20, offset = 0) {
		return VKBridge.send("VKWebAppStorageGetKeys", {count, offset}).catch(e => {
			throw castToError(e, "VKWebAppStorageGetKeys")
		})
	}

	/**
	 * @param method
	 * @param params
	 * @return {Promise}
	 */
	static send(method, params) {
		return VKBridge.send(method, params)
	}

	/**
	 * Публикация истории
	 * @param {object} params
	 * @return {Promise}
	 */
	static showStoryBox(params) {
		return VKBridge.send('VKWebAppShowStoryBox', params).catch(e => {
			throw castToError(e, "VKWebAppShowStoryBox")
		})
	}

	/**
	 * @return {boolean}
	 */
	static supportShowStoryBox() {
		return VKBridge.supports('VKWebAppShowStoryBox')
	}

	static tapticImpactOccurred(params = {"style": "light"}) {
		return VKBridge.send('VKWebAppTapticImpactOccurred', params).catch(e => {
			throw castToError(e, "VKWebAppTapticImpactOccurred")
		})
	}

	static tapticNotificationOccurred(params = {"type": "success"}) {
		return VKBridge.send('VKWebAppTapticNotificationOccurred', params).catch(e => {
			throw castToError(e, "VKWebAppTapticNotificationOccurred")
		})
	}

	/**
	 *
	 * @return {boolean}
	 */
	static supportTapticNotificationOccurred() {
		return VKBridge.supports('VKWebAppTapticNotificationOccurred')
	}

	/**
	 *
	 * @return {boolean}
	 */
	static supportTapticImpactOccurred() {
		return VKBridge.supports('VKWebAppTapticImpactOccurred')
	}
}

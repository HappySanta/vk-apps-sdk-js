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
		const [error_code, error_msg, error_text] = data
		const err = new VkApiError(error_msg)
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
	return normalize(left) === normalize(right)
}

export function getVkApiErrorCodeAndMessage(object) {
	if (!object) return null
	const {error_data, error_type} = object
	if (error_data === undefined && error_type === undefined) {
		return null
	}
	const {error_code, error_reason, error_msg, error_text} = error_data
	if (error_code === undefined && error_reason === undefined) {
		return null
	}
	if (error_code !== undefined && error_msg) {
		return [error_code, error_msg, error_text]
	}
	if (typeof error_reason === "object" && error_reason) {
		const {error_code, error_msg, error_text} = error_reason
		if (error_code !== undefined && error_msg) {
			return [error_code, error_msg, error_text]
		}
	}
	return null
}

export function castToError(object) {
	if (object instanceof Error) {
		return object
	}
	const error = new VkSdkError(JSON.stringify(object) || "SUPER UNKNOWN ERROR BY @happysanta/vk-apps-sdk library")
	error.origin = object
	if (object && object.error_data && object.error_data.error_reason) {
		error.message = `#${object.error_data.error_code} ${object.error_data.error_reason}`
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

	//На iOS такой набор ошибок в случек пропаши интернета и вызове сетода апи
	if (error.code === 3 && error.type === 'client_error') {
		error.type = VkSdkError.NETWORK_ERROR
	}
	if (error.code === 4 && error.type === 'client_error') {
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
		return VKBridge.send("VKWebAppInit", {})
	}

	/**
	 * Получение данных профиля
	 * Позволяет получить основные данные о профиле текущего пользователя.
	 * @returns {Promise}
	 */
	static getUserInfo() {
		return VKBridge.send('VKWebAppGetUserInfo', {})
	}

	/**
	 * Получение номера телефона
	 * Позволяет получить номер телефона текущего пользователя.
	 * Официальное приложение отображает экран с запросом разрешения пользователя на передачу его номера телефона в приложение.
	 * @returns {Promise}
	 */
	static getPhoneNumber() {
		return VKBridge.send('VKWebAppGetPhoneNumber', {})
	}

	/**
	 * Получение e-mail
	 * Позволяет получить адрес электронной почты пользователя.
	 * После вызова отображает экран с запросом прав на доступ к e-mail.
	 * @returns {Promise}
	 */
	static getEmail() {
		return VKBridge.send('VKWebAppGetEmail', {})
	}

	/**
	 * Получение геопозиции
	 * Позволяет получить данные о геопозиции пользователя. Событие не принимает параметров.
	 * Официальное приложение показывает окно с запросом разрешения на передачу местоположения.
	 * @returns {Promise}
	 */
	static getGeodata() {
		return VKBridge.send('VKWebAppGetGeodata', {})
	}

	/**
	 * Выбор контакта из телефонной книги
	 * Открывает окно выбора контактов из телефонной книги на устройстве пользователя.
	 * @returns {Promise<{phone:string,first_name:string}>}
	 */
	static openContacts() {
		return VKBridge.send('VKWebAppOpenContacts', {})
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
	 * @returns {Promise}
	 */
	static callAPIMethod(method, params = {}) {
		if (params.v === undefined) {
			params.v = VkSdk.defaultApiVersion
		}
		return VKBridge.send('VKWebAppCallAPIMethod', {method, params})
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

		return VkSdk.callAPIMethod(method, p)
			.catch(e => {
				if (!isVkApiError(e)) {
					const e = castToError(e)
					e.retry = retry
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
		return VKBridge.send('VKWebAppShare', {link})
	}

	/**
	 * Публикация записей на стене
	 * @param {Object} params - См. описание метода wall.post. {@url https://vk.com/dev/wall.post}
	 * Позволяет пользователю опубликовать запись на стене
	 * @returns {Promise}
	 */
	static showWallPostBox(params = {}) {
		return VKBridge.send('VKWebAppShowWallPostBox', params)
	}

	/**
	 * Нативный просмотр изображений iOS, Android
	 * @param {string[]} images
	 * @param {number} start_index
	 * @return {Promise}
	 */
	static showImages(images, start_index = 0) {
		return VKBridge.send("VKWebAppShowImages", {images, start_index})
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
		return VKBridge.send('VKWebAppGetClientVersion', {})
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
		return VKBridge.send('VKWebAppOpenPayForm', {app_id: appId || VkSdk.getStartParams().appId, action, params})
	}

	/**
	 * Включение уведомлений
	 * Позволяет запросить у пользователя разрешение на отправку уведомлений от приложения.
	 * @returns {Promise}
	 */
	static allowNotifications() {
		return VKBridge.send("VKWebAppAllowNotifications", {})
	}

	/**
	 * Выключение уведомлений
	 * Позволяет отключить уведомления от приложения.
	 * @returns {Promise}
	 */
	static denyNotifications() {
		return VKBridge.send('VKWebAppDenyNotifications', {})
	}

	/**
	 * Добавление сервиса в избранные
	 * вызывает окно запроса на добавление сервиса в избранное.
	 * @return {Promise<{result:boolean}>}
	 */
	static addToFavorites() {
		return VKBridge.send("VKWebAppAddToFavorites", {})
	}

	/**
	 * Сканирование QR-кода
	 * позволяет открыть камеру для считывания QR-кода и получить результат сканирования. (только для мобильных устройств)
	 * @return {Promise<{code_data:string}>}
	 */
	static openCodeReader() {
		return VKBridge.send("VKWebAppOpenCodeReader", {})
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
		return VKBridge.send('VKWebAppOpenQR', {})
	}

	/**
	 * Установка хэша
	 * Позволяет установить новое значение хэша
	 * @returns {Promise}
	 */
	static setLocation(location) {
		return VKBridge.send('VKWebAppSetLocation', {location})
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
		return VKBridge.send('VKWebAppAllowMessagesFromGroup', {group_id: groupId, key})
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
		return VKBridge.send("VKWebAppAddToCommunity", {})
	}

	/**
	 * Предпросмотр виджета сообщества
	 * Виджетам приложений сообществ посвящено отдельное руководство. (https://vk.com/dev/objects/appWidget) (https://vk.com/dev/apps_widgets)
	 * @param {"text" | "list" | "table" | "tiles" | "compact_list" | "cover_list" | "match" | "matches"} type
	 * @param {string} code
	 * @param {number|null}groupId
	 * @return {Promise<{result:boolean}>}
	 */
	static showCommunityWidgetPreviewBox(type, code, groupId = null) {
		return VKBridge.send("VKWebAppShowCommunityWidgetPreviewBox", {
			type, code, group_id: groupId || VkSdk.getStartParams().groupId
		})
	}


	/**
	 * Отправка события в сообщество
	 * @param payload
	 * @param {number|null} groupId
	 * @return {Promise<{result:boolean}>}
	 */
	static sendPayload(payload, groupId = null) {
		return VKBridge.send("VKWebAppSendPayload", {group_id: groupId || VkSdk.getStartParams().groupId, payload})
	}

	/**
	 * Вступление в сообщество
	 * Позволяет пользователю вступить в сообщество.
	 * @param {int} groupId - идентификатор сообщества
	 * @returns {Promise}
	 */
	static joinGroup(groupId) {
		return VKBridge.send('VKWebAppJoinGroup', {group_id: groupId})
	}

	/**
	 * Открытие другого приложения
	 * @param {int} appId - идентификатор приложения, которое должно быть открыто
	 * @param {string} location - хэш, строка после # в URL вида https://vk.com/app123456#
	 * @returns {Promise}
	 */
	static openApp(appId, location = '') {
		return VKBridge.send('VKWebAppOpenApp', {app_id: appId, location})
	}

	/**
	 * @return {boolean}
	 */
	static canOpenApp() {
		return VKBridge.supports('VKWebAppOpenApp')
	}


	/**
	 * Закрытие приложения
	 * @param {"success"|"failed"} status
	 * @param {object} payload
	 * @return {Promise}
	 */
	static close(status = "success", payload = {}) {
		return VKBridge.send("VKWebAppClose", {status, payload})
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
		return VKBridge.send("VKWebAppCopyText", {text})
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
		return VKBridge.send('VKWebAppSetViewSettings', params)
	}

	/**
	 * Прокрутка окна приложения
	 * Инициирует скроллинг окна браузера по вертикали.
	 * @param {int} top - смещение скролла относительно нулевой координаты окна. Верх страницы: top === 0
	 * @param {int} speed
	 * @returns {Promise}
	 */
	static scroll(top, speed = 100) {
		return VKBridge.send('VKWebAppScroll', {top, speed})
	}

	/**
	 * Изменение размеров окна приложения
	 * Инициирует изменение ширины и высоты элемента IFrame.
	 * @param {int} width - ширина окна. Может принимать значения от 600px до 1000px
	 * @param {int} height - высота окна. Может принимать значения от 500px до 4050px.
	 * @returns {Promise}
	 */
	static resizeWindow(width, height) {
		return VKBridge.send('VKWebAppResizeWindow', {width, height})
	}

	/**
	 * Вызов карточки контактов
	 * «Карточка контактов» — это то место, где пользователь указывает контактные данные (номер телефона, адрес, e-mail),
	 * которыми он готов поделиться с сервисами сторонних разработчиков.
	 * @param {"phone"|"email"|"address"[]} type - массив строк. Возможные значения: phone, email, address
	 * @returns {Promise}
	 */
	static getPersonalCard(type) {
		return VKBridge.send('VKWebAppGetPersonalCard', {type})
	}


	/**
	 * Вызов списка друзей пользователя
	 * @param multi
	 * @return {Promise<{users:{id:number,first_name:string,last_name:string}[]}>}
	 */
	static getFriends(multi) {
		return VKBridge.send("VKWebAppGetFriends", {multi})
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
		return VKBridge.send("VKWebAppStorageGet", {keys})
	}

	/**
	 * Установка значения переменной
	 * @param {string} key
	 * @param {string} value
	 * @return {Promise<{result:boolean}>}
	 */
	static storageSet(key, value) {
		return VKBridge.send("VKWebAppStorageSet", {key, value})
	}

	/**
	 * Получение ключей
	 * @param {number} count
	 * @param {number} offset
	 */
	static storageGetKeys(count = 20, offset = 0) {
		return VKBridge.send("VKWebAppStorageGetKeys", {count, offset})
	}

	/**
	 * @param method
	 * @param params
	 * @return {Promise}
	 */
	static send(method, params) {
		return VKBridge.send(method, params)
	}
}

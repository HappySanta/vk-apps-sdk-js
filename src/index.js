import queryString from 'query-string'
import VkStartParamsBuilder from "./VkStartParamsBuilder"
import {VkConnectRequest} from "./VkConnectRequest"
import VkConnectObserver from "./VkConnectObserver"
import VKConnect from "@vkontakte/vk-connect"

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
Считается что если вызов апи вернулся с этим кодом, то запрос можно повторить
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
	 */
	static subscribeEvent(event, callback) {
		VkConnectObserver.subscribe(event, callback)
	}

	/**
	 * Отписаться от соббытия VkConnect
	 * @param {string} event - Тип события VkConnect
	 * @param {function} callback - колбек
	 */
	static unsubscribeEvent(event, callback) {
		VkConnectObserver.unsubscribe(event, callback)
	}

	/**
	 * Возвращает объект для запроса в VkConnect
	 * @param command - Команда в VkConnect
	 * @param params - параметры запроса
	 * @param successEvent - колбек при успешном выполнении
	 * @param failEvent - колбек при неуспешном выполнении
	 * @returns {VkConnectRequest}
	 */
	static getRequest(command, params = {}, successEvent = undefined, failEvent = undefined) {
		return new VkConnectRequest(command, params, successEvent, failEvent)
	}

	/**
	 * Инициализация VK Connect
	 * Первое событие, которое Ваше приложение должно отправить официальному приложению, чтобы начать работу с VK Connect.
	 * В противном случае сервис может не работать на мобильных клиентах iOS и Android.
	 */
	static init() {
		return new VkConnectRequest('VKWebAppInit', {}).send()
	}

	/**
	 * Получение данных профиля
	 * Позволяет получить основные данные о профиле текущего пользователя.
	 * @returns {Promise}
	 */
	static getUserInfo() {
		return new VkConnectRequest('VKWebAppGetUserInfo', {},
			'VKWebAppGetUserInfoResult', 'VKWebAppGetUserInfoFailed').send()
	}

	/**
	 * Получение номера телефона
	 * Позволяет получить номер телефона текущего пользователя.
	 * Официальное приложение отображает экран с запросом разрешения пользователя на передачу его номера телефона в приложение.
	 * @returns {Promise}
	 */
	static getPhoneNumber() {
		return new VkConnectRequest('VKWebAppGetPhoneNumber', {}, 'VKWebAppGetPhoneNumberResult', 'VKWebAppGetPhoneNumberFailed').send()
	}

	/**
	 * Получение e-mail
	 * Позволяет получить адрес электронной почты пользователя.
	 * После вызова отображает экран с запросом прав на доступ к e-mail.
	 * @returns {Promise}
	 */
	static getEmail() {
		return new VkConnectRequest('VKWebAppGetEmail', {}, 'VKWebAppGetEmailResult', 'VKWebAppGetEmailFailed').send()
	}

	/**
	 * Получение геопозиции
	 * Позволяет получить данные о геопозиции пользователя. Событие не принимает параметров.
	 * Официальное приложение показывает окно с запросом разрешения на передачу местоположения.
	 * @returns {Promise}
	 */
	static getGeodata() {
		return new VkConnectRequest('VKWebAppGetGeodata', {}, 'VKWebAppGeodataResult', 'VKWebAppGeodataFailed').send()
	}

	/**
	 * Выбор контакта из телефонной книги
	 * Открывает окно выбора контактов из телефонной книги на устройстве пользователя.
	 * @returns {Promise}
	 */
	static openContacts() {
		return new VkConnectRequest('VKWebAppOpenContacts', {}, 'VKWebAppContactsDone', 'VKWebAppContactsClosed').send()
	}

	/**
	 * Авторизация пользователя
	 * Позволяет запросить права доступа у пользователя и получить ключ для работы с API.
	 * Для получения токена без дополнительных прав передайте в параметре пустую строку.
	 * @param {string} scope - Список прав доступа, перечисленных через запятую. {@url  https://vk.com/dev/permissions}
	 * @returns {Promise}
	 */
	static getAuthToken(scope = '') {
		const params = {
			app_id: this.getStartParams().appId, scope
		}
		return (new VkConnectRequest('VKWebAppGetAuthToken', params, 'VKWebAppAccessTokenReceived', 'VKWebAppAccessTokenFailed'))
			.send()
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
	 * @param {string} requestId - произвольная строка, которая вернётся вместе с результатом запроса.
	 * Используйте requestId для отслеживания уникальности запросов.
	 * @returns {Promise}
	 */
	static callAPIMethod(method, params = {}, requestId = undefined) {
		if (params.v === undefined) {
			params.v = VkSdk.defaultApiVersion
		}
		return new VkConnectRequest('VKWebAppCallAPIMethod', {
			method, params
		}, 'VKWebAppCallAPIMethodResult', 'VKWebAppCallAPIMethodFailed').send(requestId)
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
	static api(method, params = {}, scope = "", retry = 5) {
		const passedTokenInParams = !!params.access_token
		const p = {...params}
		if (!VkSdk.tokenCache[scope] && !p.access_token) {
			return VkSdk.getAuthToken(scope)
				.then(({access_token, scope: scopeFact}) => {
					if (!isEqualScope(scope, scopeFact)) {
						const error = new VkSdkError("LESS_SCOPE_THAN_REQUEST")
						error.type = VkSdkError.ACCESS_ERROR
						throw error
					}
					if (!access_token) {
						const error = new VkSdkError("ACCESS_TOKEN_NOT_RETURNED_FROM_VK")
						error.type = VkSdkError.ACCESS_ERROR
						throw error
					}
					VkSdk.tokenCache[scope] = access_token
					return VkSdk.api(method, params, scope, retry - 1)
				})
				.catch(e => {
					if (isVkApiError(e)) {
						throw castToVkApi(e)
					}
					throw castToError(e)
				})
		}

		if (!p.access_token) {
			p.access_token = VkSdk.tokenCache[scope]
		}

		return VkSdk.callAPIMethod(method, p)
			.catch(e => {
				if (!isVkApiError(e)) {
					throw castToError(e)
				}
				const vkError = castToVkApi(e)
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
		return new VkConnectRequest('VKWebAppShare', {link}, 'VKWebAppShareResult', 'VKWebAppShareFailed').send()
	}

	/**
	 * Публикация записей на стене
	 * @param {Object} params - См. описание метода wall.post. {@url https://vk.com/dev/wall.post}
	 * Позволяет пользователю опубликовать запись на стене
	 * @returns {Promise}
	 */
	static showWallPostBox(params = {}) {
		return new VkConnectRequest('VKWebAppShowWallPostBox', params,
			'VKWebAppShowWallPostBoxResult', 'VKWebAppShowWallPostBoxFailed').send()
	}

	/**
	 * Получение версии официального приложения
	 * Возвращает номер версии официального приложения ВКонтакте.
	 * @returns {Promise}
	 */
	static getClientVersion() {
		return new VkConnectRequest('VKWebAppGetClientVersion', {}, 'VKWebAppGetClientVersionResult').send()
	}

	/**
	 * Платёж VK Pay
	 * Поднимает экран VK Pay для платежа
	 * @param {string} action - pay-to-service|pay-to-user|pay-to-group
	 * @param {Object} params - параметры платёжной формы VK Pay
	 * @returns {Promise}
	 */
	static openPayForm(action, params) {
		return new VkConnectRequest('VKWebAppOpenPayForm', {
			app_id: this.getStartParams().appId, action, params
		}, 'VKWebAppOpenPayFormResult', 'VKWebAppOpenPayFormFailed').send()
	}

	/**
	 * Включение уведомлений
	 * Позволяет запросить у пользователя разрешение на отправку уведомлений от приложения.
	 * @returns {Promise}
	 */
	static allowNotifications() {
		return new VkConnectRequest('VKWebAppAllowNotifications', {},
			'VKWebAppAllowNotificationsResult', 'VKWebAppAllowNotificationsFailed').send()
	}

	/**
	 * Выключение уведомлений
	 * Позволяет отключить уведомления от приложения.
	 * @returns {Promise}
	 */
	static denyNotifications() {
		return new VkConnectRequest('VKWebAppDenyNotifications', {},
			'VKWebAppDenyNotificationsResult', 'VKWebAppDenyNotificationsFailed').send()
	}

	/**
	 * Установка хэша
	 * Позволяет установить новое значение хэша
	 * @returns {Promise}
	 */
	static setLocation(location) {
		return new VkConnectRequest('VKWebAppSetLocation', {location},
			'VKWebAppSetLocationResult', 'VKWebAppSetLocationFailed').send()
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
		return new VkConnectRequest('VKWebAppAllowMessagesFromGroup', {
			group_id: groupId, key
		}, 'VKWebAppAllowMessagesFromGroupResult', 'VKWebAppAllowMessagesFromGroupFailed').send()
	}

	/**
	 * Вступление в сообщество
	 * Позволяет пользователю вступить в сообщество.
	 * @param {int} groupId - идентификатор сообщества
	 * @returns {Promise}
	 */
	static joinGroup(groupId) {
		return new VkConnectRequest('VKWebAppJoinGroup', {group_id: groupId},
			'VKWebAppJoinGroupResult', 'VKWebAppJoinGroupFailed').send()
	}

	/**
	 * Сканирование QR-кода
	 * Позволяет открыть камеру для считывания QR-кода и получить результат сканирования.
	 * @returns {Promise}
	 */
	static openQR() {
		return new VkConnectRequest('VKWebAppOpenQR', {}, 'VKWebAppOpenQRResult', 'VKWebAppOpenQRFailed').send()
	}

	/**
	 * Открытие другого приложения
	 * @param {int} appId - идентификатор приложения, которое должно быть открыто
	 * @param {string} location - хэш, строка после # в URL вида https://vk.com/app123456#
	 * @returns {Promise}
	 */
	static openApp(appId, location = '') {
		return new VkConnectRequest('VKWebAppOpenApp', {
			app_id: appId, location
		}, 'VKWebAppOpenAppResult', 'VKWebAppOpenAppFailed').send()
	}

	/**
	 * Изменение внешнего вида клиента
	 * Клиент устанавливает тему для иконок в статус-баре исходя из параметра
	 * status_bar_style и цвет статус-бара исходя из параметра action_bar_color.
	 * @param {string} statusBarStyle - тема для иконок статус-бара. Возможные варианты: "light", "dark"
	 * @param {string} actionBarColor - 	цвет экшн-бара. Возможные варианты: hex-код (#00ffff), "none" - прозрачный.
	 * Параметр работает только на Android
	 * @returns {Promise}
	 */
	static setViewSettings(statusBarStyle, actionBarColor = undefined) {
		let params = {status_bar_style: statusBarStyle}
		if (actionBarColor) {
			params.action_bar_color = actionBarColor
		}
		return new VkConnectRequest('VKWebAppSetViewSettings', params, 'VKWebAppSetViewSettingsResult', 'VKWebAppSetViewSettingsFailed').send()
	}

	/**
	 * Прокрутка окна приложения
	 * Инициирует скроллинг окна браузера по вертикали.
	 * @param {int} top - смещение скролла относительно нулевой координаты окна. Верх страницы: top === 0
	 * @param {int} speed
	 * @returns {Promise}
	 */
	static scroll(top, speed = 100) {
		return new VkConnectRequest('VKWebAppScroll', {
			top,
			speed
		}, 'VKWebAppScrollResult', 'VKWebAppScrollFailed').send()
	}

	/**
	 * Изменение размеров окна приложения
	 * Инициирует изменение ширины и высоты элемента IFrame.
	 * @param {int} width - ширина окна. Может принимать значения от 600px до 1000px
	 * @param {int} height - высота окна. Может принимать значения от 500px до 4050px.
	 * @returns {Promise}
	 */
	static resizeWindow(width, height) {
		return new VkConnectRequest('VKWebAppResizeWindow', {width, height},
			'VKWebAppResizeWindowResult', 'VKWebAppResizeWindowFailed').send()
	}

	/**
	 * Вызов карточки контактов
	 * «Карточка контактов» — это то место, где пользователь указывает контактные данные (номер телефона, адрес, e-mail),
	 * которыми он готов поделиться с сервисами сторонних разработчиков.
	 * @param {array} type - массив строк. Возможные значения: phone, email, address
	 * @returns {Promise}
	 */
	static getPersonalCard(type) {
		return new VkConnectRequest('VKWebAppGetPersonalCard', {type},
			'VKWebAppGetPersonalCardResult', 'VKWebAppGetPersonalCardFailed').send()
	}

	static getVkConnect() {
		return VKConnect
	}
}

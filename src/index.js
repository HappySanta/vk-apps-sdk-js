import queryString from 'query-string'
import VkStartParamsBuilder from "./VkStartParamsBuilder"
import {VkConnectRequest} from "./VkConnectRequest"
import VkConnectObserver from "./VkConnectObserver"

export default class VkSdk {

	static startParams = null
	static startSearch = ""
	static defaultApiVersion = '5.92'

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
		return new VkConnectRequest('VKWebAppGetAuthToken', {
			app_id: this.getStartParams().appId, scope
		}, 'VKWebAppAccessTokenReceived', 'VKWebAppAccessTokenFailed').send()
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
		return new VkConnectRequest('VKWebAppScroll', {top, speed}, 'VKWebAppScrollResult', 'VKWebAppScrollFailed').send()
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
}

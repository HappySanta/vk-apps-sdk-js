# @happysanta/vk-apps-sdk

## Установка

```sh
npm i @happysanta/vk-apps-sdk
npm i @vkontakte/vk-connect
```

```javascript
import VkSdk from "@happysanta/vk-apps-sdk"
```

## Методы

* [.api()](#api)
* [.getStartParams()](#getstartparams)
* [.subscribeEvent()](#subscribeevent)
* [.unsubscribeEvent()](#unsubscribeevent)
* [.getRequest()](#getrequest)
* [.init()](#init)
* [.getUserInfo()](#getuserinfo)
* [.getPhoneNumber()](#getphonenumber)
* [.getEmail()](#getemail)
* [.getGeodata()](#getgeodata)
* [.openContacts()](#opencontacts)
* [.getAuthToken()](#getauthtoken)
* [.callAPIMethod()](#callapimethod)
* [.share()](#share)
* [.showWallPostBox()](#showwallpostbox)
* [.getClientVersion()](#getclientversion)
* [.openPayForm()](#openpayform)
* [.allowNotifications()](#allownotifications)
* [.denyNotifications()](#denynotifications)
* [.setLocation()](#setlocation)
* [.allowMessagesFromGroup()](#allowmessagesfromgroup)
* [.joinGroup()](#joingroup)
* [.openQR()](#openqr)
* [.openApp()](#openapp)
* [.setViewSettings()](#setviewsettings)
* [.scroll()](#scroll)
* [.resizeWindow()](#resizewindow)
* [.getPersonalCard()](#getpersonalcard)

### api

Вызов метода vk api с запросом прав на токен.
Этот метод сам запросит права через getAuthToken с указаным scope и перезапросит токен если ip поменяется
в случае ошибок вернет объект ошибку типа ```VkSdkError``` с полями
 - ```message``` string
 - ```code``` number код ошибки
 - ```type``` string одна из констант ```VkSdkError.UNKNOWN_TYPE|VkSdkError.CLIENT_ERROR|VkSdkError.API_ERROR|VkSdkError.NETWORK_ERROR|VkSdkError.ACCESS_ERROR```

Запрос может быть отправлен повторно если апи вк вернет один из следующих кодов
 - 1 VK_API_UNKNOWN_ERROR, //Произошла неизвестная ошибка. 
 - 6 VK_API_TOO_MANY_REQUEST, //Слишком много запросов в секунду.
 - 9 VK_API_TOO_MANY_SAME_ACTIONS, //Слишком много однотипных действий.
 
Чобы отключить это поведение передайте ```retry``` аргумент равный 0

Если передать access_token в объекте params, то запрос прав вызван не будет, используйте это если у вас уже есть access_token 

Приимер использования с обработкой ошибок

```javascript
/**
 * Вызов методов API с запросов токена если нужно
 * Позволяет получить результат вызова метода API ВКонтакте.
 * @param {string} method - название метода API. {@url https://vk.com/dev/methods}
 * @param {Object} params - параметры метода в виде JSON
 * @param {string|null} scope - права необходимые для этого запроса, через запятую
 * @param {Number} retry - допустимое количество повторов которое можно сделать если с первого раза не получится
 * @throws VkSdkError
 * @returns {Promise<Object>}
 */
VkSdk.api("users.get", {}, "friends")
.then(({response}) => {

})
.catch(e => {
    switch (e.type) {
        case VkSdkError.NETWORK_ERROR:
            return this.setState({
                error: "Ошибка сети"
            })

        case VkSdkError.ACCESS_ERROR:
            return this.setState({
                error: "Не выдан достп или вы отредактировали доступы"
            })

        case VkSdkError.API_ERROR:
            return this.setState({
                error: "Ошибка апи: "+e.message +' '+e.code
            })
/// Следующие типы ошибок никогда не должны быть показаны, но теоритически возможны 
        case VkSdkError.CLIENT_ERROR:
            return this.setState({
                error: "Не известная ошибка от вк коннект: "+e.message +' '+e.code
            })
        case VkSdkError.UNKNOWN_TYPE:
            return this.setState({
                error: "Не известная ошибка от неисзвестно чего: "+e.message +' '+e.code
            })
        default:
            return this.setState({
                error: "Супер неизвестная ошибка"
            })
    }
})
```

### getStartParams

Возвращает объект с параметрами запуска приложения

```javascript
VkSdk.getStartParams()
```

### init

Инициализация VK Connect<br/>
Первое событие, которое Ваше приложение должно отправить официальному приложению, чтобы начать работу с VK Connect.<br/>
В противном случае сервис может не работать на мобильных клиентах iOS и Android.<br/>

```javascript
VkSdk.init()
```

### subscribeevent

Подписаться на соббытие VkConnect
@param {string} event - Тип события VkConnect
@param {function} callback - колбек

```javascript
VkSdk.subscribeEvent(event, callback)
```

### unsubscribeevent

Отписаться от соббытия VkConnect
@param {string} event - Тип события VkConnect
@param {function} callback - колбек

```javascript
VkSdk.unsubscribeEvent(event, callback)
```

### getrequest

Возвращает объект для запроса в VkConnect
@param command - Команда в VkConnect
@param params - параметры запроса
@param successEvent - колбек при успешном выполнении
@param failEvent - колбек при неуспешном выполнении
@returns {VkConnectRequest}

```javascript
VkSdk.getRequest(command, params, successEvent, failEvent)
```

### getUserInfo

Получение данных профиля<br/>
Позволяет получить основные данные о профиле текущего пользователя. <br/>
@returns {Promise}

```javascript
VkSdk.getUserInfo()
```

### getPhoneNumber

Получение номера телефона<br/>
позволяет получить номер телефона текущего пользователя.<br/>
Официальное приложение отображает экран с запросом разрешения пользователя на передачу его номера телефона в приложение.<br/>
@returns {Promise}

```javascript
VkSdk.getPhoneNumber()
```

### getEmail

Получение e-mail<br/>
Позволяет получить адрес электронной почты пользователя.<br/>
После вызова отображает экран с запросом прав на доступ к e-mail.<br/>
@returns {Promise}

```javascript
VkSdk.getEmail()
```

### getGeodata

Получение геопозиции<br/>
Позволяет получить данные о геопозиции пользователя. Событие не принимает параметров.<br/>
Официальное приложение показывает окно с запросом разрешения на передачу местоположения.<br/>
@returns {Promise}

```javascript
VkSdk.getGeodata()
```

### openContacts

Выбор контакта из телефонной книги<br/>
Открывает окно выбора контактов из телефонной книги на устройстве пользователя.<br/>
@returns {Promise}

```javascript
VkSdk.openContacts()
```

### getAuthToken

Авторизация пользователя<br/>
Позволяет запросить права доступа у пользователя и получить ключ для работы с API.<br/>
Для получения токена без дополнительных прав передайте в параметре пустую строку.<br/>
@param {string} scope - Список прав доступа, перечисленных через запятую. [Список прав](https://vk.com/dev/permissions)
@returns {Promise}

```javascript
VkSdk.getAuthToken(scope)
```

### callAPIMethod

Вызов методов API<br/>
Позволяет получить результат вызова метода API ВКонтакте.<br/>
Обратите внимание, что для работы с API нужно передать ключ доступа пользователя с соответствующими правами,<br/>
полученный с помощью VKWebAppGetAuthToken<br/>
@param {string} method - название метода API. [Список методов](https://vk.com/dev/methods)<br/>
@param {Object} params - параметры метода в виде JSON<br/>
@param {string} requestId - произвольная строка, которая вернётся вместе с результатом запроса.<br/>
Используйте requestId для отслеживания уникальности запросов.<br/>
@returns {Promise}

```javascript
VkSdk.callAPIMethod(method, params, requestId)
```

### share

Вызов диалога Share<br/>
Позволяет поделиться ссылкой<br/>
@returns {Promise}

```javascript
VkSdk.share(link)
```

### showWallPostBox

Публикация записей на стене<br/>
@param {Object} params - См. описание метода [wall.post](https://vk.com/dev/wall.post)<br/>
Позволяет пользователю опубликовать запись на стене<br/>
@returns {Promise}


```javascript
VkSdk.showWallPostBox(params)
```

### getClientVersion

Получение версии официального приложения<br/>
Возвращает номер версии официального приложения ВКонтакте.<br/>
@returns {Promise}

```javascript
VkSdk.getClientVersion()
```

### openPayForm

Платёж VK Pay<br/>
Поднимает экран VK Pay для платежа<br/>
@param {string} action - pay-to-service|pay-to-user|pay-to-group<br/>
@param {Object} params - параметры платёжной формы VK Pay<br/>
@returns {Promise}

```javascript
VkSdk.openPayForm(action, params)
```

### allowNotifications

Включение уведомлений<br/>
Позволяет запросить у пользователя разрешение на отправку уведомлений от приложения.<br/>
@returns {Promise}

```javascript
VkSdk.allowNotifications()
```

### denyNotifications

Выключение уведомлений<br/>
Позволяет отключить уведомления от приложения.<br/>
@returns {Promise}

```javascript
VkSdk.denyNotifications()
```

### setLocation

Установка хэша<br/>
Позволяет установить новое значение хэша<br/>
@returns {Promise}

```javascript
VkSdk.setLocation(location)
```

### allowMessagesFromGroup

Подписка на сообщения сообщества<br/>
Позволяет запросить у пользователя разрешение на отправку сообщений от имени сообщества.<br/>
@param {int} groupId - идентификатор сообщества<br/>
@param {string} key - произвольная строка. Этот параметр можно использовать для идентификации пользователя.<br/>
Его значение будет возвращено в событии message_allow Callback API.<br/>
@returns {Promise}

```javascript
VkSdk.allowMessagesFromGroup(groupId, key)
```

### joinGroup

Вступление в сообщество<br/>
Позволяет пользователю вступить в сообщество.<br/>
@param {int} groupId - идентификатор сообщества<br/>
@returns {Promise}

```javascript
VkSdk.joinGroup(groupId)
```

### openQR

Сканирование QR-кода<br/>
Позволяет открыть камеру для считывания QR-кода и получить результат сканирования.<br/>
@returns {Promise}

```javascript
VkSdk.openQR()
```

### openApp

Открытие другого приложения<br/>
@param {int} appId - идентификатор приложения, которое должно быть открыто<br/>
@param {string} location - хэш, строка после # в URL вида https://vk.com/app123456#<br/>
@returns {Promise}

```javascript
VkSdk.openApp(appId, location)
```

### setViewSettings

Изменение внешнего вида клиента
Клиент устанавливает тему для иконок в статус-баре исходя из параметра<br/>
status_bar_style и цвет статус-бара исходя из параметра action_bar_color.<br/>
@param {string} statusBarStyle - тема для иконок статус-бара. Возможные варианты: "light", "dark"<br/>
@param {string} actionBarColor - 	цвет экшн-бара. Возможные варианты: hex-код (#00ffff), "none" - прозрачный.<br/>
Параметр работает только на Android<br/>
@returns {Promise}

```javascript
VkSdk.setViewSettings(statusBarStyle, actionBarColor)
```

### scroll

Прокрутка окна приложения<br/>
Инициирует скроллинг окна браузера по вертикали.<br/>
@param {int} top - смещение скролла относительно нулевой координаты окна. Верх страницы: top === 0<br/>
@param {int} speed
@returns {Promise}

```javascript
VkSdk.scroll(top, speed)
```

### resizeWindow

Изменение размеров окна приложения<br/>
Инициирует изменение ширины и высоты элемента IFrame.<br/>
@param {int} width - ширина окна. Может принимать значения от 600px до 1000px<br/>
@param {int} height - высота окна. Может принимать значения от 500px до 4050px.<br/>
@returns {Promise}

```javascript
VkSdk.resizeWindow(width, height)
```

### getPersonalCard

Вызов карточки контактов<br/>
«Карточка контактов» — это то место, где пользователь указывает контактные данные (номер телефона, адрес, e-mail),<br/>
которыми он готов поделиться с сервисами сторонних разработчиков.<br/>
@param {array} type - массив строк. Возможные значения: phone, email, address<br/>
@returns {Promise}

```javascript
VkSdk.getPersonalCard(type)
```


## Как обновить пакет в npm

Обновить код, в package.json изменить версию, затем:

```sh
$ npm adduser // нужно, если пользователь не авторизован
$ npm whoami // проверить авторизован ли пользователь
$ npm publish --access public // если пакет не приватный, иначе не опубликуется
```


## License

MIT.



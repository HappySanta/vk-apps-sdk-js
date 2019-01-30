
export default class VkStartParams {

	static LANG_RUS = 'ru'
	static LANG_UKR = 'uk'
	static LANG_BEL = 'be'
	static LANG_ENG = 'en'
	static LANG_ESP = 'es'
	static LANG_FIN = 'fi'
	static LANG_DEU = 'de'
	static LANG_ITA = 'it'

	static VIEWER_GROUP_ROLE_ADMIN = 'admin'
	static VIEWER_GROUP_ROLE_EDITOR = 'editor'
	static VIEWER_GROUP_ROLE_MODERATOR = 'moder'
	static VIEWER_GROUP_ROLE_MEMBER = 'member'
	static VIEWER_GROUP_ROLE_NOBODY = 'none'

    /**
     * vk_user_id (integer) — идентификатор пользователя, запустившего сервис.
     * @returns {number}
     */
    get userId() {
        return this._userId
    }

    /**
     * @param {number} value
     */
    set userId(value) {
        this._userId = value
    }

	/**
	 *	vk_app_id (integer) — идентификатор запущенного приложения.
	 * @returns {number}
	 */
	get appId() {
		return this._appId
	}

	/**
	 * @param {number} value
	 */
	set appId(value) {
		this._appId = value
	}

    /**
     * vk_is_app_user (integer, [0,1]) — если пользователь установил приложение, содержит 1, иначе — 0.
     * @returns {boolean}
     */
    get isAppUser() {
        return this._isAppUser
    }

    /**
     * @param {boolean} value
     */
    set isAppUser(value) {
        this._isAppUser = value
    }

    /**
     * vk_is_app_user (integer, [0,1]) — если пользователь разрешил отправку уведомлений, содержит 1, иначе — 0.
     * @returns {boolean}
     */
    get areNotificationsEnabled() {
        return this._areNotificationsEnabled
    }

    /**
     * @param {boolean} value
     */
	set areNotificationsEnabled(value) {
    	this._areNotificationsEnabled = value
	}

    /**
     * vk_language (string) — идентификатор языка пользователя, просматривающего приложение (см. список языков ниже).
     * @returns {string}
     */
    get language() {
        return this._language
    }

    /**
     * @param {string} value
     */
    set language(value) {
        this._language = value
    }

    /**
     * vk_language (string) — список прав доступа текущего пользователя в приложении. (Например: friends, video, photos)
     * @returns {string}
     */
    get accessTokenSettings() {
        return this._accessTokenSettings
    }

    /**
     * @param {string} value
     */
    set accessTokenSettings(value) {
        this._accessTokenSettings = value
    }

    /**
     * group_id (integer) — идентификатор сообщества, со страницы которого было запущено приложение
     * @returns {number}
     */
    get groupId() {
        return this._groupId;
    }

    /**
     * @param {number} value
     */
    set groupId(value) {
        this._groupId = parseInt(value, 10)
    }

	/**
	 * vk_viewer_group_role (string) — роль пользователя в сообществе, из которого запущено приложение
	 * admin — если пользователь является создателем или администратором сообщества;
	 * editor — если пользователь является редактором сообщества;
	 * moder — если пользователь является модератором сообщества;
	 * member — если пользователь является участником сообщества;
	 * none — если пользователь не состоит в сообществе.
	 * @returns {string}
	 */
	get viewerGroupRole() {
		return this._viewerGroupRole;
	}

	/**
	 * @param {string} value
	 */
	set viewerGroupRole(value) {
		this._viewerGroupRole = value;
	}

    /**
     * vk_sign (string) — подпись переданных параметров
     * @returns {string}
     */
    get sign() {
        return this._sign;
    }

    /**
     * @param {string} value
     */
    set sign(value) {
        this._sign = value
    }

	isInGroup() {
		return this.groupId && this.groupId > 0
	}

	isAdmin() {
		return this.isInGroup() && this.viewerGroupRole === VkStartParams.VIEWER_GROUP_ROLE_ADMIN
	}

	isModerator() {
		return this.isInGroup() && this.viewerGroupRole === VkStartParams.VIEWER_GROUP_ROLE_MODERATOR
	}

	isEditor() {
		return this.isInGroup() && this.viewerGroupRole === VkStartParams.VIEWER_GROUP_ROLE_EDITOR
	}

	isMember() {
		return this.isInGroup() && this.viewerGroupRole === VkStartParams.VIEWER_GROUP_ROLE_MEMBER
	}

	isNobody() {
		return (this.isInGroup() && this.viewerGroupRole === VkStartParams.VIEWER_GROUP_ROLE_NOBODY)
	}

    /**
	 * @return string
     */
	getLangCode() {
		if (this.language === VkStartParams.LANG_UKR) {
			return 'ua'
		}
		return this.language
	}

    _userId
	_appId
	_isAppUser
	_areNotificationsEnabled
	_language
	_accessTokenSettings
	_groupId
	_viewerGroupRole
	_sign
}

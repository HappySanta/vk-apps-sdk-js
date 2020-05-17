export class Queue {
	constructor() {
		this.lock = false
		this.list = []
	}

	async call(callback) {
		if (this.lock) {
			return new Promise((resolve,reject) => {
				this.list.push([callback,resolve, reject])
			})
		}
		this.lock = true
		try {
			const res = await callback()
			this.lock = false
			this.next()
			return res
		} catch (e) {
			this.lock = false
			this.next()
			throw e
		}
	}

	next() {
		if (this.list.length) {
			const [callback,resolve,reject] = this.list.shift()
			this.call(callback).then(resolve).catch(reject)
		}
	}
}

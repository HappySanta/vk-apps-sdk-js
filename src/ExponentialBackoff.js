export default class ExponentialBackoff {

  constructor(startDelay = 1000, maxRetry = 5, jitter = true) {
    this.startDelay = startDelay;
    this.maxRetry = maxRetry;
    this.jitter = jitter;
    this.attempt = 0;
  }

  async wait() {
    const timeMin = Math.round(Math.pow(Math.E/2, this.attempt++) * this.startDelay);
    const timeMax = Math.round(Math.pow(Math.E/2, this.attempt) * this.startDelay);
    const add = Math.round(Math.random() * (timeMax - timeMin));
    if (this.jitter) {
      await this.delay(timeMin + add);
    } else {
      await this.delay(timeMin);
    }
  }

  /**
   *
   * @return {boolean}
   */
  canRetry() {
    return this.attempt < this.maxRetry;
  }

  /**
   * @param time
   * @return {Promise<unknown>}
   * @private
   */
  delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }
}

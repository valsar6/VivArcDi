const CODE_URL = "https://github.com/login/device/code";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const SCOPE = "repo";
const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
const SLOW_DOWN_SECONDS = 5;
const MS_PER_SECOND = 1e3;
const defaultTimers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle)
};
class DeviceFlowFailure extends Error {
  /** Why the flow ended without a token. */
  reason;
  /**
   * The end of the device flow without a token.
   *
   * @param reason The code expired, the user denied access, GitHub cannot be reached, or the flow was cancelled.
   */
  constructor(reason) {
    super(`GitHub device flow ended: ${reason}`);
    this.name = "DeviceFlowFailure";
    this.reason = reason;
  }
}
class GithubDeviceFlow {
  #deps;
  #timers;
  #handle = null;
  #run = 0;
  #abort = null;
  /**
   * GitHub's sign-in for apps without a server, the OAuth device flow: it asks GitHub for a code,
   * the user types it on GitHub's own page, and meanwhile the app checks with GitHub at the pace
   * GitHub asks until it hands over a token. It needs only the public client id, never a secret,
   * and the token never passes through here before the user authorized.
   *
   * @param dependencies The client id, how to send a request and the timers.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
    this.#timers = dependencies.timers ?? defaultTimers;
  }
  /**
   * Asks GitHub for a sign-in code, with access to read pull requests of private repositories.
   *
   * @returns The code to show and what is needed to wait for the authorization.
   * @throws {DeviceFlowFailure} With reason `unreachable` when GitHub does not answer a code.
   */
  async start() {
    const body = await this.#post(CODE_URL, { client_id: this.#deps.clientId, scope: SCOPE });
    const { user_code: userCode, device_code: deviceCode, verification_uri: verificationUri, interval, expires_in: expiresIn } = body;
    if (typeof userCode !== "string" || typeof deviceCode !== "string" || typeof verificationUri !== "string") {
      throw new DeviceFlowFailure("unreachable");
    }
    return { userCode, deviceCode, verificationUri, interval: Number(interval) || SLOW_DOWN_SECONDS, expiresIn: Number(expiresIn) || 0 };
  }
  /**
   * Checks with GitHub every `interval` seconds, never faster, and five seconds slower each time
   * GitHub answers `slow_down`, until the user authorized, denied, or the code expired.
   *
   * @param code The code that `start` returned.
   * @returns The token GitHub handed over.
   * @throws {DeviceFlowFailure} When the code expired, access was denied, or the flow was cancelled.
   */
  wait(code) {
    this.cancel();
    return new Promise((resolve, reject) => {
      this.#abort = reject;
      this.#schedule({ code, run: this.#run, resolve, reject }, code.interval, 0);
    });
  }
  /**
   * Stops waiting; the pending `wait` fails with reason `cancelled`.
   */
  cancel() {
    this.#run += 1;
    if (this.#handle !== null) {
      this.#timers.clear(this.#handle);
      this.#handle = null;
    }
    const abort = this.#abort;
    this.#abort = null;
    abort?.(new DeviceFlowFailure("cancelled"));
  }
  #schedule(waiting, interval, waited) {
    const { code, reject } = waiting;
    if (code.expiresIn > 0 && waited >= code.expiresIn) {
      this.#finish(() => reject(new DeviceFlowFailure("expired")));
      return;
    }
    this.#handle = this.#timers.set(() => {
      this.#handle = null;
      this.#poll(code, interval).then(
        (poll) => this.#next(waiting, poll, waited + interval),
        (failure) => this.#fail(waiting, failure)
      );
    }, interval * MS_PER_SECOND);
  }
  #next(waiting, poll, waited) {
    if (waiting.run !== this.#run) {
      return;
    }
    const { token } = poll;
    if (token === null) {
      this.#schedule(waiting, poll.interval, waited);
    } else {
      this.#finish(() => waiting.resolve(token));
    }
  }
  #fail(waiting, failure) {
    if (waiting.run === this.#run) {
      this.#finish(() => waiting.reject(failure instanceof DeviceFlowFailure ? failure : new DeviceFlowFailure("unreachable")));
    }
  }
  #finish(settle) {
    this.#abort = null;
    settle();
  }
  async #poll(code, interval) {
    let body;
    try {
      body = await this.#post(TOKEN_URL, { client_id: this.#deps.clientId, device_code: code.deviceCode, grant_type: GRANT_TYPE });
    } catch {
      return { token: null, interval };
    }
    if (typeof body["access_token"] === "string") {
      return { token: body["access_token"], interval };
    }
    switch (body["error"]) {
      case "slow_down":
        return { token: null, interval: interval + SLOW_DOWN_SECONDS };
      case "expired_token":
        throw new DeviceFlowFailure("expired");
      case "access_denied":
        throw new DeviceFlowFailure("denied");
      default:
        return { token: null, interval };
    }
  }
  async #post(url, fields) {
    try {
      const response = await this.#deps.send(url, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(fields).toString()
      });
      const body = await response.json();
      if (!response.ok || typeof body !== "object" || body === null) {
        throw new DeviceFlowFailure("unreachable");
      }
      return body;
    } catch {
      throw new DeviceFlowFailure("unreachable");
    }
  }
}
export {
  CODE_URL,
  DeviceFlowFailure,
  GithubDeviceFlow,
  SCOPE,
  TOKEN_URL
};

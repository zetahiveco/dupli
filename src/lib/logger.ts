import { Logtail } from "@logtail/node"

class Logger {

    private static _instance: Logger | null = null
    private _logtail: Logtail | null = null
    private _production: boolean = process.env.NODE_ENV === "production" ? true : false
    private _logtailSourceToken: string = process.env.LOGTAIL_SOURCE_TOKEN || ""
    private _logtailEndpoint: string = process.env.LOGTAIL_INGESTING_HOST || ""

    private constructor() {
        if (this._production && this._logtailSourceToken && this._logtailEndpoint) {
            this._logtail = new Logtail(this._logtailSourceToken, {
                endpoint: `https://${this._logtailEndpoint}`
            })
        }
    }

    public static getInstance(): Logtail | Console {
        if (!Logger._instance) {
            Logger._instance = new Logger()
        }

        return Logger._instance._logtail ? Logger._instance._logtail : console
    }
}

export const logger = Logger.getInstance()

const isDev = process.env.NODE_ENV !== 'production'

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args)
  },
  error: (...args: any[]) => {
    console.error(...args)
  },
}
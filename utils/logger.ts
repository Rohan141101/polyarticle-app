export const logger = {
  log: (...args: any[]) => {
    if (__DEV__) console.log(...args)
  },
  error: (...args: any[]) => {
    console.error(...args)
  },
}
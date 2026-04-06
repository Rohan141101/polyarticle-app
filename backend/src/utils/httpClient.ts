import axios from "axios"
import http from "http"
import https from "https"

export const httpClient = axios.create({
  timeout: 15000,
  httpAgent: new http.Agent({ family: 4 }),
  httpsAgent: new https.Agent({ family: 4 }),
  headers: {
    "User-Agent": "Mozilla/5.0",
  },
})
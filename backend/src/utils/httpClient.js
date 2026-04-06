"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpClient = void 0;
const axios_1 = __importDefault(require("axios"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
exports.httpClient = axios_1.default.create({
    timeout: 15000,
    httpAgent: new http_1.default.Agent({ family: 4 }),
    httpsAgent: new https_1.default.Agent({ family: 4 }),
    headers: {
        "User-Agent": "Mozilla/5.0",
    },
});

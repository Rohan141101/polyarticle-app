"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const isDev = process.env.NODE_ENV !== 'production';
exports.logger = {
    log: (...args) => {
        if (isDev)
            console.log(...args);
    },
    error: (...args) => {
        console.error(...args);
    },
};

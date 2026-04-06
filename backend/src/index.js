"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const port = Number(process.env.PORT) || 4000;
const server = app_1.default.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
server.on('error', (error) => {
    console.error('Failed to start server', error);
    process.exit(1);
});
function shutdown() {
    server.close((error) => {
        if (error) {
            console.error('Error while shutting down server', error);
            process.exit(1);
        }
        process.exit(0);
    });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setDefaultResultOrder("ipv4first");
const app_1 = __importDefault(require("./app"));
const rss_cron_1 = require("./jobs/rss.cron");
const PORT = Number(process.env.PORT) || 4000;
const server = app_1.default.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 NewsDeck server running on port ${PORT}`);
    (0, rss_cron_1.startRSSCron)();
});
function shutdown() {
    console.log("🛑 Shutting down gracefully...");
    server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
    });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

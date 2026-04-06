"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRSSCron = startRSSCron;
const node_cron_1 = __importDefault(require("node-cron"));
const rssIngest_service_1 = require("../services/rssIngest.service");
const logger_1 = require("../utils/logger");
let isRunning = false;
async function runIngestion() {
    if (isRunning) {
        logger_1.logger.log('⚠️ RSS ingestion skipped (already running)');
        return;
    }
    isRunning = true;
    const start = Date.now();
    try {
        logger_1.logger.log('🚀 RSS ingestion started...');
        const result = await (0, rssIngest_service_1.ingestRSSFeeds)();
        const duration = Math.round((Date.now() - start) / 1000);
        logger_1.logger.log('✅ RSS ingestion completed', {
            inserted: result?.inserted,
            skipped: result?.skipped,
            deleted: result?.deleted,
            totalFetched: result?.totalFetched,
            durationSeconds: duration,
        });
    }
    catch (err) {
        logger_1.logger.error('❌ RSS ingestion failed:', err);
    }
    finally {
        isRunning = false;
    }
}
function startRSSCron() {
    logger_1.logger.log('⏱️ Starting RSS cron (every 2 hours)...');
    node_cron_1.default.schedule('0 */2 * * *', runIngestion);
    runIngestion();
}

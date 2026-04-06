"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchArticleContent = fetchArticleContent;
const node_fetch_1 = __importDefault(require("node-fetch"));
const jsdom_1 = require("jsdom");
const readability_1 = require("@mozilla/readability");
async function fetchArticleContent(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        console.log("🌍 Fetching URL:", url);
        const response = await (0, node_fetch_1.default)(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            },
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) {
            console.log("⚠️ Non-200 response:", response.status);
            return null;
        }
        const html = await response.text();
        const dom = new jsdom_1.JSDOM(html, { url });
        const reader = new readability_1.Readability(dom.window.document);
        const article = reader.parse();
        if (!article || !article.textContent) {
            console.log("⚠️ Readability failed to extract content");
            return null;
        }
        const cleaned = article.textContent
            .replace(/\s+/g, " ")
            .trim();
        return cleaned.slice(0, 10000); // Hard safety cap
    }
    catch (err) {
        if (err.name === "AbortError") {
            console.log("⏳ Fetch timeout for:", url);
        }
        else {
            console.log("⚠️ Fetch failed for:", url);
        }
        return null;
    }
}

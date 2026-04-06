"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const feed_routes_1 = __importDefault(require("./routes/feed.routes"));
const news_routes_1 = __importDefault(require("./routes/news.routes"));
const events_routes_1 = __importDefault(require("./routes/events.routes"));
const profile_route_1 = __importDefault(require("./routes/profile.route"));
const deleteAccount_route_1 = __importDefault(require("./routes/deleteAccount.route"));
const article_route_1 = __importDefault(require("./routes/article.route"));
const app = (0, express_1.default)();
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
}));
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '10kb' }));
// Routes
app.use('/auth', auth_routes_1.default);
app.use('/auth', deleteAccount_route_1.default);
app.use('/feed', feed_routes_1.default);
app.use('/news', news_routes_1.default);
app.use('/events', events_routes_1.default);
app.use('/profile', profile_route_1.default);
app.use('/article', article_route_1.default);
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error handler
app.use((err, _req, res, _next) => {
    console.error(err); // helpful for debugging
    res.status(500).json({ error: 'Internal server error' });
});
exports.default = app;

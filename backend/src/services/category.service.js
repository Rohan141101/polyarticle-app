"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryVectors = void 0;
exports.seedUserVector = seedUserVector;
exports.inferCategory = inferCategory;
const VECTOR_SIZE = 384;
function generateBaseVector(seed) {
    const vector = Array(VECTOR_SIZE).fill(0);
    vector[seed % VECTOR_SIZE] = 1;
    return vector;
}
exports.categoryVectors = {
    World: generateBaseVector(10),
    Politics: generateBaseVector(25),
    Business: generateBaseVector(50),
    Stocks: generateBaseVector(75),
    Crypto: generateBaseVector(100),
    Sports: generateBaseVector(125),
    Entertainment: generateBaseVector(150),
    Technology: generateBaseVector(175),
    Health: generateBaseVector(200),
    General: generateBaseVector(225),
};
function seedUserVector(categories) {
    const selectedVectors = categories
        .filter(cat => cat !== 'For You')
        .map(cat => exports.categoryVectors[cat])
        .filter(Boolean);
    if (!selectedVectors.length)
        return Array(VECTOR_SIZE).fill(0);
    const combined = Array(VECTOR_SIZE).fill(0);
    for (const vec of selectedVectors) {
        for (let i = 0; i < VECTOR_SIZE; i++) {
            combined[i] += vec[i];
        }
    }
    const norm = Math.sqrt(combined.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? combined.map(val => val / norm) : combined;
}
function inferCategory(article) {
    const source = (article.source || '').toLowerCase();
    const title = (article.title || '').toLowerCase();
    const url = (article.url || '').toLowerCase();
    if (source.includes('sport') || source.includes('espn'))
        return 'Sports';
    if (source.includes('tech') || source.includes('verge') || source.includes('wired'))
        return 'Technology';
    if (source.includes('business') || source.includes('marketwatch'))
        return 'Business';
    if (source.includes('coin') || source.includes('crypto'))
        return 'Crypto';
    if (source.includes('health'))
        return 'Health';
    if (source.includes('politics'))
        return 'Politics';
    if (source.includes('world'))
        return 'World';
    if (url.includes('/sport'))
        return 'Sports';
    if (url.includes('/tech'))
        return 'Technology';
    if (url.includes('/business'))
        return 'Business';
    if (url.includes('/crypto'))
        return 'Crypto';
    if (title.includes('stock') || title.includes('market'))
        return 'Stocks';
    if (title.includes('bitcoin'))
        return 'Crypto';
    if (title.includes('ai'))
        return 'Technology';
    if (title.includes('election') || title.includes('government'))
        return 'Politics';
    if (title.includes('war') || title.includes('global'))
        return 'World';
    return 'General';
}

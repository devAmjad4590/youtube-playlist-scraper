"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllVideoDetails = getAllVideoDetails;
const puppeteer_1 = __importDefault(require("puppeteer"));
/**
 * Fetches all video details from a YouTube playlist.
 * @param {string} playlistId - The ID of the YouTube playlist.
 * @returns {Promise<PlaylistDetails | null>} - An object containing the video count and an array of video details.
 */
function getAllVideoDetails(playlistId) {
    return __awaiter(this, void 0, void 0, function* () {
        const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
        let browser;
        try {
            // Launch Puppeteer
            browser = yield puppeteer_1.default.launch();
            const page = yield browser.newPage();
            // Navigate to the playlist URL
            yield page.goto(playlistUrl, { waitUntil: 'networkidle2' });
            // Wait for the video elements to load
            yield page.waitForSelector('ytd-playlist-video-renderer');
            // Extract all video details and video count
            const playlistDetails = yield page.evaluate(() => {
                const videoElements = document.querySelectorAll('ytd-playlist-video-renderer');
                const videoCount = videoElements.length;
                const videos = Array.from(videoElements).map((video, index) => {
                    var _a, _b, _c, _d, _e, _f;
                    const titleElement = video.querySelector('a#video-title');
                    const title = titleElement ? (_b = (_a = titleElement.textContent) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : null : null;
                    const videoHref = titleElement ? titleElement.getAttribute('href') : null;
                    const videoId = videoHref ? new URL(videoHref, 'https://www.youtube.com').searchParams.get('v') : null;
                    const durationElement = video.querySelector('span.ytd-thumbnail-overlay-time-status-renderer');
                    const duration = durationElement ? (_d = (_c = durationElement.textContent) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : null : null;
                    // Only get the thumbnail for the first video
                    const thumbnail = index === 0 ? (_f = (_e = video.querySelector('img')) === null || _e === void 0 ? void 0 : _e.getAttribute('src')) !== null && _f !== void 0 ? _f : null : null;
                    return {
                        title,
                        videoId,
                        thumbnail,
                        url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
                        duration
                    };
                });
                return {
                    videoCount,
                    videos
                };
            });
            // Close Puppeteer
            yield browser.close();
            return playlistDetails;
        }
        catch (error) {
            console.error('Error fetching playlist details:', error);
            if (browser) {
                yield browser.close();
            }
            return null;
        }
    });
}

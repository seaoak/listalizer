const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

//===========================================================================
function correctUserAgent(ua) {
    // user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) listalizer/0.1.0 Chrome/108.0.5359.179 Electron/22.0.2 Safari/537.36
    return ua.split(' ').filter(s => ! /^(listalizer|Listalizer|Electron)\//.test(s)).join(' ');
}

//===========================================================================
// cache (for debug)
const cache_filename = './cache.json';

function writeToCache(obj) {
    const data = JSON.stringify(obj);
    fs.writeFileSync(cache_filename, data);
}

function readFromCache() {
    if (!fs.existsSync(cache_filename)) return {};
    const data = fs.readFileSync(cache_filename, { encoding: 'utf8' });
    const obj = JSON.parse(data);
    Object.values(obj).forEach(item => {
        if (item.isUpdated) item.isUpdated = false;
        Object.seal(item);
    });
    return obj;
}

//===========================================================================
function createWindow(filenameOfPreload, location) {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, filenameOfPreload),
        },
    });

    win.webContents.openDevTools();

    if (location.startsWith('https://')) {
        win.loadURL(location);
    } else {
        win.loadFile(location);
    }

    return win;
}

//===========================================================================
const winTable = {};

function start() {
    if (Object.isFrozen(winTable)) return;
    winTable.origin = createWindow('preload_for_origin.js', 'https://twitter.com/hashtag/FFXIV');
    winTable.timeline = createWindow('preload_for_timeline.js', 'index.html');
    Object.freeze(winTable);
}

//===========================================================================
(() => {
    ipcMain.on('new-tweets-are-arrived', (event, tweets) => {
        console.log(`transfer ${Object.keys(tweets).length} tweets`);
        winTable.timeline.webContents.send('new-tweets-are-arrived', tweets);
        writeToCache(tweets);
    });
})();

//===========================================================================
app.userAgentFallback = correctUserAgent(app.userAgentFallback);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.whenReady().then(() => {
    start();
    setTimeout(() => {
        const tweets = readFromCache();
        if (Object.keys(tweets).length == 0) return;
        console.log(`restore ${Object.keys(tweets).length} tweets from cache`);
        winTable.timeline.webContents.send('new-tweets-are-arrived', tweets);
    }, 1 * 1000);
});

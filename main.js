const { app, BrowserWindow } = require('electron');
const path = require('path');

//===========================================================================
function correctUserAgent(ua) {
    // user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) tweenize/0.1.0 Chrome/108.0.5359.179 Electron/22.0.2 Safari/537.36
    return ua.split(' ').filter(s => ! /^(tweenize|Electron)\//.test(s)).join(' ');
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
    winTable.origin = createWindow('preload_for_origin.js', 'https://twitter.com/');
    winTable.list = createWindow('preload_for_list.js', 'index.html');
    Object.freeze(winTable);
}

//===========================================================================
app.userAgentFallback = correctUserAgent(app.userAgentFallback);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.whenReady().then(() => {
    start();
});

// ユー desktop app: loads the ユー website in a window that Windows excludes
// from every screen capture (OBS, Discord, Teams, Snipping Tool, Game Bar...).
const { app, BrowserWindow, Menu, shell, session } = require('electron');
const crypto = require('crypto');
const path = require('path');

// YU_SITE_URL (unpackaged runs only) points the app at the local test server, e.g. http://localhost:5510/?mock
const DEV_URL = !app.isPackaged && process.env.YU_SITE_URL;
const SITE_URL = DEV_URL || 'https://yeu-terminal.pages.dev';
const SITE_ORIGINS = ['https://yeu-terminal.pages.dev', 'https://yu-terminal.pages.dev', ...(DEV_URL ? [new URL(DEV_URL).origin] : [])];
const API_ORIGIN = 'https://yu-api.yeu-adminterminal.workers.dev';

// Proves to the API that a request came from this app. The secret ships inside
// the app, so it stops casual browser use, not someone who unpacks the exe.
// The same value is the API's YU_APP_SECRET (setup\deploy.ps1 -AppSecret).
const APP_SECRET = require('./app-secret.json').secret;

function appToken() {
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto.createHmac('sha256', APP_SECRET).update(ts).digest('hex');
  return `v1.${ts}.${sig}`;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win;

function isSiteUrl(url) {
  try { return SITE_ORIGINS.includes(new URL(url).origin); } catch { return false; }
}

// Lesson videos are YouTube embeds that only play in here; the player's own
// "Watch on YouTube" / logo links must not hand the video to a normal browser.
function isYouTubeUrl(url) {
  try { return /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i.test(new URL(url).hostname); } catch { return false; }
}

function openOutside(url) {
  if (!isYouTubeUrl(url)) shell.openExternal(url);
}

// A debugging port would let someone drive the protected window from outside.
if (app.isPackaged && process.argv.some(a => /^--(remote-debugging-port|remote-debugging-pipe|inspect)/.test(a))) {
  app.exit(0);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    title: 'ユー',
    icon: path.join(__dirname, 'build', 'icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  });

  // The whole point: WDA_EXCLUDEFROMCAPTURE on Windows 10 2004+ / 11.
  win.setContentProtection(true);
  if (process.platform === 'darwin') {
    // Macs need an app menu for Cmd+C / Cmd+V / Cmd+Q to work; it has no developer items.
    Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'togglefullscreen' }, { role: 'close' }] }]));
  } else {
    win.setMenu(null);
  }

  win.once('ready-to-show', () => {
    win.setContentProtection(true);
    win.show();
  });

  // Keep the window on the site; anything else opens in the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isSiteUrl(url)) openOutside(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!isSiteUrl(url)) {
      event.preventDefault();
      openOutside(url);
    }
  });

  if (app.isPackaged) {
    win.webContents.on('before-input-event', (event, input) => {
      const key = input.key.toLowerCase();
      const devtools = key === 'f12' || (input.control && input.shift && ['i', 'j', 'c'].includes(key)) || (input.meta && input.alt && ['i', 'j', 'c'].includes(key));
      const viewSource = (input.control || input.meta) && key === 'u' && !input.shift;
      if (devtools || viewSource) event.preventDefault();
    });
  }

  win.loadURL(SITE_URL);
}

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: [`${API_ORIGIN}/*`] },
    (details, callback) => {
      details.requestHeaders['X-Yu-App'] = appToken();
      callback({ requestHeaders: details.requestHeaders });
    }
  );
  createWindow();
});

app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });

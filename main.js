const { app, BrowserWindow, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

let mainWindow = null

// electron-updater yapılandırması (GitHub Releases - package.json > build.publish)
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true
  })

  // Development modunda DevTools aç
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.loadFile('dist/index.html')
}

// autoUpdater event'lerini arayüze ilet
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

autoUpdater.on('update-available', (info) => {
  sendToRenderer('update-available', info)
})

autoUpdater.on('update-not-available', (info) => {
  sendToRenderer('update-not-available', info)
})

autoUpdater.on('download-progress', (progress) => {
  sendToRenderer('download-progress', progress)
})

autoUpdater.on('update-downloaded', (info) => {
  sendToRenderer('update-downloaded', info)
})

autoUpdater.on('error', (err) => {
  sendToRenderer('update-error', err)
})

// IPC handlers
ipcMain.handle('check-for-updates', async () => {
  try {
    // Electron-updater sadece paketlenmiş versiyonda çalışır
    // Development modunda simüle ediyoruz
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      return { success: true, message: 'Development modunda güncelleme kontrolü simüle edildi' }
    }

    await autoUpdater.checkForUpdates()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.on('install-update', () => {
  try {
    const { autoUpdater } = require('electron-updater')
    autoUpdater.quitAndInstall()
  } catch (error) {
    console.error('Güncelleme yüklenirken hata:', error)
  }
})

app.whenReady().then(() => {
  createWindow()

  // Uygulama açıldığında otomatik güncelleme kontrolü (sadece paketlenmiş sürümde)
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('Otomatik güncelleme kontrolü hatası:', err)
      })
    }, 3000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

let mainWindow = null

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

// IPC handlers
ipcMain.handle('check-for-updates', async () => {
  try {
    // Electron-updater sadece paketlenmiş versiyonda çalışır
    // Development modunda simüle ediyoruz
    if (process.env.NODE_ENV === 'development') {
      return { success: true, message: 'Development modunda güncelleme kontrolü simüle edildi' }
    }
    
    const { autoUpdater } = require('electron-updater')
    autoUpdater.checkForUpdatesAndNotify()
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

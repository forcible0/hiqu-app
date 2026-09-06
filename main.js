const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const { spawn } = require('child_process')
const https = require('https')
const fs = require('fs')
const path = require('path')
const { mergeWads } = require('./wad.js')

let mainWindow = null

// Skin indirme ve cslol-tools entegrasyonu
const SKINS_DIR = path.join(app.getPath('appData'), 'asset-manager', 'skins')
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json')

// Buck -> Hiqu yeniden adlandırma: eski userData klasöründeki
// ayarları yeni konuma bir kez kopyala (ayarların sıfırlanmaması için)
try {
  const legacyDir = path.join(app.getPath('appData'), 'buck')
  const legacySettings = path.join(legacyDir, 'settings.json')
  if (!fs.existsSync(SETTINGS_FILE) && fs.existsSync(legacySettings)) {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true })
    fs.copyFileSync(legacySettings, SETTINGS_FILE)
  }
} catch (e) {
  console.error('Eski ayarlar taşınamadı:', e.message)
}
const LEAGUE_SKINS_BASE = 'https://raw.githubusercontent.com/forcible0/LoLskins/main/skins'

function readSettings() {
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))
    // Eski ayar anahtarlarını taşı (cslol-tools → LTK Manager → patcher_host geçişi)
    if (raw.ltkPath === undefined && raw.cslolPath !== undefined) raw.ltkPath = raw.cslolPath
    if (raw.dllPath === undefined && raw.gameDir !== undefined) raw.dllPath = raw.gameDir
    if (raw.patcherPath === undefined && raw.ltkPath !== undefined) {
      let p = raw.ltkPath
      // Kullanıcı ltk-manager.exe seçmişse aynı klasördeki ltk_patcher_host.exe'ye yönlendir
      if (/ltk-manager\.exe$/i.test(p)) {
        const hostExe = path.join(path.dirname(p), 'ltk_patcher_host.exe')
        if (fs.existsSync(hostExe)) p = hostExe
      }
      raw.patcherPath = p
    }
    // DLL Path boşsa patcher'ın yanındaki ltk_patcher_dll.dll'i varsayılan olarak öner
    if (!raw.dllPath && raw.patcherPath) {
      const dll = path.join(path.dirname(raw.patcherPath), 'ltk_patcher_dll.dll')
      if (fs.existsSync(dll)) raw.dllPath = dll
    }
    return raw
  } catch {
    return {}
  }
}

function writeSettings(settings) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true })
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
    return true
  } catch (err) {
    console.error('Ayarlar kaydedilemedi:', err)
    return false
  }
}

// Redirect destekli, ilerleme raporlu dosya indirme
function downloadFile(url, dest, onProgress, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      return reject(new Error('Çok fazla yönlendirme'))
    }
    https.get(url, (res) => {
      // Redirect takip et
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return resolve(downloadFile(res.headers.location, dest, onProgress, redirectCount + 1))
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`İndirme başarısız (HTTP ${res.statusCode}). Skin depoda bulunamadı.`))
      }
      const total = parseInt(res.headers['content-length'] || '0', 10)
      let received = 0
      const file = fs.createWriteStream(dest)
      res.on('data', (chunk) => {
        received += chunk.length
        if (total > 0 && onProgress) {
          onProgress(Math.round((received / total) * 100))
        }
      })
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve(dest)))
      file.on('error', (err) => {
        fs.unlink(dest, () => {})
        reject(err)
      })
    }).on('error', reject)
  })
}

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
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png')
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

// ==================== SKIN YÖNETİMİ IPC ====================

// Ayarlar
ipcMain.handle('get-settings', () => readSettings())

ipcMain.handle('save-settings', (_event, settings) => {
  const ok = writeSettings(settings)
  return { success: ok, error: ok ? undefined : 'Ayarlar dosyaya yazılamadı' }
})

// ltk_patcher_host.exe seçici
ipcMain.handle('select-patcher-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'ltk_patcher_host.exe seçin',
    filters: [{ name: 'Patcher Host', extensions: ['exe'] }],
    properties: ['openFile']
  })
  return result.canceled ? null : result.filePaths[0]
})

// Patcher DLL seçici
ipcMain.handle('select-dll-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'ltk_patcher_dll.dll dosyasını seçin',
    filters: [{ name: 'DLL', extensions: ['dll'] }],
    properties: ['openFile']
  })
  return result.canceled ? null : result.filePaths[0]
})

// League "Game" klasörünü bul: önce ayar, yoksa yaygın kurulum konumları
function resolveGameDir(settings) {
  if (settings.gamePath) {
    const p = path.basename(settings.gamePath).toLowerCase() === 'game'
      ? settings.gamePath
      : path.join(settings.gamePath, 'Game')
    if (fs.existsSync(p)) return p
    if (fs.existsSync(settings.gamePath)) return settings.gamePath
  }
  for (const drive of ['C:', 'D:', 'E:']) {
    for (const dirName of ['League of Legends', 'League of Legends (EUW)', 'Riot Games']) {
      const candidate = path.join(drive + '\\', dirName === 'Riot Games' ? 'Riot Games\\League of Legends\\Game' : `${dirName}\\Game`)
      if (fs.existsSync(path.join(candidate, 'DATA'))) return candidate
    }
  }
  return null
}

// League Game klasörü seçici
ipcMain.handle('select-game-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'League of Legends "Game" klasörünü seçin',
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

// İndirilmiş skinlerin listesi (skin ID'leri)
ipcMain.handle('get-downloaded-skins', () => {
  try {
    return fs.readdirSync(SKINS_DIR)
      .filter((f) => f.endsWith('.fantome'))
      .map((f) => path.basename(f, '.fantome'))
  } catch {
    return []
  }
})

// Tekil skin indirme (LeagueSkins reposundan - .fantome formatı)
ipcMain.handle('download-skin', async (_event, { championKey, skinId }) => {
  if (!championKey || !skinId) {
    return { success: false, error: 'Geçersiz şampiyon veya skin ID' }
  }
  const url = `${LEAGUE_SKINS_BASE}/${championKey}/${skinId}/${skinId}.fantome`
  const dest = path.join(SKINS_DIR, `${skinId}.fantome`)
  try {
    fs.mkdirSync(SKINS_DIR, { recursive: true })
    await downloadFile(url, dest, (percent) => {
      sendToRenderer('skin-download-progress', { skinId, percent })
    })
    return { success: true, path: dest }
  } catch (err) {
    fs.unlink(dest, () => {})
    return { success: false, error: err.message }
  }
})

// Skin kaldırma: 1) Çalışan patcher sürecini sonlandır 2) Yerel .fantome dosyasını sil
ipcMain.handle('remove-skin', (_event, { skinId }) => {
  const filePath = path.join(SKINS_DIR, `${skinId}.fantome`)
  sendToRenderer('remove-status', { skinId, state: 'started', message: 'Kaldırılıyor...' })

  // 1. Adım: Patcher sürecini sonlandır
  const proc = patcherProcesses.get(skinId)
  if (proc) {
    patcherProcesses.delete(skinId) // 'exit' event'i tekrar status göndermesin
    try {
      if (proc.stopPatcher) proc.stopPatcher(); else proc.kill()
    } catch { /* süreç zaten kapanmış olabilir */ }
  }

  // 2. Adım: Yerel dosyayı sil
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    sendToRenderer('remove-status', {
      skinId,
      state: 'finished',
      message: 'Skin kaldırıldı ve patcher durduruldu'
    })
    return { success: true }
  } catch (err) {
    sendToRenderer('remove-status', { skinId, state: 'error', message: `Dosya silinemedi: ${err.message}` })
    return { success: false, error: err.message }
  }
})

// Çalışan patcher süreçleri: skinId → ChildProcess
const patcherProcesses = new Map()

// İndirilmiş skini ltk_patcher_host.exe ile aktif et
// Host CLI argümanlarıyla değil, stdin/stdout satır protokolüyle çalışır:
//   config prefix <overlayKlasörü>   (içinde .fantome dosyalarının olduğu klasör)
//   hook dll <ltk_patcher_dll.dll>
//   start scan   (oyun penceresini bekler, hook'lar)
//   stop         (patch'i kaldırır ve süreci bitirir)
ipcMain.handle('apply-skin', (_event, { skinId }) => {
  const settings = readSettings()
  if (!settings.patcherPath) {
    return { success: false, error: 'Patcher Yolu ayarlanmamış (Ayarlar menüsünden ltk_patcher_host.exe seçin)' }
  }
  if (!fs.existsSync(settings.patcherPath)) {
    return { success: false, error: 'ltk_patcher_host.exe bulunamadı: ' + settings.patcherPath }
  }
  if (!settings.dllPath) {
    return { success: false, error: 'DLL Yolu ayarlanmamış (Ayarlar menüsünden ltk_patcher_dll.dll seçin)' }
  }
  if (!fs.existsSync(settings.dllPath)) {
    return { success: false, error: 'ltk_patcher_dll.dll bulunamadı: ' + settings.dllPath }
  }
  const modPath = path.join(SKINS_DIR, `${skinId}.fantome`)
  if (!fs.existsSync(modPath)) {
    return { success: false, error: 'Skin dosyası bulunamadı. Önce indirin.' }
  }

  // TÜM çalışan patcher süreçlerini sonlandır — host kendi pipe'ını yaratırken
  // isim çakışması olursa "failed to create dll pipe" hatası verir ve patch çalışmaz.
  // Bu yüzden aynı anda sadece tek bir host süreci aktif olabilir.
  for (const [id, proc] of patcherProcesses) {
    patcherProcesses.delete(id)
    try {
      if (proc.stopPatcher) proc.stopPatcher(); else proc.kill()
    } catch { /* süreç zaten kapanmış olabilir */ }
  }
  // Pipe'ın eski süreç tarafından bırakılması için kısa bekleme
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500)

  // Overlay hazırlığı: LTK Manager / cslol-manager gibi, mod wad'ındaki chunk'lar
  // oyunun asıl wad'ının ÜZERİNE bindirilir. Mod dosyası sadece değişen chunk'ları
  // içerir (birkaç KB olması normal) — mod dosyasını olduğu gibi kopyalamak boş bir
  // oyun görünümüne yol açar, bu yüzden merge şarttır.
  const overlayDir = path.join(app.getPath('userData'), 'overlay')
  const extractDir = path.join(app.getPath('userData'), 'overlay_extract')
  try {
    fs.rmSync(overlayDir, { recursive: true, force: true })
    fs.rmSync(extractDir, { recursive: true, force: true })
    fs.mkdirSync(overlayDir, { recursive: true })
    fs.mkdirSync(extractDir, { recursive: true })

    // .fantome'u zip olarak çıkart (7za.exe — 7zip-bin paketinden)
    const sevenZip = require('7zip-bin')
    const { execFileSync } = require('child_process')
    execFileSync(sevenZip.path7za, ['x', '-y', `-o${extractDir}`, modPath], { windowsHide: true })

    // Çıkarılan .wad.client dosyalarını topla
    const wadSrcDir = path.join(extractDir, 'WAD')
    const modWads = []
    if (fs.existsSync(wadSrcDir)) {
      // Not: Dizin gezisini kendimiz yapıyoruz çünkü Dirent.path/parentPath
      // Electron'un Node sürümünde (Node < 20.12) mevcut değil.
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) { walk(full); continue }
          if (!entry.isFile()) continue
          if (!/\.wad\.client$/i.test(entry.name)) continue
          modWads.push({ name: entry.name, file: full })
        }
      }
      walk(wadSrcDir)
    }
    if (modWads.length === 0) {
      return { success: false, error: 'Fantome dosyasında wad bulunamadı (bozuk indirme olabilir)' }
    }

    // Mod chunk'larını bindirmek için oyunun kurulum klasörü gerekli
    const gameDir = resolveGameDir(settings)
    if (!gameDir) {
      return { success: false, error: 'League of Legends "Game" klasörü bulunamadı. Ayarlar menüsünden oyun klasörünü seçin.' }
    }

    // Birden fazla skin aynı şampiyonun wad'ını hedefleyebilir; aynı wad tek seferde
    // tüm modların chunk'larıyla üretilmeli. Şimdilik tek-skin aktifasyonu yeterli.
    let mergedCount = 0
    for (const { name, file } of modWads) {
      // Oyun wad'ı önce DATA/FINAL/Champions altında aranır, yoksa Game altında tarama yapılır
      let gameWadPath = path.join(gameDir, 'DATA', 'FINAL', 'Champions', name)
      if (!fs.existsSync(gameWadPath)) {
        const findInGame = (dir, depth) => {
          if (depth > 5) return null
          let found = null
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (found) break
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) found = findInGame(full, depth + 1)
            else if (entry.name.toLowerCase() === name.toLowerCase()) found = full
          }
          return found
        }
        gameWadPath = findInGame(gameDir, 0)
      }
      if (!gameWadPath) {
        return { success: false, error: `Oyun wad'ı bulunamadı: ${name} — oyun güncel değilse önce League'i güncelleyin` }
      }
      const dest = path.relative(gameDir, gameWadPath)
      const outPath = path.join(overlayDir, dest)
      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      mergeWads(fs.readFileSync(gameWadPath), fs.readFileSync(file), outPath)
      mergedCount++
    }

    sendToRenderer('apply-status', { skinId, state: 'started', message: `${mergedCount} wad birleştirildi, patcher başlatılıyor...` })
  } catch (err) {
    return { success: false, error: 'Overlay klasörü hazırlanamadı: ' + err.message }
  }

  try {
    const child = spawn(settings.patcherPath, [], {
      cwd: path.dirname(settings.patcherPath),
      windowsHide: true
    })
    patcherProcesses.set(skinId, child)

    // Protokol komutlarını stdin'e yaz
    const sendCmd = (cmd) => {
      try { child.stdin.write(cmd + '\n') } catch { /* süreç kapandıysa yoksay */ }
    }
    // NOT: DLL yolu protokolde verilmiyor — host ltk_patcher_dll.dll'i kendi
    // klasöründen otomatik bulur ("hook dll" komutu yok, unknown keyword hatası verir)
    // Konfigürasyon sırası host'un beklediği sıradadır: loglevel, flags, prefix (ltk-manager ile aynı).
    // loglevel 4096 (All): oyun içi DLL'in log satırlarını da gönderir — teşhis için şart.
    // flags 12 = OPT_OUT_AH_V1 (4) | FULL_WAD_SCAN (8): anti-skinhack wad taraması başarısız
    // olursa engellemek yerine uyarı verir; ayrıca taramayı en başta yapar.
    // prefix sonuna ayraç eklenir (ltk-manager böyle gönderir; DLL doğrudan üstüne ekleme yapar).
    setTimeout(() => sendCmd('config loglevel 4096'), 300)
    setTimeout(() => sendCmd('config flags 12'), 400)
    setTimeout(() => sendCmd(`config prefix ${overlayDir.replace(/[\\/]+$/, '')}\\`), 500)
    setTimeout(() => sendCmd('start scan'), 700)
    // Tanı için host çıktılarını log dosyasına yaz
    const logFile = path.join(app.getPath('userData'), 'patcher.log')
    const appendLog = (s) => { try { fs.appendFileSync(logFile, s) } catch { /* yoksay */ } }
    appendLog(`\n=== ${new Date().toISOString()} skin=${skinId} overlay=${overlayDir} ===\n`)

    // Hata ve önemli durum satırlarını UI'a ilet
    let stdoutBuf = ''
    child.stdout.on('data', (d) => {
      appendLog(d)
      stdoutBuf += d.toString()
      const lines = stdoutBuf.split(/\r?\n/)
      stdoutBuf = lines.pop() || ''
      for (const line of lines) {
        if (/error|failed/i.test(line) && !/error$/i.test(line.trim())) {
          sendToRenderer('apply-status', { skinId, state: 'error', message: line.trim() })
        } else if (/hook installed|\binjected\b|overlay verified|dll attached/i.test(line)) {
          sendToRenderer('apply-status', { skinId, state: 'started', message: line.trim() })
        }
      }
    })
    child.stderr.on('data', (d) => appendLog(d))

    // Patcher kapanırken protokol üzerinden düzgün durması için 'stop' gönderilecek;
    // kill() çocuğu zorla öldürür — map'e kaydederken stop fonksiyonunu da tut
    child.stopPatcher = () => {
      sendCmd('stop')
      setTimeout(() => { try { child.stdin.end() } catch {} }, 300)
      setTimeout(() => { try { child.kill() } catch {} }, 3000)
    }

    child.on('error', (err) => {
      if (patcherProcesses.get(skinId) === child) patcherProcesses.delete(skinId)
      sendToRenderer('apply-status', { skinId, state: 'error', message: `Başlatılamadı: ${err.message}` })
    })
    child.on('exit', (code) => {
      // Kaldırma sırasında da kapanır; sadece hâlâ kayıtlı süreçse UI'a bildir
      if (patcherProcesses.get(skinId) === child) {
        patcherProcesses.delete(skinId)
        if (code !== 0 && code !== null) {
          sendToRenderer('apply-status', { skinId, state: 'error', message: `Patcher hata ile kapandı (kod ${code})` })
        } else {
          sendToRenderer('apply-status', { skinId, state: 'finished', message: 'Patcher durdu' })
        }
      }
    })

    sendToRenderer('apply-status', { skinId, state: 'started', message: 'Patcher Aktif' })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
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

// Uygulama kapanırken çalışan patcher süreçlerini temizle
app.on('before-quit', () => {
  for (const proc of patcherProcesses.values()) {
    try {
      if (proc.stopPatcher) proc.stopPatcher(); else proc.kill()
    } catch { /* yoksay */ }
  }
  patcherProcesses.clear()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

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
const SKINS_META_FILE = path.join(SKINS_DIR, 'skins-meta.json')
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

// ==================== SKIN META VERİSİ ====================
// İndirilen her skin için isim/şampiyon/görsel bilgisi tutulur (İndirilenler sekmesi için)
function readSkinsMeta() {
  try {
    return JSON.parse(fs.readFileSync(SKINS_META_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function writeSkinsMeta(meta) {
  try {
    fs.mkdirSync(SKINS_DIR, { recursive: true })
    fs.writeFileSync(SKINS_META_FILE, JSON.stringify(meta, null, 2))
  } catch (err) {
    console.error('Skin meta kaydedilemedi:', err)
  }
}

// ==================== ÇOKLU SKİN DURUMU ====================
// MİMARİ: Tek bir ltk_patcher_host süreci çalışır ve overlay klasöründe TÜM
// aktif skinlerin birleştirilmiş wad'ları bulunur. (Host aynı anda yalnızca
// tek süreç olabilir — named pipe çakışması; bu yüzden skin eklemek/çıkarmak
// = overlay'i yeniden kur + patcher'ı yeniden başlat.)
let patcherProcess = null

// Aktif skin kümesi — settings.json içinde kalıcıdır (uygulama yeniden
// başlatıldığında aktif skinler hatırlanır)
const activeSkins = new Set()
try {
  const saved = readSettings().activeSkins
  if (Array.isArray(saved)) {
    for (const id of saved) {
      if (typeof id === 'string' && fs.existsSync(path.join(SKINS_DIR, `${id}.fantome`))) {
        activeSkins.add(id)
      }
    }
  }
} catch { /* yoksay */ }

function persistActiveSkins() {
  try {
    const s = readSettings()
    s.activeSkins = [...activeSkins]
    writeSettings(s)
  } catch { /* yoksay */ }
  sendToRenderer('active-skins-changed', [...activeSkins])
}

function stopPatcherProcess() {
  const proc = patcherProcess
  if (!proc) return
  patcherProcess = null // 'exit' handler'ın tekrar olay göndermesini engelle
  try {
    if (proc.stopPatcher) proc.stopPatcher(); else proc.kill()
  } catch { /* süreç zaten kapanmış olabilir */ }
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
    icon: path.join(
  app.isPackaged ? process.resourcesPath : __dirname,
  app.isPackaged ? 'icon.ico' : 'build/icon.ico'
)
  })

  // Development modunda DevTools aç
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.loadFile('dist/index.html')

  // Önceki oturumda aktif bırakılan skinler varsa patcher'ı otomatik geri yükle
  mainWindow.webContents.on('did-finish-load', () => {
    if (activeSkins.size > 0 && !patcherProcess) {
      setTimeout(() => {
        try {
          syncPatcher()
        } catch (err) {
          console.error('Patcher geri yüklenemedi:', err.message)
        }
      }, 1000)
    }
  })
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
  // activeSkins anahtarı renderer'dan gelmesin diye korunur (iç durum)
  const current = readSettings()
  const merged = { ...current, ...settings, activeSkins: [...activeSkins] }
  const ok = writeSettings(merged)
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
// Patcher ayarlarını + oyun klasörünü doğrula
function validatePatcherSettings() {
  const settings = readSettings()
  if (!settings.patcherPath) {
    return { error: 'Patcher Yolu ayarlanmamış (Ayarlar menüsünden ltk_patcher_host.exe seçin)' }
  }
  if (!fs.existsSync(settings.patcherPath)) {
    return { error: 'ltk_patcher_host.exe bulunamadı: ' + settings.patcherPath }
  }
  if (!settings.dllPath) {
    return { error: 'DLL Yolu ayarlanmamış (Ayarlar menüsünden ltk_patcher_dll.dll seçin)' }
  }
  if (!fs.existsSync(settings.dllPath)) {
    return { error: 'ltk_patcher_dll.dll bulunamadı: ' + settings.dllPath }
  }
  const gameDir = resolveGameDir(settings)
  if (!gameDir) {
    return { error: 'League of Legends "Game" klasörü bulunamadı. Ayarlar menüsünden oyun klasörünü seçin.' }
  }
  return { settings, gameDir }
}

// Oyun wad'ını bul: önce DATA/FINAL/Champions, yoksa Game altında derin arama
function findGameWad(gameDir, wadName) {
  const direct = path.join(gameDir, 'DATA', 'FINAL', 'Champions', wadName)
  if (fs.existsSync(direct)) return direct
  const findInGame = (dir, depth) => {
    if (depth > 5) return null
    let found = null
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (found) break
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) found = findInGame(full, depth + 1)
      else if (entry.name.toLowerCase() === wadName.toLowerCase()) found = full
    }
    return found
  }
  return findInGame(gameDir, 0)
}

// Overlay'i TÜM aktif skinlerle yeniden kur.
// LTK Manager / cslol-manager gibi, mod wad'ındaki chunk'lar oyunun asıl wad'ının
// ÜZERİNE bindirilir. Mod dosyası sadece değişen chunk'ları içerir (birkaç KB olması
// normal) — mod dosyasını olduğu gibi kopyalamak boş bir oyun görünümüne yol açar,
// bu yüzden merge şarttır. Birden çok skin aynı oyun wad'ını hedefliyorsa modlar
// zincirleme birleştirilir: (oyun + mod1) + mod2 + ...
function rebuildOverlay(skinIds, gameDir) {
  const overlayDir = path.join(app.getPath('userData'), 'overlay')
  const extractDir = path.join(app.getPath('userData'), 'overlay_extract')
  fs.rmSync(overlayDir, { recursive: true, force: true })
  fs.rmSync(extractDir, { recursive: true, force: true })
  fs.mkdirSync(overlayDir, { recursive: true })
  fs.mkdirSync(extractDir, { recursive: true })

  const sevenZip = require('7zip-bin')
  const { execFileSync } = require('child_process')
  // wad adı (küçük harf) → { name, files: [mod wad yolları — skin sırasına göre] }
  const wadGroups = new Map()
  const warnings = []

  for (const skinId of skinIds) {
    const modPath = path.join(SKINS_DIR, `${skinId}.fantome`)
    if (!fs.existsSync(modPath)) {
      warnings.push(`Skin dosyası bulunamadı: ${skinId}`)
      continue
    }
    const skinExtractDir = path.join(extractDir, skinId)
    try {
      execFileSync(sevenZip.path7za, ['x', '-y', `-o${skinExtractDir}`, modPath], { windowsHide: true })
    } catch (err) {
      warnings.push(`Fantome çıkarılamadı (${skinId}): ${err.message}`)
      continue
    }
    const wadSrcDir = path.join(skinExtractDir, 'WAD')
    if (!fs.existsSync(wadSrcDir)) {
      warnings.push(`Fantome içinde WAD klasörü yok (${skinId})`)
      continue
    }
    // Not: Dizin gezisini kendimiz yapıyoruz çünkü Dirent.path/parentPath
    // Electron'un Node sürümünde (Node < 20.12) mevcut değil.
    let found = 0
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) { walk(full); continue }
        if (!entry.isFile()) continue
        if (!/\.wad\.client$/i.test(entry.name)) continue
        const key = entry.name.toLowerCase()
        if (!wadGroups.has(key)) wadGroups.set(key, { name: entry.name, files: [] })
        wadGroups.get(key).files.push(full)
        found++
      }
    }
    walk(wadSrcDir)
    if (found === 0) warnings.push(`Fantome dosyasında wad bulunamadı (${skinId})`)
  }

  if (wadGroups.size === 0) {
    throw new Error('Seçili skinler için wad bulunamadı (bozuk indirme olabilir)')
  }

  let mergedCount = 0
  for (const { name, files } of wadGroups.values()) {
    const gameWadPath = findGameWad(gameDir, name)
    if (!gameWadPath) {
      warnings.push(`Oyun wad'ı bulunamadı: ${name} — oyun güncel değilse önce League'i güncelleyin`)
      continue
    }
    const dest = path.relative(gameDir, gameWadPath)
    const outPath = path.join(overlayDir, dest)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    // Zincirleme merge: her mod bir öncekinin çıktısının üzerine bindirilir
    let currentBuf = fs.readFileSync(gameWadPath)
    for (const modFile of files) {
      mergeWads(currentBuf, fs.readFileSync(modFile), outPath)
      currentBuf = fs.readFileSync(outPath)
    }
    mergedCount++
  }

  if (mergedCount === 0) {
    throw new Error('Hiçbir wad birleştirilemedi. ' + warnings.join(' | '))
  }
  return { overlayDir, mergedCount, warnings }
}
// ltk_patcher_host.exe'yi başlat. Host CLI argümanlarıyla değil, stdin/stdout
// satır protokolüyle çalışır:
//   config prefix <overlayKlasörü>   (birleştirilmiş wad'ların olduğu klasör)
//   start scan                       (oyun penceresini bekler, hook'lar)
//   stop                             (patch'i kaldırır ve süreci bitirir)
// NOT: DLL yolu protokolde verilmiyor — host ltk_patcher_dll.dll'i kendi
// klasöründen otomatik bulur ("hook dll" komutu yok, unknown keyword hatası verir).
// Konfigürasyon sırası host'un beklediği sıradadır: loglevel, flags, prefix (ltk-manager ile aynı).
// loglevel 4096 (All): oyun içi DLL'in log satırlarını da gönderir — teşhis için şart.
// flags 12 = OPT_OUT_AH_V1 (4) | FULL_WAD_SCAN (8): anti-skinhack wad taraması başarısız
// olursa engellemek yerine uyarı verir; ayrıca taramayı en başta yapar.
// prefix sonuna ayraç eklenir (ltk-manager böyle gönderir; DLL doğrudan üstüne ekleme yapar).
function spawnPatcher(overlayDir, settings, skinIds) {
  const child = spawn(settings.patcherPath, [], {
    cwd: path.dirname(settings.patcherPath),
    windowsHide: true
  })
  patcherProcess = child

  const sendCmd = (cmd) => {
    try { child.stdin.write(cmd + '\n') } catch { /* süreç kapandıysa yoksay */ }
  }
  setTimeout(() => sendCmd('config loglevel 4096'), 300)
  setTimeout(() => sendCmd('config flags 12'), 400)
  setTimeout(() => sendCmd(`config prefix ${overlayDir.replace(/[\\/]+$/, '')}\\`), 500)
  setTimeout(() => sendCmd('start scan'), 700)

  // Tanı için host çıktılarını log dosyasına yaz
  const logFile = path.join(app.getPath('userData'), 'patcher.log')
  const appendLog = (s) => { try { fs.appendFileSync(logFile, s) } catch { /* yoksay */ } }
  appendLog(`\n=== ${new Date().toISOString()} skins=[${skinIds.join(',')}] overlay=${overlayDir} ===\n`)

  // Hata ve önemli durum satırlarını UI'a ilet
  let stdoutBuf = ''
  child.stdout.on('data', (d) => {
    appendLog(d)
    stdoutBuf += d.toString()
    const lines = stdoutBuf.split(/\r?\n/)
    stdoutBuf = lines.pop() || ''
    for (const line of lines) {
      if (/error|failed/i.test(line) && !/error$/i.test(line.trim())) {
        sendToRenderer('patch-status', { state: 'error', message: line.trim() })
      } else if (/hook installed|\binjected\b|overlay verified|dll attached/i.test(line)) {
        sendToRenderer('patch-status', { state: 'started', message: line.trim() })
      }
    }
  })
  child.stderr.on('data', (d) => appendLog(d))

  // Patcher kapanırken protokol üzerinden düzgün durması için 'stop' gönderilecek;
  // kill() çocuğu zorla öldürür — bu yüzden stop fonksiyonunu da tut
  child.stopPatcher = () => {
    sendCmd('stop')
    setTimeout(() => { try { child.stdin.end() } catch { /* yoksay */ } }, 300)
    setTimeout(() => { try { child.kill() } catch { /* yoksay */ } }, 3000)
  }

  child.on('error', (err) => {
    if (patcherProcess === child) {
      patcherProcess = null
      sendToRenderer('patch-status', { state: 'error', message: `Başlatılamadı: ${err.message}` })
    }
  })
  child.on('exit', (code) => {
    // Yeniden başlatma sırasında da kapanır; sadece hâlâ kayıtlı süreçse UI'a bildir
    if (patcherProcess === child) {
      patcherProcess = null
      if (code !== 0 && code !== null) {
        sendToRenderer('patch-status', { state: 'error', message: `Patcher hata ile kapandı (kod ${code})` })
      } else {
        sendToRenderer('patch-status', { state: 'finished', message: 'Patcher durdu' })
      }
    }
  })
}

// Overlay'i aktif skinlerle yeniden kur + patcher'ı (tek süreç) yeniden başlat.
// Aktif skin kalmadıysa patcher'ı durdurur ve overlay'i temizler.
function syncPatcher() {
  const skinIds = [...activeSkins]
  stopPatcherProcess()
  const overlayDir = path.join(app.getPath('userData'), 'overlay')
  const extractDir = path.join(app.getPath('userData'), 'overlay_extract')

  if (skinIds.length === 0) {
    fs.rmSync(overlayDir, { recursive: true, force: true })
    fs.rmSync(extractDir, { recursive: true, force: true })
    persistActiveSkins()
    sendToRenderer('patch-status', { state: 'finished', message: 'Tüm skinler pasifleştirildi' })
    return { warnings: [] }
  }

  const check = validatePatcherSettings()
  if (check.error) {
    throw new Error(check.error)
  }

  const { overlayDir: outDir, mergedCount, warnings } = rebuildOverlay(skinIds, check.gameDir)

  // Pipe'ın eski süreç tarafından bırakılması için kısa bekleme
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500)

  spawnPatcher(outDir, check.settings, skinIds)
  persistActiveSkins()
  sendToRenderer('patch-status', {
    state: 'started',
    message: `Patcher aktif — ${skinIds.length} skin, ${mergedCount} wad birleştirildi`
  })
  return { warnings }
}
// ==================== SKİN IPC ====================

// İndirilmiş skinlerin listesi (meta bilgisiyle birlikte)
ipcMain.handle('get-downloaded-skins', () => {
  try {
    const meta = readSkinsMeta()
    return fs.readdirSync(SKINS_DIR)
      .filter((f) => f.endsWith('.fantome'))
      .map((f) => {
        const id = path.basename(f, '.fantome')
        return meta[id] || { id, name: `Skin ${id}`, num: 0, championId: '', championKey: '', championName: '' }
      })
  } catch {
    return []
  }
})

// Tekil skin indirme (LeagueSkins reposundan - .fantome formatı)
ipcMain.handle('download-skin', async (_event, { championKey, skinId, meta }) => {
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
    // Meta bilgisini kaydet (İndirilenler sekmesi için)
    if (meta && typeof meta === 'object') {
      const all = readSkinsMeta()
      all[skinId] = {
        id: skinId,
        name: meta.name || `Skin ${skinId}`,
        num: meta.num ?? 0,
        championId: meta.championId || '',
        championKey,
        championName: meta.championName || '',
        downloadedAt: Date.now()
      }
      writeSkinsMeta(all)
    }
    return { success: true, path: dest }
  } catch (err) {
    fs.unlink(dest, () => {})
    return { success: false, error: err.message }
  }
})

// Skin kaldırma: yerel .fantome dosyasını sil + aktif listeden düş +
// overlay'i kalan skinlerle güncelle (diğer aktif skinler çalışmaya devam eder)
ipcMain.handle('remove-skin', (_event, { skinId }) => {
  const filePath = path.join(SKINS_DIR, `${skinId}.fantome`)
  sendToRenderer('remove-status', { skinId, state: 'started', message: 'Kaldırılıyor...' })

  const wasActive = activeSkins.delete(skinId)

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    const meta = readSkinsMeta()
    if (meta[skinId]) {
      delete meta[skinId]
      writeSkinsMeta(meta)
    }
  } catch (err) {
    sendToRenderer('remove-status', { skinId, state: 'error', message: `Dosya silinemedi: ${err.message}` })
    return { success: false, error: err.message }
  }

  // Aktif bir skin kaldırıldıysa overlay'i kalan skinlerle yeniden kur
  if (wasActive) {
    try {
      syncPatcher()
    } catch (err) {
      persistActiveSkins()
      sendToRenderer('patch-status', { state: 'error', message: 'Overlay güncellenemedi: ' + err.message })
    }
  }

  sendToRenderer('remove-status', { skinId, state: 'finished', message: 'Skin kaldırıldı' })
  return { success: true, wasActive }
})

// ÇOKLU AKTİVASYON: verilen tüm skinleri aktif kümesine ekler ve patcher'ı
// birleşik overlay ile yeniden başlatır. Zaten aktif olanlar atlanır.
ipcMain.handle('apply-skins', (_event, { skinIds }) => {
  if (!Array.isArray(skinIds) || skinIds.length === 0) {
    return { success: false, error: 'Skin seçilmedi' }
  }
  const check = validatePatcherSettings()
  if (check.error) {
    return { success: false, error: check.error }
  }
  const missing = []
  const alreadyActive = []
  let added = 0
  for (const id of skinIds) {
    if (!fs.existsSync(path.join(SKINS_DIR, `${id}.fantome`))) {
      missing.push(id)
      continue
    }
    if (activeSkins.has(id)) {
      alreadyActive.push(id)
      continue
    }
    activeSkins.add(id)
    added++
  }
  if (added === 0 && activeSkins.size === 0) {
    return { success: false, error: 'Skin dosyaları bulunamadı. Önce skinleri indirin.' }
  }
  if (added === 0) {
    // Hepsi zaten aktifti; yeniden merge etmeye gerek yok
    return { success: true, alreadyActive, missing, warnings: [] }
  }
  try {
    const { warnings } = syncPatcher()
    return { success: true, alreadyActive, missing, warnings }
  } catch (err) {
    persistActiveSkins()
    return { success: false, error: err.message, alreadyActive, missing }
  }
})

// Tek skini aktif kümeden çıkar (diğer aktif skinler çalışmaya devam eder)
ipcMain.handle('deactivate-skin', (_event, { skinId }) => {
  if (!activeSkins.has(skinId)) {
    return { success: false, error: 'Skin zaten aktif değil' }
  }
  activeSkins.delete(skinId)
  try {
    const { warnings } = syncPatcher()
    return { success: true, warnings }
  } catch (err) {
    persistActiveSkins()
    // Kalan skin yokken de hata oluşabilir (patcher yolu vs.) — durum yine de geçerli
    return { success: true, warnings: [err.message] }
  }
})

ipcMain.handle('get-active-skins', () => [...activeSkins])

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

// Uygulama kapanırken çalışan patcher sürecini temizle
app.on('before-quit', () => {
  stopPatcherProcess()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const { spawn } = require('child_process')
const https = require('https')
const fs = require('fs')
const path = require('path')
const { mergeWads, verifyWadFile, parseSkinArchive } = require('./wad.js')

let mainWindow = null

const SKINS_DIR = path.join(app.getPath('appData'), 'asset-manager', 'skins')
const SKINS_META_FILE = path.join(SKINS_DIR, 'skins-meta.json')
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json')

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
const LEAGUE_SKINS_RAW_BASE = 'https://raw.githubusercontent.com/forcible0/LoLskins/main'
const REPO_TREE_API_URL = 'https://api.github.com/repos/forcible0/LoLskins/git/trees/main?recursive=1'
const REPO_INDEX_FILE = path.join(app.getPath('userData'), 'repo-index.json')
const REPO_INDEX_TTL = 1000 * 60 * 60 * 6 // 6 saat — bu süreden eskiyse arka planda tazelenir

// ==================== DEPO İNDEKSİ ====================
// LoLskins deposu her zaman "skins/<champKey>/<skinId>/<skinId>.fantome" düz yapısında değil;
// bazı skinler (örn. çok formlu "Ölümsüz Efsane" tipi skinler) Riot'un resmi verisinde ayrı bir
// skin ID'si olsa da, depoda bir "ana" skinin klasörü altına nested (iç içe) konmuş olabilir:
//   skins/103/103085/103086/103086.fantome
// Bu yüzden URL'i tahmin etmek yerine, GitHub'ın Trees API'siyle tüm depo ağacını tek seferde
// çekip her ID'nin GERÇEK dosya yolunu bir haritada (id -> path) tutuyoruz.

let repoIndex = null // Map<string, string>  id -> "skins/.../<id>.fantome"
let repoIndexBuiltAt = 0
let repoIndexPromise = null

function fetchJson(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Çok fazla yönlendirme'))
    https
      .get(url, { headers: { 'User-Agent': 'hiqu-app', Accept: 'application/vnd.github+json' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return resolve(fetchJson(res.headers.location, redirectCount + 1))
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`GitHub API hatası (HTTP ${res.statusCode})`))
        }
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (err) {
            reject(err)
          }
        })
      })
      .on('error', reject)
  })
}

function buildIndexFromTree(tree) {
  const map = {}
  for (const entry of tree) {
    if (entry.type !== 'blob') continue
    const m = entry.path.match(/\/(\d+)\.fantome$/i)
    if (!m) continue
    map[m[1]] = entry.path // örn: "skins/103/103085/103086/103086.fantome"
  }
  return map
}

function loadCachedIndexFromDisk() {
  try {
    const cached = JSON.parse(fs.readFileSync(REPO_INDEX_FILE, 'utf8'))
    if (cached && cached.map) {
      repoIndex = cached.map
      repoIndexBuiltAt = cached.builtAt || 0
    }
  } catch {
    /* önbellek yok veya bozuk, sorun değil */
  }
}

// Depo indeksinin güncel olmasını garanti eder; gerekirse GitHub'dan tazeler.
// force=true ile manuel yenileme (IPC'den) tetiklenebilir.
async function ensureRepoIndex(force = false) {
  if (!repoIndex) loadCachedIndexFromDisk()
  const fresh = repoIndex && Date.now() - repoIndexBuiltAt < REPO_INDEX_TTL
  if (fresh && !force) return repoIndex
  if (repoIndexPromise) return repoIndexPromise

  repoIndexPromise = (async () => {
    try {
      const data = await fetchJson(REPO_TREE_API_URL)
      if (!data || !Array.isArray(data.tree)) throw new Error('Depo ağacı okunamadı')
      const map = buildIndexFromTree(data.tree)
      repoIndex = map
      repoIndexBuiltAt = Date.now()
      try {
        fs.mkdirSync(path.dirname(REPO_INDEX_FILE), { recursive: true })
        fs.writeFileSync(REPO_INDEX_FILE, JSON.stringify({ builtAt: repoIndexBuiltAt, map }))
      } catch (err) {
        console.error('Depo indeksi diske yazılamadı:', err.message)
      }
      return map
    } catch (err) {
      console.error('Depo indeksi GitHub\'dan çekilemedi, eski önbellek kullanılacak:', err.message)
      if (!repoIndex) loadCachedIndexFromDisk()
      if (!repoIndex) throw err
      return repoIndex
    } finally {
      repoIndexPromise = null
    }
  })()

  return repoIndexPromise
}

// Bir ID için gerçek indirme URL'ini indeksten çözer; indekste yoksa eski düz yola düşer.
async function resolveSkinDownloadUrl(id, fallbackUrl) {
  try {
    const idx = await ensureRepoIndex()
    const relPath = idx[id]
    if (relPath) return `${LEAGUE_SKINS_RAW_BASE}/${relPath}`
  } catch (err) {
    console.error('Depo indeksi kullanılamadı, düz yola düşülüyor:', err.message)
  }
  return fallbackUrl
}

function isValidId(id) {
  return typeof id === 'string' && /^\d+$/.test(id) && id.length <= 20
}

function readSettings() {
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))
    if (raw.ltkPath === undefined && raw.cslolPath !== undefined) raw.ltkPath = raw.cslolPath
    if (raw.dllPath === undefined && raw.gameDir !== undefined) raw.dllPath = raw.gameDir
    if (raw.patcherPath === undefined && raw.ltkPath !== undefined) {
      let p = raw.ltkPath
      if (/ltk-manager\.exe$/i.test(p)) {
        const hostExe = path.join(path.dirname(p), 'ltk_patcher_host.exe')
        if (fs.existsSync(hostExe)) p = hostExe
      }
      raw.patcherPath = p
    }
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

let patcherProcess = null
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
  patcherProcess = null
  try {
    if (proc.stopPatcher) proc.stopPatcher(); else proc.kill()
  } catch { /* yoksay */ }
}

function downloadFile(url, dest, onProgress, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Çok fazla yönlendirme'))
    https.get(url, (res) => {
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

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.loadFile('dist/index.html')

  mainWindow.webContents.on('did-finish-load', () => {
    if (activeSkins.size > 0 && !patcherProcess) {
      setTimeout(async () => {
        try {
          await syncPatcher()
        } catch (err) {
          console.error('Patcher geri yüklenemedi:', err.message)
        }
      }, 1000)
    }
  })
}

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

autoUpdater.on('update-available', (info) => sendToRenderer('update-available', info))
autoUpdater.on('update-not-available', (info) => sendToRenderer('update-not-available', info))
autoUpdater.on('download-progress', (progress) => sendToRenderer('download-progress', progress))
autoUpdater.on('update-downloaded', (info) => sendToRenderer('update-downloaded', info))
autoUpdater.on('error', (err) => sendToRenderer('update-error', err))

ipcMain.handle('check-for-updates', async () => {
  try {
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      return { success: true, message: 'Development modunda güncelleme kontrolü simüle edildi' }
    }
    await autoUpdater.checkForUpdates()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('get-settings', () => readSettings())

ipcMain.handle('save-settings', (_event, settings) => {
  const current = readSettings()
  const merged = { ...current, ...settings, activeSkins: [...activeSkins] }
  const ok = writeSettings(merged)
  return { success: ok, error: ok ? undefined : 'Ayarlar dosyaya yazılamadı' }
})

ipcMain.handle('select-patcher-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'ltk_patcher_host.exe seçin',
    filters: [{ name: 'Patcher Host', extensions: ['exe'] }],
    properties: ['openFile']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('select-dll-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'ltk_patcher_dll.dll dosyasını seçin',
    filters: [{ name: 'DLL', extensions: ['dll'] }],
    properties: ['openFile']
  })
  return result.canceled ? null : result.filePaths[0]
})

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

ipcMain.handle('select-game-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'League of Legends "Game" klasörünü seçin',
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

function validatePatcherSettings() {
  const settings = readSettings()
  if (!settings.patcherPath) return { error: 'Patcher Yolu ayarlanmamış' }
  if (!fs.existsSync(settings.patcherPath)) return { error: 'ltk_patcher_host.exe bulunamadı' }
  if (!settings.dllPath) return { error: 'DLL Yolu ayarlanmamış' }
  if (!fs.existsSync(settings.dllPath)) return { error: 'ltk_patcher_dll.dll bulunamadı' }
  const gameDir = resolveGameDir(settings)
  if (!gameDir) return { error: 'League of Legends "Game" klasörü bulunamadı.' }
  return { settings, gameDir }
}

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

function rebuildOverlay(skinIds, gameDir) {
  const overlayDir = path.join(app.getPath('userData'), 'overlay')
  const extractDir = path.join(app.getPath('userData'), 'overlay_extract')
  fs.rmSync(overlayDir, { recursive: true, force: true })
  fs.rmSync(extractDir, { recursive: true, force: true })
  fs.mkdirSync(overlayDir, { recursive: true })
  fs.mkdirSync(extractDir, { recursive: true })

  const sevenZip = require('7zip-bin')
  const { execFileSync } = require('child_process')
  const wadGroups = new Map()
  const warnings = []

  for (const skinId of skinIds) {
    if (!isValidId(skinId)) {
      warnings.push(`Geçersiz skin ID atlandı: ${skinId}`)
      continue
    }
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

    // Klasör bağımsız esnek tarama: Tüm çıkarılan dizin altındaki .wad.client dosyalarını bulur
    let found = 0
    const walk = (dir) => {
      if (!fs.existsSync(dir)) return
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
          continue
        }
        if (!entry.isFile()) continue
        if (!/\.wad\.client$/i.test(entry.name)) continue
        const key = entry.name.toLowerCase()
        if (!wadGroups.has(key)) wadGroups.set(key, { name: entry.name, files: [] })
        wadGroups.get(key).files.push(full)
        found++
      }
    }
    walk(skinExtractDir)

    if (found === 0) warnings.push(`Fantome dosyasında wad bulunamadı (${skinId})`)
  }

  if (wadGroups.size === 0) {
    throw new Error('Seçili skinler için wad bulunamadı')
  }

  let mergedCount = 0
  const dbgLines = [`=== ${new Date().toISOString()} skins=[${skinIds.join(',')}] ===`]
  const flushDbg = () => {
    try {
      fs.writeFileSync(path.join(app.getPath('userData'), 'overlay-debug.log'), dbgLines.join('\n') + '\n')
    } catch {}
  }

  for (const { name, files } of wadGroups.values()) {
    const gameWadPath = findGameWad(gameDir, name)
    if (!gameWadPath) {
      warnings.push(`Oyun wad'ı bulunamadı: ${name}`)
      continue
    }
    const dest = path.relative(gameDir, gameWadPath)
    const outPath = path.join(overlayDir, dest)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })

    // Stream tabanlı Zincirleme Merge
    let currentInputPath = gameWadPath
    for (const modFile of files) {
      const st = mergeWads(currentInputPath, modFile, outPath)
      dbgLines.push(
        `[${name}] mod=${path.basename(modFile)} modWAD=v${st.modVersion} baseWAD=v${st.baseVersion} ` +
          `oyunChunk=${st.baseEntries} modChunk=${st.modEntries} override=${st.overriddenChunks} yeni=${st.addedChunks} ` +
          `sıkıştırmaTürleri=${JSON.stringify(st.modTypes)} çıktıBoyut=${st.outSize}`
      )
      currentInputPath = outPath
    }

    const problems = verifyWadFile(outPath)
    if (problems.length > 0) {
      dbgLines.push(`[${name}] BÜTÜNLÜK SORUNU: ${problems.join('; ')}`)
      flushDbg()
      throw new Error(`Birleştirilen wad bozuk (${name}): ${problems.join('; ')}`)
    }
    dbgLines.push(`[${name}] bütünlük kontrolü: OK`)
    mergedCount++
  }

  dbgLines.push(...warnings.map((w) => `UYARI: ${w}`))
  flushDbg()
  if (mergedCount === 0) {
    throw new Error('Hiçbir wad birleştirilemedi. ' + warnings.join(' | '))
  }
  return { overlayDir, mergedCount, warnings }
}

function spawnPatcher(overlayDir, settings, skinIds) {
  const child = spawn(settings.patcherPath, [], {
    cwd: path.dirname(settings.patcherPath),
    windowsHide: true
  })
  patcherProcess = child

  let stopped = false
  const sendCmd = (cmd) => {
    if (stopped || !child.stdin.writable) return
    try { child.stdin.write(cmd + '\n') } catch {}
  }

  const safeOverlayPath = overlayDir.replace(/\\/g, '/').replace(/\/+$/, '') + '/'

  const startupTimers = [
    setTimeout(() => sendCmd('config loglevel 4096'), 300),
    setTimeout(() => sendCmd('config flags 12'), 400),
    setTimeout(() => sendCmd(`config prefix ${safeOverlayPath}`), 500),
    setTimeout(() => sendCmd('start scan'), 700)
  ]

  const logFile = path.join(app.getPath('userData'), 'patcher.log')
  const appendLog = (s) => { try { fs.appendFileSync(logFile, s) } catch {} }
  appendLog(`\n=== ${new Date().toISOString()} skins=[${skinIds.join(',')}] overlay=${overlayDir} ===\n`)

  let stdoutBuf = ''
  child.stdout.on('data', (d) => {
    appendLog(d)
    stdoutBuf += d.toString()
    const lines = stdoutBuf.split(/\r?\n/)
    stdoutBuf = lines.pop() || ''
    for (const line of lines) {
      if (/\bERROR\b/.test(line)) {
        sendToRenderer('patch-status', { state: 'error', message: line.trim() })
      } else if (/hook installed|\binjected\b|overlay verified|dll attached/i.test(line)) {
        sendToRenderer('patch-status', { state: 'started', message: line.trim() })
      }
    }
  })

  child.stopPatcher = () => {
    stopped = true
    for (const t of startupTimers) clearTimeout(t)
    sendCmd('stop')
    setTimeout(() => { try { child.stdin.end() } catch {} }, 300)
    setTimeout(() => { try { child.kill() } catch {} }, 3000)
  }

  child.on('error', (err) => {
    if (patcherProcess === child) {
      patcherProcess = null
      sendToRenderer('patch-status', { state: 'error', message: `Başlatılamadı: ${err.message}` })
    }
  })

  child.on('exit', (code) => {
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

async function syncPatcher() {
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
  if (check.error) throw new Error(check.error)

  const { overlayDir: outDir, mergedCount, warnings } = rebuildOverlay(skinIds, check.gameDir)

  await new Promise((resolve) => setTimeout(resolve, 500))

  spawnPatcher(outDir, check.settings, skinIds)
  persistActiveSkins()
  sendToRenderer('patch-status', {
    state: 'started',
    message: `Patcher aktif — ${skinIds.length} skin, ${mergedCount} wad birleştirildi`
  })
  return { warnings }
}

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

ipcMain.handle('download-skin', async (_event, { championKey, skinId, meta }) => {
  if (!isValidId(championKey) || !isValidId(skinId)) {
    return { success: false, error: 'Geçersiz şampiyon veya skin ID' }
  }
  const flatUrl = `${LEAGUE_SKINS_BASE}/${championKey}/${skinId}/${skinId}.fantome`
  const url = await resolveSkinDownloadUrl(skinId, flatUrl)
  const dest = path.join(SKINS_DIR, `${skinId}.fantome`)
  try {
    fs.mkdirSync(SKINS_DIR, { recursive: true })
    await downloadFile(url, dest, (percent) => {
      sendToRenderer('skin-download-progress', { skinId, percent })
    })
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

ipcMain.handle('download-chroma', async (_event, { championKey, skinId, chromaId, meta }) => {
  if (!isValidId(championKey) || !isValidId(skinId) || !isValidId(chromaId)) {
    return { success: false, error: 'Geçersiz şampiyon, skin veya chroma ID' }
  }
  const flatUrl = `${LEAGUE_SKINS_BASE}/${championKey}/${skinId}/${chromaId}/${chromaId}.fantome`
  const url = await resolveSkinDownloadUrl(chromaId, flatUrl)
  const dest = path.join(SKINS_DIR, `${chromaId}.fantome`)
  try {
    fs.mkdirSync(SKINS_DIR, { recursive: true })
    await downloadFile(url, dest, (percent) => {
      sendToRenderer('skin-download-progress', { skinId: chromaId, percent })
    })
    if (meta && typeof meta === 'object') {
      const all = readSkinsMeta()
      all[chromaId] = {
        id: chromaId,
        name: meta.name || `Chroma ${chromaId}`,
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

ipcMain.handle('import-custom-skin', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Özel skin dosyası seçin (.fantome / .zip)',
    filters: [{ name: 'Skin Dosyası', extensions: ['fantome', 'zip'] }],
    properties: ['openFile']
  })
  if (result.canceled || !result.filePaths[0]) {
    return { success: false, canceled: true }
  }
  const srcPath = result.filePaths[0]

  let parsedData = null
  try {
    const fileBuf = await fs.promises.readFile(srcPath)
    parsedData = await parseSkinArchive(fileBuf)
  } catch (err) {
    console.warn('JSZip parser ayrıştıramadı, alternatif yönteme geçiliyor:', err.message)
  }

  const champFiles = []

  if (parsedData && parsedData.wadFiles.length > 0) {
    for (const w of parsedData.wadFiles) {
      champFiles.push(w.fileName)
    }
  } else {
    const sevenZip = require('7zip-bin')
    const { execFileSync } = require('child_process')
    const tmpExtractDir = path.join(app.getPath('userData'), 'custom_import_tmp')
    fs.rmSync(tmpExtractDir, { recursive: true, force: true })
    fs.mkdirSync(tmpExtractDir, { recursive: true })

    try {
      execFileSync(sevenZip.path7za, ['x', '-y', `-o${tmpExtractDir}`, srcPath], { windowsHide: true })
      const findWads = (dir) => {
        if (!fs.existsSync(dir)) return
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            findWads(full)
          } else if (entry.isFile() && /\.wad\.client$/i.test(entry.name)) {
            champFiles.push(entry.name)
          }
        }
      }
      findWads(tmpExtractDir)
    } catch (err) {
      console.error('7zip çıkarma hatası:', err.message)
    } finally {
      fs.rmSync(tmpExtractDir, { recursive: true, force: true })
    }
  }

  if (champFiles.length === 0) {
    return { success: false, error: "Dosyada geçerli bir şampiyon WAD dosyası bulunamadı" }
  }
  const detectedChampions = [...new Set(champFiles.map((f) => f.replace(/\.wad\.client$/i, '')))]

  const customId = '9' + Date.now().toString() + Math.floor(100 + Math.random() * 900).toString()
  const dest = path.join(SKINS_DIR, `${customId}.fantome`)
  try {
    fs.mkdirSync(SKINS_DIR, { recursive: true })
    fs.copyFileSync(srcPath, dest)
  } catch (err) {
    return { success: false, error: 'Dosya kopyalanamadı: ' + err.message }
  }

  // Meta bilgisini otomatik kaydet
  const allMeta = readSkinsMeta()
  allMeta[customId] = {
    id: customId,
    name: (parsedData && parsedData.name) || path.basename(srcPath, path.extname(srcPath)),
    num: 0,
    championId: detectedChampions[0] || '',
    championKey: detectedChampions[0] || '',
    championName: detectedChampions[0] || '',
    isCustom: true,
    previewUrl: (parsedData && parsedData.previewDataUrl) || null,
    downloadedAt: Date.now()
  }
  writeSkinsMeta(allMeta)

  return {
    success: true,
    customId,
    detectedChampions,
    fileName: (parsedData && parsedData.name) || path.basename(srcPath, path.extname(srcPath)),
    previewDataUrl: (parsedData && parsedData.previewDataUrl) || null
  }
})

ipcMain.handle('save-custom-skin-meta', (_event, { customId, meta }) => {
  if (!isValidId(customId)) return { success: false, error: 'Geçersiz ID' }
  const filePath = path.join(SKINS_DIR, `${customId}.fantome`)
  if (!fs.existsSync(filePath)) return { success: false, error: 'Skin dosyası bulunamadı' }
  const all = readSkinsMeta()
  const current = all[customId] || {}
  all[customId] = {
    ...current,
    id: customId,
    name: (meta && meta.name) || current.name || 'Özel Skin',
    num: 0,
    championId: (meta && meta.championId) || current.championId || '',
    championKey: (meta && meta.championKey) || current.championKey || '',
    championName: (meta && meta.championName) || current.championName || '',
    isCustom: true,
    downloadedAt: Date.now()
  }
  writeSkinsMeta(all)
  return { success: true }
})

ipcMain.handle('remove-skin', async (_event, { skinId }) => {
  if (!isValidId(skinId)) return { success: false, error: 'Geçersiz skin ID' }
  const filePath = path.join(SKINS_DIR, `${skinId}.fantome`)
  sendToRenderer('remove-status', { skinId, state: 'started', message: 'Kaldırılıyor...' })

  const wasActive = activeSkins.delete(skinId)

  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    const meta = readSkinsMeta()
    if (meta[skinId]) {
      delete meta[skinId]
      writeSkinsMeta(meta)
    }
  } catch (err) {
    sendToRenderer('remove-status', { skinId, state: 'error', message: `Dosya silinemedi: ${err.message}` })
    return { success: false, error: err.message }
  }

  if (wasActive) {
    try {
      await syncPatcher()
    } catch (err) {
      persistActiveSkins()
      sendToRenderer('patch-status', { state: 'error', message: 'Overlay güncellenemedi: ' + err.message })
    }
  }

  sendToRenderer('remove-status', { skinId, state: 'finished', message: 'Skin kaldırıldı' })
  return { success: true, wasActive }
})

ipcMain.handle('apply-skins', async (_event, { skinIds }) => {
  if (!Array.isArray(skinIds) || skinIds.length === 0) {
    return { success: false, error: 'Skin seçilmedi' }
  }
  const check = validatePatcherSettings()
  if (check.error) return { success: false, error: check.error }

  const missing = []
  const alreadyActive = []
  let added = 0
  for (const id of skinIds) {
    if (!isValidId(id) || !fs.existsSync(path.join(SKINS_DIR, `${id}.fantome`))) {
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
    return { success: false, error: 'Skin dosyaları bulunamadı.' }
  }
  if (added === 0) {
    return { success: true, alreadyActive, missing, warnings: [] }
  }

  try {
    const { warnings } = await syncPatcher()
    return { success: true, alreadyActive, missing, warnings }
  } catch (err) {
    persistActiveSkins()
    return { success: false, error: err.message, alreadyActive, missing }
  }
})

ipcMain.handle('deactivate-skin', async (_event, { skinId }) => {
  if (!isValidId(skinId) || !activeSkins.has(skinId)) {
    return { success: false, error: 'Skin zaten aktif değil' }
  }
  activeSkins.delete(skinId)
  try {
    const { warnings } = await syncPatcher()
    return { success: true, warnings }
  } catch (err) {
    persistActiveSkins()
    return { success: true, warnings: [err.message] }
  }
})

ipcMain.handle('get-active-skins', () => [...activeSkins])

ipcMain.on('install-update', () => {
  try {
    autoUpdater.quitAndInstall()
  } catch (error) {
    console.error('Güncelleme yüklenirken hata:', error)
  }
})

ipcMain.handle('refresh-repo-index', async () => {
  try {
    await ensureRepoIndex(true)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

app.whenReady().then(() => {
  createWindow()

  // Depo indeksini arka planda önceden çek (fire-and-forget) — ilk indirme GitHub'ı beklemesin
  ensureRepoIndex().catch((err) => console.error('Depo indeksi önceden çekilemedi:', err.message))

  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('Otomatik güncelleme kontrolü hatası:', err)
      })
    }, 3000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => stopPatcherProcess())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
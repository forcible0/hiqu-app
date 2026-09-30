// Riot WAD arşivi okuma ve birleştirme (merge) yardımcıları.
// League modlamada fantome'deki .wad.client dosyası yalnızca DEĞİŞEN chunk'ları içerir.
// RAM kilitlenmesini ve 2 GB Buffer sınırını aşmak için dosyalar diskten 64 KB'lık parçalarla kopyalanır.

const fs = require('fs')
const JSZip = require('jszip')

const WAD_MAGIC = 0x5752 // 'RW'
const TOC_ENTRY_SIZE = 32
const CHUNK_READ_BUF_SIZE = 64 * 1024 // 64 KB parçalı kopyalama tamponu

// Fantome / ZIP arşivini esnek şekilde tarayan yardımcı fonksiyon
async function parseSkinArchive(fileBuffer) {
  const zip = await JSZip.loadAsync(fileBuffer)
  const allPaths = Object.keys(zip.files)

  // 1. Esnek WAD Arama (Klasör seviyesi ve büyük/küçük harf bağımsız)
  const wadEntries = allPaths
    .filter((filePath) => {
      const entry = zip.files[filePath]
      if (entry.dir) return false
      const lower = filePath.toLowerCase()
      return lower.endsWith('.wad.client') || lower.endsWith('.wad')
    })
    .map((zipPath) => ({
      zipPath,
      fileName: zipPath.split('/').pop()
    }))

  if (wadEntries.length === 0) {
    throw new Error('Seçili skinler için WAD dosyası bulunamadı')
  }

  // 2. Esnek Meta (info.json) Arama
  const infoJsonPath = allPaths.find((p) => p.toLowerCase().endsWith('info.json'))
  let meta = {}

  if (infoJsonPath) {
    try {
      const jsonText = await zip.files[infoJsonPath].async('string')
      meta = JSON.parse(jsonText)
    } catch (err) {
      console.warn('info.json okunamadı:', err)
    }
  }

  // 3. Esnek Önizleme Görseli Arama
  const imagePath =
    allPaths.find((p) => {
      const entry = zip.files[p]
      if (entry.dir) return false
      const lower = p.toLowerCase()
      return (
        /\.(png|jpg|jpeg|webp)$/.test(lower) &&
        (lower.includes('meta/') || lower.includes('preview') || lower.includes('icon') || lower.includes('image'))
      )
    }) || allPaths.find((p) => !zip.files[p].dir && /\.(png|jpg|jpeg|webp)$/i.test(p))

  let previewDataUrl = null
  if (imagePath) {
    try {
      const base64 = await zip.files[imagePath].async('base64')
      const ext = imagePath.split('.').pop().toLowerCase()
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
      previewDataUrl = `data:${mime};base64,${base64}`
    } catch (err) {
      console.warn('Görsel dönüştürülemedi:', err)
    }
  }

  return {
    name: meta.Name || meta.name || 'Bilinmeyen Skin',
    version: meta.Version || meta.version || '1.0.0',
    author: meta.Author || meta.author || 'Bilinmeyen Yazar',
    wadFiles: wadEntries,
    previewDataUrl,
    zipInstance: zip
  }
}

// Sadece Header + TOC kısmını okur (Tüm dosyayı RAM'e yüklemez)
function parseWadHeaderAndToc(filePath) {
  const fd = fs.openSync(filePath, 'r')
  try {
    const headerBuf = Buffer.alloc(272)
    const readHeader = fs.readSync(fd, headerBuf, 0, 272, 0)
    if (readHeader < 272 || headerBuf.readUInt16LE(0) !== WAD_MAGIC) {
      throw new Error('Geçersiz WAD dosyası (magic bulunamadı)')
    }
    const major = headerBuf[2]
    const minor = headerBuf[3]
    if (major < 3) {
      throw new Error(`Desteklenmeyen WAD sürümü: ${major}.${minor}`)
    }
    const signature = Buffer.from(headerBuf.subarray(4, 260))
    const checksum = Buffer.from(headerBuf.subarray(260, 268))
    const entryCount = headerBuf.readUInt32LE(268)
    const tocLen = entryCount * TOC_ENTRY_SIZE

    const tocBuf = Buffer.alloc(tocLen)
    const readToc = fs.readSync(fd, tocBuf, 0, tocLen, 272)
    if (readToc < tocLen) {
      throw new Error('Bozuk WAD: chunk tablosu dosya sonunu aşıyor')
    }

    const entries = []
    let p = 0
    for (let i = 0; i < entryCount; i++) {
      entries.push({
        hash: tocBuf.readBigUInt64LE(p),
        dataOffset: tocBuf.readUInt32LE(p + 8),
        compressedSize: tocBuf.readUInt32LE(p + 12),
        size: tocBuf.readUInt32LE(p + 16),
        tail: Buffer.from(tocBuf.subarray(p + 20, p + 32))
      })
      p += TOC_ENTRY_SIZE
    }
    return { major, minor, signature, checksum, entries }
  } finally {
    fs.closeSync(fd)
  }
}

// Dosya yolları üzerinden sıfır RAM yüküyle WAD birleştirir
function mergeWads(basePath, modPath, outPath, options = {}) {
  const addNew = options.addNew !== false

  const base = parseWadHeaderAndToc(basePath)
  const mod = parseWadHeaderAndToc(modPath)

  // Mod dosyaları küçük olduğu için mod chunk'ları RAM'e alınır
  const modFd = fs.openSync(modPath, 'r')
  const modByHash = new Map()

  try {
    for (const e of mod.entries) {
      const chunkBuf = Buffer.alloc(e.compressedSize)
      fs.readSync(modFd, chunkBuf, 0, e.compressedSize, e.dataOffset)
      modByHash.set(e.hash, {
        hash: e.hash,
        compressedSize: e.compressedSize,
        size: e.size,
        tail: e.tail,
        data: chunkBuf
      })
    }
  } finally {
    fs.closeSync(modFd)
  }

  const outEntries = []

  // 1) Oyunun chunk'ları
  for (const e of base.entries) {
    const override = modByHash.get(e.hash)
    if (override) {
      modByHash.delete(e.hash)
      outEntries.push(override)
    } else {
      outEntries.push({
        hash: e.hash,
        compressedSize: e.compressedSize,
        size: e.size,
        tail: e.tail,
        srcOffset: e.dataOffset
      })
    }
  }

  // 2) Mod'un eklediği yeni chunk'lar
  if (addNew) {
    for (const override of modByHash.values()) {
      outEntries.push(override)
    }
  }

  // Path hash sıralaması (League zorunluluğu)
  outEntries.sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0))

  const headerLen = 272
  const tocLen = outEntries.length * TOC_ENTRY_SIZE
  const dataStart = headerLen + tocLen

  let pos = 0
  for (const e of outEntries) {
    e.outOffset = dataStart + pos
    pos += e.compressedSize
  }

  if (dataStart + pos > 0xffffffff) {
    throw new Error('Birleştirilmiş WAD 4 GB sınırını aşıyor (32-bit offset sınırı)')
  }

  // Çıktı dosyasını diske parça parça kopyalama
  const outFd = fs.openSync(outPath, 'w')
  const baseFd = fs.openSync(basePath, 'r')

  try {
    // Header
    const header = Buffer.alloc(headerLen)
    header.writeUInt16LE(WAD_MAGIC, 0)
    header[2] = base.major
    header[3] = base.minor
    base.signature.copy(header, 4)
    base.checksum.copy(header, 260)
    header.writeUInt32LE(outEntries.length, 268)
    fs.writeSync(outFd, header, 0, headerLen)

    // TOC
    const toc = Buffer.alloc(tocLen)
    let t = 0
    for (const e of outEntries) {
      toc.writeBigUInt64LE(e.hash, t)
      toc.writeUInt32LE(e.outOffset, t + 8)
      toc.writeUInt32LE(e.compressedSize, t + 12)
      toc.writeUInt32LE(e.size, t + 16)
      e.tail.copy(toc, t + 20)
      t += TOC_ENTRY_SIZE
    }
    fs.writeSync(outFd, toc, 0, tocLen)

    // Chunk Verisi (Parçalı Aktarım)
    const copyBuf = Buffer.alloc(CHUNK_READ_BUF_SIZE)
    for (const e of outEntries) {
      if (e.data) {
        fs.writeSync(outFd, e.data, 0, e.compressedSize)
      } else {
        let remaining = e.compressedSize
        let readPos = e.srcOffset
        while (remaining > 0) {
          const toRead = Math.min(remaining, CHUNK_READ_BUF_SIZE)
          const bytesRead = fs.readSync(baseFd, copyBuf, 0, toRead, readPos)
          if (bytesRead === 0) break
          fs.writeSync(outFd, copyBuf, 0, bytesRead)
          readPos += bytesRead
          remaining -= bytesRead
        }
      }
    }
  } finally {
    fs.closeSync(outFd)
    fs.closeSync(baseFd)
  }

  const modTypes = {}
  for (const e of mod.entries) {
    const t = e.tail[0] & 0x0f
    modTypes[t] = (modTypes[t] || 0) + 1
  }

  return {
    entryCount: outEntries.length,
    overriddenChunks: mod.entries.length - modByHash.size,
    baseEntries: base.entries.length,
    modEntries: mod.entries.length,
    addedChunks: addNew ? modByHash.size : 0,
    modVersion: `${mod.major}.${mod.minor}`,
    baseVersion: `${base.major}.${base.minor}`,
    modTypes,
    outSize: dataStart + pos
  }
}

function verifyWadFile(filePath) {
  const problems = []
  const size = fs.statSync(filePath).size
  const fd = fs.openSync(filePath, 'r')
  try {
    const headerBuf = Buffer.alloc(272)
    fs.readSync(fd, headerBuf, 0, 272, 0)
    if (headerBuf.readUInt16LE(0) !== WAD_MAGIC) return ['magic geçersiz']
    const count = headerBuf.readUInt32LE(268)
    const tocLen = count * TOC_ENTRY_SIZE
    if (272 + tocLen > size) return ['TOC dosya sonunu aşıyor']
    const tocBuf = Buffer.alloc(tocLen)
    fs.readSync(fd, tocBuf, 0, tocLen, 272)
    let prev = -1n
    for (let i = 0; i < count; i++) {
      const p = i * TOC_ENTRY_SIZE
      const hash = tocBuf.readBigUInt64LE(p)
      const off = tocBuf.readUInt32LE(p + 8)
      const csize = tocBuf.readUInt32LE(p + 12)
      if (hash <= prev) problems.push(`hash sırası bozuk (entry ${i})`)
      if (off < 272 + tocLen || off + csize > size) problems.push(`chunk sınır dışı (entry ${i})`)
      prev = hash
      if (problems.length >= 5) break
    }
  } finally {
    fs.closeSync(fd)
  }
  return problems
}

function readWadHashes(filePath) {
  const fd = fs.openSync(filePath, 'r')
  try {
    const headerBuf = Buffer.alloc(272)
    fs.readSync(fd, headerBuf, 0, 272, 0)
    if (headerBuf.readUInt16LE(0) !== WAD_MAGIC) return []
    const entryCount = headerBuf.readUInt32LE(268)
    const tocLen = entryCount * TOC_ENTRY_SIZE
    const tocBuf = Buffer.alloc(tocLen)
    fs.readSync(fd, tocBuf, 0, tocLen, 272)
    const hashes = []
    for (let i = 0; i < entryCount; i++) {
      hashes.push(tocBuf.readBigUInt64LE(i * TOC_ENTRY_SIZE))
    }
    return hashes
  } finally {
    fs.closeSync(fd)
  }
}

module.exports = { parseSkinArchive, parseWadHeaderAndToc, mergeWads, readWadHashes, verifyWadFile }
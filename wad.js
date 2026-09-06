// Riot WAD arşivi okuma ve birleştirme (merge) yardımcıları.
// League modlamada fantome'deki .wad.client dosyası yalnızca DEĞİŞEN chunk'ları içerir;
// overlay'e yazılacak dosya = oyunun asıl wad'ının üzerine mod chunk'larının bindirilmiş hali (LTK Manager ile aynı yöntem).
// Sıkıştırma türüne (raw/gzip/zstd/zstd-multi) bakılmaksızın chunk verisi ham byte olarak kopyalanır.

const fs = require('fs')

const WAD_MAGIC = 0x5752 // 'RW'
const TOC_ENTRY_SIZE = 32

// WAD arşiv başlığını ve chunk tablosunu parse eder.
// Düzen (LeagueToolkit v3): magic(2) + major(1) + minor(1) + signature(256) +
// checksum(8) + chunkCount(4), ardından hemen TOC gelir — her kayıt 32 bayt:
// pathHash(8) dataOffset(4) compressedSize(4) size(4) tail(12: type+frame+start+checksum).
function parseWad(buf) {
  if (buf.length < 4 + 256 + 12 || buf.readUInt16LE(0) !== WAD_MAGIC) {
    throw new Error('Geçersiz WAD dosyası (magic bulunamadı)')
  }
  const major = buf[2]
  const minor = buf[3]
  if (major < 3) {
    throw new Error(`Desteklenmeyen WAD sürümü: ${major}.${minor}`)
  }
  const signature = buf.subarray(4, 4 + 256)
  const checksum = buf.subarray(260, 268)
  const entryCount = buf.readUInt32LE(268)
  const headerLen = 272
  const tocLen = entryCount * TOC_ENTRY_SIZE
  if (buf.length < headerLen + tocLen) {
    throw new Error('Bozuk WAD: chunk tablosu dosya sonunu aşıyor')
  }

  const entries = []
  let p = headerLen
  for (let i = 0; i < entryCount; i++) {
    entries.push({
      hash: buf.readBigUInt64LE(p),
      dataOffset: buf.readUInt32LE(p + 8),
      compressedSize: buf.readUInt32LE(p + 12),
      size: buf.readUInt32LE(p + 16),
      // entry'nin geri kalan 12 baytı (sıkıştırma türü, subchunk bilgisi, checksum) aynen korunur
      tail: Buffer.from(buf.subarray(p + 20, p + 32))
    })
    p += TOC_ENTRY_SIZE
  }
  return { major, minor, signature, checksum, headerLen, buf, entries }
}

// BASE_WAD_PLACEHOLDER
function mergeWads(baseBuf, modBuf, outPath) {
  const base = parseWad(baseBuf)
  const mod = parseWad(modBuf)

  const modByHash = new Map()
  for (const e of mod.entries) modByHash.set(e.hash, e)

  const outEntries = []

  const addEntry = (e, srcBuf) => {
    const data = srcBuf.subarray(e.dataOffset, e.dataOffset + e.compressedSize)
    if (data.length !== e.compressedSize) {
      throw new Error('WAD chunk verisi eksik (bozuk arşiv)')
    }
    outEntries.push({
      hash: e.hash,
      dataOffset: 0, // sıralamadan sonra hesaplanır
      compressedSize: e.compressedSize,
      size: e.size,
      tail: e.tail,
      data: Buffer.from(data) // ham (muhtemelen sıkıştırılmış) chunk verisi
    })
  }

  // 1) Oyunun tüm chunk'ları: mod bunu geçersiz kılıyorsa mod'unkini, yoksa orijinali al
  for (const e of base.entries) {
    const override = modByHash.get(e.hash)
    if (override) {
      modByHash.delete(e.hash) // kullanıldığını işaretle
      addEntry(override, mod.buf)
    } else {
      addEntry(e, base.buf)
    }
  }
  // 2) Mod'un kendi eklediği ve oyunda olmayan chunk'lar
  for (const e of modByHash.values()) addEntry(e, mod.buf)

  // Çıktı düzeni: header (272B, base'in imzası/checksum'ı korunur) + TOC + chunk verisi.
  // League chunk tablosunun path_hash sıralı olmasını zorunlu tutar.
  outEntries.sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0))

  const headerLen = 272
  const tocLen = outEntries.length * TOC_ENTRY_SIZE
  const dataStart = headerLen + tocLen

  // Sıralandıktan sonra her entry'nin veri konumunu hesapla
  let pos = 0
  for (const e of outEntries) {
    e.dataOffset = dataStart + pos
    pos += e.data.length
  }

  const header = Buffer.alloc(headerLen)
  header.writeUInt16LE(WAD_MAGIC, 0)
  header[2] = base.major
  header[3] = base.minor
  base.signature.copy(header, 4)
  base.checksum.copy(header, 260)
  header.writeUInt32LE(outEntries.length, 268)

  const toc = Buffer.alloc(tocLen)
  let t = 0
  for (const e of outEntries) {
    toc.writeBigUInt64LE(e.hash, t)
    toc.writeUInt32LE(e.dataOffset, t + 8)
    toc.writeUInt32LE(e.compressedSize, t + 12)
    toc.writeUInt32LE(e.size, t + 16)
    e.tail.copy(toc, t + 20)
    t += TOC_ENTRY_SIZE
  }

  fs.writeFileSync(outPath, Buffer.concat([header, toc, ...outEntries.map((e) => e.data)]))
  return { entryCount: outEntries.length, overriddenChunks: mod.entries.length - modByHash.size }
}

module.exports = { parseWad, mergeWads }

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

async function rebaseWadFile(options) {
  const { wadPath, championName, outputDir, toolsDir } = options;
  const ritobinPath = path.join(toolsDir, 'ritobin.exe');

  const champLower = championName.toLowerCase();
  const tempExtractDir = path.join(outputDir, `temp_${champLower}_rebase`);
  const rebasedWadPath = path.join(outputDir, `${champLower}_rebased.wad.client`);

  await fs.ensureDir(tempExtractDir);

  try {
    // 1. WAD dosyasını geçici dizine çıkar (ritobin ile)
    await execFileAsync(ritobinPath, ['extract', wadPath, '-o', tempExtractDir]);

    // 2. Ayıklanan dosyalar arasındaki .bin dosyasını bul (Örn: data/final/champions/lulu.bin)
    const binFiles = await findBinFiles(tempExtractDir);

    for (const binFile of binFiles) {
      const pyFile = binFile.replace(/\.bin$/, '.py');

      // 3. BIN -> PY (ritobin ile okunabilir metne çevir)
      await execFileAsync(ritobinPath, ['build', binFile]);

      if (await fs.pathExists(pyFile)) {
        // 4. Metin içinde skin referanslarını Skin0'a çek
        let content = await fs.readFile(pyFile, 'utf-8');

        // Örn: luluSkin15 -> luluSkin0 veya Skins/Skin15 -> Skins/Skin0 değişimleri
        const skinRegex = new RegExp(`${champLower}Skin\\d+`, 'gi');
        content = content.replace(skinRegex, `${champLower}Skin0`);

        const skinPathRegex = new RegExp(`Skins/Skin\\d+`, 'gi');
        content = content.replace(skinPathRegex, 'Skins/Skin0');

        await fs.writeFile(pyFile, content, 'utf-8');

        // 5. PY -> BIN (Tekrar derle)
        await execFileAsync(ritobinPath, ['build', pyFile]);

        // Geçici .py dosyasını temizle
        await fs.remove(pyFile);
      }
    }

    // 6. Değiştirilmiş dosyaları tekrar WAD olarak paketle
    await execFileAsync(ritobinPath, ['build', tempExtractDir, '-o', rebasedWadPath]);

    // 7. Geçici dizini temizle
    await fs.remove(tempExtractDir);

    console.log(`[Rebaser] ${championName} kostümü başarıyla skin0 yapısına dönüştürüldü.`);
    return rebasedWadPath;

  } catch (error) {
    console.error('[Rebaser Error]', error);
    // Hata durumunda geçici dizini temizlemeye çalış
    try {
      await fs.remove(tempExtractDir);
    } catch {}
    throw error;
  }
}

// Yardımcı Fonksiyon: Dizin içindeki .bin dosyalarını bulur
async function findBinFiles(dir) {
  let results = [];
  const list = await fs.readdir(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(await findBinFiles(filePath));
    } else if (file.endsWith('.bin')) {
      results.push(filePath);
    }
  }

  return results;
}

module.exports = { rebaseWadFile };
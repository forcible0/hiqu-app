const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

async function rebaseWadFile(options) {
  const { wadPath, championName, outputDir, toolsDir } = options;
  const ritobinPath = path.join(toolsDir, 'ritobin_cli.exe');

  // Ritobin kontrolü
  if (!fs.existsSync(ritobinPath)) {
    console.error(`[Rebaser] ritobin_cli.exe bulunamadı: ${ritobinPath}`);
    return wadPath; // Fail-safe: orijinal dosyayı döndür
  }

  const champLower = championName.toLowerCase();
  // BENZERSİZ geçici klasör (timestamp + random) - çoklu skin desteği için isolation
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const tempExtractDir = path.join(outputDir, `temp_${champLower}_${uniqueId}`);
  const rebasedWadPath = path.join(outputDir, `${champLower}_rebased_${uniqueId}.wad.client`);

  await fs.ensureDir(tempExtractDir);

  let rebaseSuccess = false;

  try {
    // 1. WAD dosyasını geçici dizine çıkar (ritobin ile)
    await execFileAsync(ritobinPath, ['extract', wadPath, tempExtractDir], {
      windowsHide: true,
      timeout: 30000 // 30 saniye timeout
    });

    // 2. Ayıklanan dosyalar arasındaki .bin dosyasını bul
    const binFiles = await findBinFiles(tempExtractDir);

    if (binFiles.length === 0) {
      console.warn(`[Rebaser] ${championName}: .bin dosyası bulunamadı, rebase atlanıyor`);
      return wadPath;
    }

    for (const binFile of binFiles) {
      const pyFile = binFile.replace(/\.bin$/, '.py');

      try {
        // 3. BIN -> PY (ritobin ile okunabilir metne çevir)
        await execFileAsync(ritobinPath, ['decompile', binFile], {
          windowsHide: true,
          timeout: 30000
        });

        if (await fs.pathExists(pyFile)) {
          try {
            // 4. Metin içinde skin referanslarını Skin0'a çek
            let content = await fs.readFile(pyFile, 'utf-8');

            if (!content || content.trim().length === 0) {
              console.warn(`[Rebaser] ${championName}: Boş .py dosyası atlanıyor: ${pyFile}`);
              continue;
            }

            // Örn: luluSkin15 -> luluSkin0 veya Skins/Skin15 -> Skins/Skin0 değişimleri
            const skinRegex = new RegExp(`${champLower}Skin\\d+`, 'gi');
            content = content.replace(skinRegex, `${champLower}Skin0`);

            const skinPathRegex = new RegExp(`Skins/Skin\\d+`, 'gi');
            content = content.replace(skinPathRegex, 'Skins/Skin0');

            await fs.writeFile(pyFile, content, 'utf-8');

            // 5. PY -> BIN (Tekrar derle)
            await execFileAsync(ritobinPath, ['compile', pyFile], {
              windowsHide: true,
              timeout: 30000
            });

            // Geçici .py dosyasını temizle
            await fs.remove(pyFile);
          } catch (pyError) {
            console.warn(`[Rebaser] ${championName}: .py işleme hatası atlanıyor: ${pyError.message}`);
            continue; // Sonraki dosyaya geç
          }
        }
      } catch (decompileError) {
        console.warn(`[Rebaser] ${championName}: Decompile hatası atlanıyor: ${decompileError.message}`);
        continue; // Sonraki dosyaya geç
      }
    }

    // 6. Değiştirilmiş dosyaları tekrar WAD olarak paketle
    await execFileAsync(ritobinPath, ['build', tempExtractDir, '-o', rebasedWadPath], {
      windowsHide: true,
      timeout: 30000
    });

    rebaseSuccess = true;
    console.log(`[Rebaser] ${championName} kostümü başarıyla skin0 yapısına dönüştürüldü.`);
    return rebasedWadPath;

  } catch (error) {
    console.error(`[Rebaser] ${championName} rebase hatası: ${error.message}`);
    // Fail-safe: orijinal dosyayı döndür, uygulama çökmesin
    return wadPath;
  } finally {
    // 7. Her durumda geçici dizini temizle (başarılı veya başarısız fark etmez)
    try {
      if (fs.existsSync(tempExtractDir)) {
        await fs.remove(tempExtractDir);
      }
    } catch (cleanupError) {
      console.warn(`[Rebaser] ${championName}: Temizlik hatası: ${cleanupError.message}`);
    }
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
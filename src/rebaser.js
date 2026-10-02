"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebaseWadFile = rebaseWadFile;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
async function rebaseWadFile(options) {
    const { wadPath, championName, outputDir, toolsDir } = options;
    const ritobinPath = path_1.default.join(toolsDir, 'ritobin.exe');
    const champLower = championName.toLowerCase();
    const tempExtractDir = path_1.default.join(outputDir, `temp_${champLower}_rebase`);
    const rebasedWadPath = path_1.default.join(outputDir, `${champLower}_rebased.wad.client`);
    await fs_extra_1.default.ensureDir(tempExtractDir);
    try {
        // 1. WAD dosyasını geçici dizine çıkar (ritobin ile)
        await execFileAsync(ritobinPath, ['extract', wadPath, '-o', tempExtractDir]);
        // 2. Ayıklanan dosyalar arasındaki .bin dosyasını bul (Örn: data/final/champions/lulu.bin)
        const binFiles = await findBinFiles(tempExtractDir);
        for (const binFile of binFiles) {
            const pyFile = binFile.replace(/\.bin$/, '.py');
            // 3. BIN -> PY (ritobin ile okunabilir metne çevir)
            await execFileAsync(ritobinPath, ['build', binFile]);
            if (await fs_extra_1.default.pathExists(pyFile)) {
                // 4. Metin içinde skin referanslarını Skin0'a çek
                let content = await fs_extra_1.default.readFile(pyFile, 'utf-8');
                // Örn: luluSkin15 -> luluSkin0 veya Skins/Skin15 -> Skins/Skin0 değişimleri
                const skinRegex = new RegExp(`${champLower}Skin\\d+`, 'gi');
                content = content.replace(skinRegex, `${champLower}Skin0`);
                const skinPathRegex = new RegExp(`Skins/Skin\\d+`, 'gi');
                content = content.replace(skinPathRegex, 'Skins/Skin0');
                await fs_extra_1.default.writeFile(pyFile, content, 'utf-8');
                // 5. PY -> BIN (Tekrar derle)
                await execFileAsync(ritobinPath, ['build', pyFile]);
                // Geçici .py dosyasını temizle
                await fs_extra_1.default.remove(pyFile);
            }
        }
        // 6. Değiştirilmiş dosyaları tekrar WAD olarak paketle
        await execFileAsync(ritobinPath, ['build', tempExtractDir, '-o', rebasedWadPath]);
        // 7. Geçici dizini temizle
        await fs_extra_1.default.remove(tempExtractDir);
        console.log(`[Rebaser] ${championName} kostümü başarıyla skin0 yapısına dönüştürüldü.`);
        return rebasedWadPath;
    }
    catch (error) {
        console.error('[Rebaser Error]', error);
        // Hata durumunda geçici dizini temizlemeye çalış
        try {
            await fs_extra_1.default.remove(tempExtractDir);
        }
        catch { }
        throw error;
    }
}
// Yardımcı Fonksiyon: Dizin içindeki .bin dosyalarını bulur
async function findBinFiles(dir) {
    let results = [];
    const list = await fs_extra_1.default.readdir(dir);
    for (const file of list) {
        const filePath = path_1.default.join(dir, file);
        const stat = await fs_extra_1.default.stat(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(await findBinFiles(filePath));
        }
        else if (file.endsWith('.bin')) {
            results.push(filePath);
        }
    }
    return results;
}

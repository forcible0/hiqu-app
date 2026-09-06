// Overlay oluşturma akışını gerçek fantome ile test eder
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const sevenZip = require('7zip-bin')

const mod = path.join(process.env.APPDATA, 'asset-manager', 'skins', '103002.fantome')
const overlayDir = path.join(process.env.APPDATA, 'buck', 'overlay_test')
const extractDir = path.join(process.env.APPDATA, 'buck', 'overlay_extract_test')

fs.rmSync(overlayDir, { recursive: true, force: true })
fs.rmSync(extractDir, { recursive: true, force: true })
fs.mkdirSync(overlayDir, { recursive: true })
fs.mkdirSync(extractDir, { recursive: true })

execFileSync(sevenZip.path7za, ['x', '-y', `-o${extractDir}`, mod], { windowsHide: true })

const wadSrcDir = path.join(extractDir, 'WAD')
let wadCount = 0
for (const entry of fs.readdirSync(wadSrcDir, { withFileTypes: true, recursive: true })) {
  if (!entry.isFile()) continue
  if (!/\.wad\.client$/i.test(entry.name)) continue
  const src = path.join(entry.parentPath || entry.path, entry.name)
  const dest = path.join(overlayDir, 'DATA', 'FINAL', 'Champions', entry.name)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  console.log('overlay ->', dest)
  const magic = fs.readFileSync(dest).subarray(0, 4).toString()
  console.log('magic:', JSON.stringify(magic), '| boyut:', fs.statSync(dest).size)
  wadCount++
}
console.log('wadCount:', wadCount)

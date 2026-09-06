// Tam oturum testi: overlay klasörü + fantome, config prefix, start scan
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const EXE = 'C:\\Program Files\\LTK Manager\\ltk_patcher_host.exe'
const SKINS = path.join(process.env.APPDATA, 'asset-manager', 'skins')

// İlk .fantome dosyasını bul
const fantome = fs.existsSync(SKINS) ? fs.readdirSync(SKINS).find(f => f.endsWith('.fantome')) : null
console.log('fantome:', fantome || 'YOK')

const overlay = path.join(os.tmpdir(), 'ltk_overlay_test')
fs.rmSync(overlay, { recursive: true, force: true })
fs.mkdirSync(overlay, { recursive: true })
if (fantome) fs.copyFileSync(path.join(SKINS, fantome), path.join(overlay, 'mod.fantome'))

const child = spawn(EXE, [], { cwd: path.dirname(EXE) })
child.stdout.on('data', (d) => process.stdout.write('[OUT] ' + d.toString()))
child.stderr.on('data', (d) => process.stdout.write('[ERR] ' + d.toString()))
child.on('exit', (code) => { console.log('[EXIT]', code); process.exit(0) })

const steps = [
  `config prefix ${overlay}`,
  'start scan',
]
let i = 0
function next() {
  if (i >= steps.length) {
    // 6 saniye tarama çıktısını izle, sonra durdur
    setTimeout(() => { try { child.stdin.write('stop\n') } catch {} }, 500)
    setTimeout(() => { try { child.stdin.end() } catch {}; setTimeout(() => { try { child.kill() } catch {}; process.exit(0) }, 1500) }, 6000)
    return
  }
  console.log('[SEND]', steps[i])
  child.stdin.write(steps[i] + '\n')
  i++
  setTimeout(next, 1200)
}
setTimeout(next, 800)

// ltk_patcher_host.exe stdin/stdout protokolünü sondalar
const { spawn } = require('child_process')

const EXE = 'C:\\Program Files\\LTK Manager\\ltk_patcher_host.exe'

const child = spawn(EXE, [], { cwd: 'C:\\Program Files\\LTK Manager' })

child.stdout.on('data', (d) => process.stdout.write('[OUT] ' + d.toString()))
child.stderr.on('data', (d) => process.stdout.write('[ERR] ' + d.toString()))
child.on('exit', (code) => { console.log('[EXIT]', code); process.exit(0) })

const commands = process.argv.slice(2)
let i = 0
function sendNext() {
  if (i >= commands.length) {
    // tüm komutlar gönderildi, biraz bekle ve stdin'i kapat (host'un çıkması için)
    setTimeout(() => child.stdin.end(), 2000)
    return
  }
  const cmd = commands[i++]
  console.log('[SEND]', cmd)
  child.stdin.write(cmd + '\n')
  setTimeout(sendNext, 1500)
}
setTimeout(sendNext, 1000)

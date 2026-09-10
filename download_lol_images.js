const https = require('https');
const fs = require('fs');
const path = require('path');

// Şampiyon listesi (resmi siteden gelen linkler)
const champions = [
  'aatrox', 'ahri', 'akali', 'akshan', 'alistar', 'ambessa', 'amumu', 'anivia', 'annie', 'aphelios',
  'ashe', 'aurelionsol', 'aurora', 'azir', 'bard', 'belveth', 'blitzcrank', 'brand', 'braum', 'briar',
  'caitlyn', 'camille', 'cassiopeia', 'chogath', 'corki', 'darius', 'diana', 'drmundo', 'draven', 'ekko',
  'elise', 'evelynn', 'ezreal', 'fiddlesticks', 'fiora', 'fizz', 'galio', 'gangplank', 'garen', 'gnar',
  'gragas', 'graves', 'gwen', 'hecarim', 'heimerdinger', 'hwei', 'illaoi', 'irelia', 'ivern', 'janna',
  'jarvaniv', 'jax', 'jayce', 'jhin', 'jinx', 'ksante', 'kaisa', 'kalista', 'karma', 'karthus',
  'kassadin', 'katarina', 'kayle', 'kayn', 'kennen', 'khazix', 'kindred', 'kled', 'kogmaw', 'leblanc',
  'leesin', 'leona', 'lillia', 'lissandra', 'locke', 'lucian', 'lulu', 'lux', 'malphite', 'malzahar',
  'maokai', 'masteryi', 'mel', 'milio', 'missfortune', 'mordekaiser', 'morgana', 'naafiri', 'nami', 'nasus',
  'nautilus', 'neeko', 'nidalee', 'nilah', 'nocturne', 'nunu', 'olaf', 'orianna', 'ornn', 'pantheon',
  'poppy', 'pyke', 'qiyana', 'quinn', 'rakan', 'rammus', 'reksai', 'rell', 'renata', 'renekton',
  'rengar', 'riven', 'rumble', 'ryze', 'samira', 'sejuani', 'senna', 'seraphine', 'sett', 'shaco',
  'shen', 'shyvana', 'singed', 'sion', 'sivir', 'skarner', 'smolder', 'sona', 'soraka', 'swain',
  'sylas', 'syndra', 'tahmkench', 'taliyah', 'talon', 'taric', 'teemo', 'thresh', 'tristana', 'trundle',
  'tryndamere', 'twistedfate', 'twitch', 'udyr', 'urgot', 'varus', 'vayne', 'veigar', 'velkoz', 'vex',
  'vi', 'viego', 'viktor', 'vladimir', 'volibear', 'warwick', 'monkeyking', 'xayah', 'xerath', 'xinzhao',
  'yasuo', 'yone', 'yorick', 'yunara', 'yuumi', 'zaahen', 'zac', 'zed', 'zeri', 'ziggs', 'zilean',
  'zoe', 'zyra'
];

// İndirme klasörü
const downloadDir = path.join(__dirname, 'lol_champions_images');
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

// Dosya indirme fonksiyonu
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Redirect takip et
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const file = fs.createWriteStream(filepath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

// Her şampiyon için resmi siteden splash art URL'ini bulmaya çalış
async function downloadChampionImages() {
  console.log('Şampiyon görselleri indiriliyor...');
  
  for (const champion of champions) {
    try {
      // Riot'un resmi sitesinden splash art'ları indirmek için URL denemesi
      // Bu yaklaşım her zaman çalışmayabilir çünkü Riot'un CDN yapısı karmaşık
      const url = `https://cdn.communitydragon.org/latest/champion/${champion}/splash-art`;
      const filepath = path.join(downloadDir, `${champion}.jpg`);
      
      console.log(`İndiriliyor: ${champion}...`);
      await downloadImage(url, filepath);
      console.log(`✓ ${champion} indirildi`);
    } catch (error) {
      console.log(`✗ ${champion} indirilemedi: ${error.message}`);
      
      // Alternatif olarak Data Dragon kullan
      try {
        const dataDragonUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.charAt(0).toUpperCase() + champion.slice(1)}_0.jpg`;
        const filepath = path.join(downloadDir, `${champion}.jpg`);
        await downloadImage(dataDragonUrl, filepath);
        console.log(`✓ ${champion} Data Dragon'dan indirildi`);
      } catch (ddError) {
        console.log(`✗ ${champion} Data Dragon'dan da indirilemedi`);
      }
    }
  }
  
  console.log('İndirme tamamlandı!');
}

downloadChampionImages().catch(console.error);
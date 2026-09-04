import { useState, useEffect } from 'react';
import { fetchChampions, fetchChampionSkins } from './api';
import { SkinItem } from './types';

function App() {
  const [champions, setChampions] = useState<SkinItem[]>([]);
  const [filteredChampions, setFilteredChampions] = useState<SkinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChampion, setSelectedChampion] = useState<SkinItem | null>(null);
  const [championSkins, setChampionSkins] = useState<any[]>([]);
  const [loadingSkins, setLoadingSkins] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    loadChampions();
    loadAppVersion();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = champions.filter(champion =>
        champion.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredChampions(filtered);
    } else {
      setFilteredChampions(champions);
    }
  }, [searchTerm, champions]);

  // Electron güncelleme event'leri
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const handleUpdateAvailable = (_event: any, info: any) => {
        setUpdateAvailable(true);
        setUpdateStatus(`Yeni sürüm bulundu${info?.version ? `: v${info.version}` : ''}. İndiriliyor...`);
      };

      const handleUpdateNotAvailable = () => {
        setUpdateStatus('Uygulama güncel. Yeni sürüm bulunamadı.');
      };

      const handleDownloadProgress = (_event: any, progress: { percent: number }) => {
        setUpdateStatus(`Güncelleme indiriliyor... %${Math.round(progress.percent)}`);
      };

      const handleUpdateDownloaded = () => {
        setUpdateStatus('Güncelleme indirildi. Yeniden başlatılıyor...');
        setTimeout(() => {
          window.electronAPI.installUpdate();
        }, 2000);
      };

      const handleUpdateError = (_event: any, err: any) => {
        setUpdateStatus('Güncelleme hatası: ' + err.message);
      };

      window.electronAPI.onUpdateAvailable(handleUpdateAvailable);
      window.electronAPI.onUpdateNotAvailable(handleUpdateNotAvailable);
      window.electronAPI.onDownloadProgress(handleDownloadProgress);
      window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded);
      window.electronAPI.onUpdateError(handleUpdateError);

      return () => {
        // Cleanup listeners if needed
      };
    }
  }, []);

  const loadChampions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchChampions();
      setChampions(data);
      setFilteredChampions(data);
    } catch (err) {
      setError('Şampiyonlar yüklenirken bir hata oluştu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAppVersion = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const version = await window.electronAPI.getAppVersion();
        setAppVersion(version);
      } catch (err) {
        console.error('Versiyon alınamadı:', err);
      }
    }
  };

  const handleChampionSelect = async (champion: SkinItem) => {
    setSelectedChampion(champion);
    setLoadingSkins(true);
    setChampionSkins([]);
    
    try {
      const skins = await fetchChampionSkins(champion.id);
      setChampionSkins(skins);
    } catch (err) {
      console.error('Skinler yüklenirken hata:', err);
    } finally {
      setLoadingSkins(false);
    }
  };

  const handleCheckForUpdates = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      setUpdateStatus('Güncellemeler kontrol ediliyor...');
      try {
        const result = await window.electronAPI.checkForUpdates();
        if (result.success) {
          setUpdateStatus('Güncelleme kontrolü başlatıldı');
        } else {
          setUpdateStatus('Güncelleme kontrolü başarısız: ' + result.error);
        }
      } catch (err) {
        setUpdateStatus('Güncelleme kontrolü hatası');
      }
    }
  };

  const getSkinImage = (skinNum: number, championId: string) => {
    return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championId}_${skinNum}.jpg`;
  };

  return (
    <div className="h-screen bg-[#0b0f17] text-white flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_rgba(37,72,120,0.25),_transparent_60%)]">
      <header className="bg-white/[0.03] backdrop-blur-md border-b border-white/[0.06] px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-lg shadow-lg shadow-blue-500/25">
            ⚡
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">
              League <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Champions</span>
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5">Skin & Koleksiyon Yöneticisi</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {appVersion && (
            <span className="text-gray-500 text-xs font-medium bg-white/[0.05] border border-white/[0.08] px-2.5 py-1 rounded-full">
              v{appVersion}
            </span>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] px-4 py-2 rounded-xl transition-colors text-sm font-medium"
          >
            ⚙️ Ayarlar
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sol Panel - Şampiyon Listesi (kendi kaydırma çubuğu) */}
        <div className="w-80 bg-white/[0.02] border-r border-white/[0.06] flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] space-y-3">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                placeholder="Şampiyon ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-500 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/40 transition text-sm"
              />
            </div>
            <p className="text-[11px] text-gray-500 font-medium px-1">
              {filteredChampions.length} şampiyon
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/40 text-red-200 m-4 rounded-xl flex items-center justify-between text-sm">
              <span>{error}</span>
              <button
                onClick={loadChampions}
                className="bg-red-500/80 hover:bg-red-500 px-2.5 py-1 rounded-lg text-xs font-medium transition"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredChampions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <span className="text-3xl mb-2">🕵️</span>
                <p className="text-sm">Sonuç bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredChampions.map((champion) => (
                  <div
                    key={champion.id}
                    className={`flex items-center p-2 rounded-xl cursor-pointer transition-all border group ${
                      selectedChampion?.id === champion.id
                        ? 'bg-blue-500/15 border-blue-500/40 shadow-lg shadow-blue-500/10'
                        : 'border-transparent hover:bg-white/[0.05]'
                    }`}
                    onClick={() => handleChampionSelect(champion)}
                  >
                    <img
                      src={champion.image}
                      alt={champion.name}
                      className={`w-11 h-11 rounded-lg object-cover mr-3 transition ${
                        selectedChampion?.id === champion.id ? 'ring-2 ring-blue-400/60' : ''
                      }`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm truncate ${
                        selectedChampion?.id === champion.id ? 'text-blue-300' : ''
                      }`}>
                        {champion.name}
                      </p>
                      {champion.title && (
                        <p className="text-gray-500 text-xs truncate">{champion.title}</p>
                      )}
                    </div>
                    {selectedChampion?.id === champion.id && (
                      <span className="ml-auto text-blue-400 text-xs">▸</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ Panel - Şampiyon detayı (sabit) + Skin grid (kendi kaydırma çubuğu) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selectedChampion ? (
            <>
              {/* Sabit şampiyon başlığı */}
              <div className="relative shrink-0 border-b border-white/[0.06] overflow-hidden">
                {/* Arka plan splash */}
                <div className="absolute inset-0">
                  <img
                    src={getSkinImage(selectedChampion.skins?.[0]?.num ?? 0, selectedChampion.id)}
                    alt=""
                    className="w-full h-full object-cover object-top opacity-20 blur-sm scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#0b0f17]/60 via-[#0b0f17]/85 to-[#0b0f17]"></div>
                </div>

                <div className="relative px-6 py-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={selectedChampion.image}
                      alt={selectedChampion.name}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/20"
                    />
                    <div className="min-w-0">
                      <h2 className="text-2xl font-bold tracking-tight truncate">{selectedChampion.name}</h2>
                      {selectedChampion.title && (
                        <p className="text-gray-400 text-sm">{selectedChampion.title}</p>
                      )}
                    </div>
                    <div className="ml-auto shrink-0 bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 rounded-full text-xs font-medium text-gray-300">
                      {loadingSkins ? 'Yükleniyor...' : `${championSkins.length} skin`}
                    </div>
                  </div>

                  {selectedChampion.description && (
                    <p className="text-gray-400 text-sm mt-3 line-clamp-2 max-w-3xl">
                      {selectedChampion.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Sadece bu alan kayar - kendi scroll barı */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingSkins ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-gray-500 text-sm">Skinler yükleniyor...</p>
                  </div>
                ) : championSkins.length > 0 ? (
                  <div className="fade-in">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-1 h-5 rounded bg-gradient-to-b from-blue-400 to-indigo-500"></span>
                      <h3 className="text-lg font-bold tracking-tight">Skin'ler</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-4">
                      {championSkins.map((skin) => (
                        <div
                          key={skin.id}
                          className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
                        >
                          <div className="aspect-video bg-white/[0.03] flex items-center justify-center overflow-hidden">
                            <img
                              src={getSkinImage(skin.num, selectedChampion.id)}
                              alt={skin.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="p-3 flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm truncate">{skin.name}</p>
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60 shrink-0"></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <span className="text-4xl mb-3">🗃️</span>
                    <p>Skin bulunamadı</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/[0.08] flex items-center justify-center text-4xl">
                🎮
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-300">Bir şampiyon seçin</p>
                <p className="text-sm text-gray-500 mt-1">Sol listeden bir şampiyon seçerek skinlerini görüntüleyin</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ayarlar Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-[#141a26] border border-white/[0.08] rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-black/60 fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight">Ayarlar</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.08] transition text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold mb-1.5">Güncellemeler</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Otomatik güncelleme kontrolü ve indirme
                </p>
                <button
                  onClick={handleCheckForUpdates}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2.5 rounded-xl font-medium transition shadow-lg shadow-blue-500/20"
                >
                  Güncellemeleri Denetle
                </button>
                {updateStatus && (
                  <p className="mt-2 text-sm text-gray-300">{updateStatus}</p>
                )}
                {updateAvailable && (
                  <p className="mt-2 text-sm text-green-400">
                    Yeni sürüm mevcut! Otomatik indiriliyor...
                  </p>
                )}
              </div>

              <div className="border-t border-white/[0.08] pt-4">
                <p className="text-gray-400 text-sm">
                  Buck v{appVersion} - League Champions Manager
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  GitHub: https://github.com/forcible0/buck
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

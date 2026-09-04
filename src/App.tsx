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
      const handleUpdateAvailable = () => {
        setUpdateAvailable(true);
        setUpdateStatus('Güncelleme mevcut!');
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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">League Champions</h1>
        <div className="flex items-center gap-4">
          {appVersion && <span className="text-gray-400 text-sm">v{appVersion}</span>}
          <button
            onClick={() => setShowSettings(true)}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition"
          >
            ⚙️ Ayarlar
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sol Panel - Şampiyon Listesi */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <input
              type="text"
              placeholder="Şampiyon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500 text-red-100 m-4 rounded">
              <span>{error}</span>
              <button
                onClick={loadChampions}
                className="ml-2 bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-sm"
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
            ) : (
              <div className="space-y-1">
                {filteredChampions.map((champion) => (
                  <div
                    key={champion.id}
                    className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-700 transition ${
                      selectedChampion?.id === champion.id ? 'bg-gray-700' : ''
                    }`}
                    onClick={() => handleChampionSelect(champion)}
                  >
                    <img
                      src={champion.image}
                      alt={champion.name}
                      className="w-12 h-12 rounded object-cover mr-3"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div>
                      <p className="font-semibold">{champion.name}</p>
                      {champion.title && (
                        <p className="text-gray-400 text-xs">{champion.title}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ Panel - Skin'ler */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedChampion ? (
            <div>
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <img
                    src={selectedChampion.image}
                    alt={selectedChampion.name}
                    className="w-16 h-16 rounded object-cover mr-4"
                  />
                  <div>
                    <h2 className="text-3xl font-bold">{selectedChampion.name}</h2>
                    {selectedChampion.title && (
                      <p className="text-gray-400">{selectedChampion.title}</p>
                    )}
                  </div>
                </div>

                {selectedChampion.description && (
                  <p className="text-gray-300 mb-4">{selectedChampion.description}</p>
                )}
              </div>

              {loadingSkins ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : championSkins.length > 0 ? (
                <div>
                  <h3 className="text-xl font-bold mb-4">Skin'ler ({championSkins.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {championSkins.map((skin) => (
                      <div
                        key={skin.id}
                        className="bg-gray-800 rounded-lg overflow-hidden hover:scale-105 transition-transform cursor-pointer"
                      >
                        <div className="aspect-video bg-gray-700 flex items-center justify-center overflow-hidden">
                          <img
                            src={getSkinImage(skin.num, selectedChampion.id)}
                            alt={skin.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="p-3">
                          <p className="font-semibold text-sm truncate">{skin.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  Skin bulunamadı
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-xl">Bir şampiyon seçin</p>
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
            className="bg-gray-800 rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Ayarlar</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Güncellemeler</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Otomatik güncelleme kontrolü ve indirme
                </p>
                <button
                  onClick={handleCheckForUpdates}
                  className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition"
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

              <div className="border-t border-gray-700 pt-4">
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

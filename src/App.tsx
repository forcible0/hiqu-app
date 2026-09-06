import { useState, useEffect, useCallback } from 'react';
import { fetchChampions, fetchChampionSkins } from './api';
import { SkinItem, Skin, AppSettings, Toast } from './types';

function App() {
  const [champions, setChampions] = useState<SkinItem[]>([]);
  const [filteredChampions, setFilteredChampions] = useState<SkinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChampion, setSelectedChampion] = useState<SkinItem | null>(null);
  const [championSkins, setChampionSkins] = useState<Skin[]>([]);
  const [loadingSkins, setLoadingSkins] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Skin yönetimi state'leri
  const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null); // Detay modalındaki skin
  const [downloadedSkins, setDownloadedSkins] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [applyingSkins, setApplyingSkins] = useState<Set<string>>(new Set());
  const [removingSkins, setRemovingSkins] = useState<Set<string>>(new Set());
  const [activePatches, setActivePatches] = useState<Set<string>>(new Set()); // Patcher'ı çalışan skinler
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ patcherPath: '', dllPath: '' });

  // Toast bildirimi ekle (4.5 sn sonra otomatik kapanır)
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // İndirilmiş skinleri ve ayarları yükle
  const refreshDownloadedSkins = useCallback(async () => {
    if (window.electronAPI?.getDownloadedSkins) {
      try {
        const ids = await window.electronAPI.getDownloadedSkins();
        setDownloadedSkins(new Set(ids));
      } catch (err) {
        console.error('İndirilen skinler alınamadı:', err);
      }
    }
  }, []);

  useEffect(() => {
    loadChampions();
    loadAppVersion();
    refreshDownloadedSkins();
    loadSettings();
  }, [refreshDownloadedSkins]);

  const loadSettings = async () => {
    if (window.electronAPI?.getSettings) {
      try {
        const s = await window.electronAPI.getSettings();
        setSettings({ patcherPath: s.patcherPath || '', dllPath: s.dllPath || '' });
      } catch (err) {
        console.error('Ayarlar yüklenemedi:', err);
      }
    }
  };

  // Skin indirme ilerlemesi ve LTK Manager durum event'leri
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleProgress = (_event: any, data: { skinId: string; percent: number }) => {
      setDownloadProgress((prev) => ({ ...prev, [data.skinId]: data.percent }));
    };

    const handleApplyStatus = (_event: any, data: { skinId: string; state: string; message?: string }) => {
      // Her durumda 'uygulanıyor' spinner'ını temizle
      setApplyingSkins((prev) => {
        const next = new Set(prev);
        next.delete(data.skinId);
        return next;
      });
      if (data.state === 'started') {
        // Patcher süreci çalışmaya başladı
        setActivePatches((prev) => new Set(prev).add(data.skinId));
        addToast('success', `🔧 ${data.message || 'Patcher Aktif'}`);
      } else if (data.state === 'finished') {
        // Patcher süreci kapandı
        setActivePatches((prev) => {
          const next = new Set(prev);
          next.delete(data.skinId);
          return next;
        });
        addToast('info', data.message || 'Patcher durdu');
      } else if (data.state === 'error') {
        setActivePatches((prev) => {
          const next = new Set(prev);
          next.delete(data.skinId);
          return next;
        });
        addToast('error', data.message || 'Patcher hatası');
      }
    };

    const handleRemoveStatus = (_event: any, data: { skinId: string; state: string; message?: string }) => {
      if (data.state === 'started') {
        // Kaldırma sürüyor; spinner zaten butonda gösteriliyor
        return;
      }
      setRemovingSkins((prev) => {
        const next = new Set(prev);
        next.delete(data.skinId);
        return next;
      });
      if (data.state === 'finished') {
        addToast('info', `🗑️ ${data.message || 'Skin kaldırıldı'}`);
      } else if (data.state === 'warning') {
        addToast('info', data.message || 'Patcher kaldırma uyarısı');
      } else if (data.state === 'error') {
        addToast('error', data.message || 'Kaldırma hatası');
      }
    };

    window.electronAPI.onSkinDownloadProgress?.(handleProgress);
    window.electronAPI.onApplyStatus?.(handleApplyStatus);
    window.electronAPI.onRemoveStatus?.(handleRemoveStatus);
  }, [addToast]);

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

  // ==================== SKIN İŞLEMLERİ ====================

  // İndir ve Aktif Et
  const handleDownloadAndApply = async (skin: Skin) => {
    if (!window.electronAPI) {
      addToast('error', 'Electron API kullanılamıyor (tarayıcı modu)');
      return;
    }
    if (!selectedChampion?.key) {
      addToast('error', 'Şampiyon ID bilgisi eksik');
      return;
    }
    if (!settings.patcherPath) {
      addToast('info', 'Önce Ayarlar\'dan Patcher Yolunu (ltk_patcher_host.exe) seçin');
      setShowSettings(true);
      return;
    }

    const skinId = skin.id;
    setDownloadProgress((prev) => ({ ...prev, [skinId]: 0 }));

    const result = await window.electronAPI.downloadSkin({
      championKey: selectedChampion.key,
      skinId
    });

    // Progress state'ini temizle
    setDownloadProgress((prev) => {
      const next = { ...prev };
      delete next[skinId];
      return next;
    });

    if (!result.success) {
      addToast('error', `İndirme başarısız: ${result.error}`);
      return;
    }

    setDownloadedSkins((prev) => new Set(prev).add(skinId));
    addToast('success', `⬇️ ${skin.name} indirildi`);

    // İndirme bitince otomatik aktif et
    await handleApplySkin(skin);
  };

  // Sadece Aktif Et (zaten indirilmiş skinler için): yerel .fantome dosyasını
  // ltk_patcher_host.exe --dll <dll> --mod <skin.fantome> ile patch'ler
  const handleApplySkin = async (skin: Skin) => {
    if (!window.electronAPI) return;
    if (!settings.patcherPath) {
      addToast('info', 'Önce Ayarlar\'dan Patcher Yolunu (ltk_patcher_host.exe) seçin');
      setShowSettings(true);
      return;
    }
    if (!settings.dllPath) {
      addToast('info', 'Önce Ayarlar\'dan DLL Yolunu (ltk_patcher_dll.dll) seçin');
      setShowSettings(true);
      return;
    }
    setApplyingSkins((prev) => new Set(prev).add(skin.id));
    const result = await window.electronAPI.applySkin({ skinId: skin.id });
    if (!result.success) {
      setApplyingSkins((prev) => {
        const next = new Set(prev);
        next.delete(skin.id);
        return next;
      });
      addToast('error', result.error || 'Aktif etme başarısız');
    }
    // Başarılıysa 'started' event'i applying state'ini temizler
  };

  // Skin Kaldır: patcher sürecini sonlandır + yerel dosyayı sil
  // Başarı/hata toast'ları 'remove-status' IPC event'i üzerinden gösterilir
  const handleRemoveSkin = async (skin: Skin) => {
    if (!window.electronAPI) return;
    setRemovingSkins((prev) => new Set(prev).add(skin.id));
    const result = await window.electronAPI.removeSkin({ skinId: skin.id });
    setRemovingSkins((prev) => {
      const next = new Set(prev);
      next.delete(skin.id);
      return next;
    });
    if (result.success) {
      setDownloadedSkins((prev) => {
        const next = new Set(prev);
        next.delete(skin.id);
        return next;
      });
      setActivePatches((prev) => {
        const next = new Set(prev);
        next.delete(skin.id);
        return next;
      });
    } else {
      addToast('error', `Kaldırma başarısız: ${result.error}`);
    }
  };

  // Ayar seçiciler
  const handleSelectPatcherPath = async () => {
    const p = await window.electronAPI?.selectPatcherPath();
    if (p) setSettings((prev) => ({ ...prev, patcherPath: p }));
  };

  const handleSelectDllPath = async () => {
    const p = await window.electronAPI?.selectDllPath();
    if (p) setSettings((prev) => ({ ...prev, dllPath: p }));
  };

  const handleSelectGamePath = async () => {
    const p = await window.electronAPI?.selectGamePath();
    if (p) setSettings((prev) => ({ ...prev, gamePath: p }));
  };

  const handleSaveSettings = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.saveSettings(settings);
    if (result.success) {
      addToast('success', '⚙️ Ayarlar kaydedildi');
    } else {
      addToast('error', result.error || 'Ayarlar kaydedilemedi');
    }
  };

  return (
    <div className="h-screen bg-[#0b0f17] text-white flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_rgba(37,72,120,0.25),_transparent_60%)]">
      <header className="bg-white/[0.03] backdrop-blur-md border-b border-white/[0.06] px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/30">
            <img src="./logo.png" alt="Hiqu" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">
              Hiqu <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">League Champions</span>
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
                          onClick={() => {
                            setSelectedSkin(skin);
                            // Modal açılırken yerel dosya varlığını tazele (isDownloaded kontrolü)
                            refreshDownloadedSkins();
                          }}
                          className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
                        >
                          <div className="relative aspect-video bg-white/[0.03] flex items-center justify-center overflow-hidden">
                            <img
                              src={getSkinImage(skin.num, selectedChampion.id)}
                              alt={skin.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            {downloadedSkins.has(skin.id) && (
                              <span className="absolute top-2 right-2 bg-green-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-green-500/30">
                                ✓ İNDİRİLDİ
                              </span>
                            )}
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

      {/* Skin Detay Modalı */}
      {selectedSkin && selectedChampion && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => downloadProgress[selectedSkin.id] === undefined && setSelectedSkin(null)}
        >
          <div
            className="bg-[#12161f] border border-white/[0.1] rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl shadow-black/60 fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Büyük skin görseli */}
            <div className="relative aspect-video bg-black/50">
              <img
                src={getSkinImage(selectedSkin.num, selectedChampion.id)}
                alt={selectedSkin.name}
                className="w-full h-full object-cover object-[center_20%]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#12161f] via-transparent to-transparent"></div>
              <button
                onClick={() => setSelectedSkin(null)}
                className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 backdrop-blur text-gray-300 hover:text-white hover:bg-black/80 transition text-xl leading-none"
              >
                ×
              </button>
              <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold tracking-tight truncate drop-shadow-lg">{selectedSkin.name}</h2>
                  <p className="text-gray-400 text-sm mt-0.5">
                    {selectedChampion.name} · Skin ID: <span className="font-mono text-gray-300">{selectedSkin.id}</span>
                  </p>
                </div>
                {downloadedSkins.has(selectedSkin.id) && (
                  <span className="shrink-0 bg-green-500/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-green-500/30">
                    ✓ İNDİRİLDİ
                  </span>
                )}
              </div>
            </div>
            {/* İşlem alanı */}
            <div className="p-5">
              {downloadProgress[selectedSkin.id] !== undefined ? (
                // İndirme ilerleme çubuğu
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300 flex items-center gap-2">
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></span>
                      İndiriliyor...
                    </span>
                    <span className="text-sm font-semibold text-blue-400">
                      %{downloadProgress[selectedSkin.id]}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white/[0.07] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress[selectedSkin.id]}%` }}
                    ></div>
                  </div>
                </div>
              ) : downloadedSkins.has(selectedSkin.id) ? (
                // Zaten indirilmiş: Aktif Et + Kaldır (+ patcher durum rozeti)
                <div className="space-y-3">
                  {activePatches.has(selectedSkin.id) && (
                    <div className="flex items-center justify-center gap-2 text-green-400 text-sm font-semibold bg-green-500/10 border border-green-500/30 rounded-xl py-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      Patcher Aktif
                    </div>
                  )}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApplySkin(selectedSkin)}
                    disabled={applyingSkins.has(selectedSkin.id)}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-xl font-semibold transition shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                  >
                    {applyingSkins.has(selectedSkin.id) ? (
                      <>
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                        Aktif Ediliyor...
                      </>
                    ) : (
                      <>✓ Aktif Et</>
                    )}
                  </button>
                  <button
                    onClick={() => handleRemoveSkin(selectedSkin)}
                    disabled={removingSkins.has(selectedSkin.id)}
                    className="px-5 py-3 rounded-xl font-semibold bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {removingSkins.has(selectedSkin.id) ? (
                      <>
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full"></span>
                        Kaldırılıyor...
                      </>
                    ) : (
                      <>🗑️ Kaldır</>
                    )}
                  </button>
                </div>
                </div>
              ) : (
                // Henüz indirilmemiş
                <button
                  onClick={() => handleDownloadAndApply(selectedSkin)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-3 rounded-xl font-semibold transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                >
                  ⬇️ İndir ve Aktif Et
                </button>
              )}
              <p className="text-gray-600 text-xs mt-3 text-center">
                Skin, LoLskins deposundan indirilir ve ltk_patcher_host ile aktif edilir
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Bildirimleri */}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`fade-in px-4 py-3 rounded-xl border shadow-2xl shadow-black/50 text-sm font-medium backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-green-500/20 border-green-500/40 text-green-200'
                : toast.type === 'error'
                  ? 'bg-red-500/20 border-red-500/40 text-red-200'
                  : 'bg-blue-500/20 border-blue-500/40 text-blue-200'
            }`}
          >
            {toast.message}
          </div>
        ))}
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
              {/* LTK Manager ve DLL ayarları */}
              <div>
                <h3 className="text-base font-semibold mb-1.5">Skin Yöneticisi</h3>
                <p className="text-gray-500 text-sm mb-3">
                  Skin aktif etmek için patcher host ve DLL dosyasını belirleyin
                </p>

                <label className="block text-xs font-medium text-gray-400 mb-1.5">Patcher Yolu (ltk_patcher_host.exe)</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    readOnly
                    value={settings.patcherPath || ''}
                    placeholder="Seçilmedi..."
                    className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.08] text-gray-300 text-xs px-3 py-2.5 rounded-xl truncate"
                  />
                  <button
                    onClick={handleSelectPatcherPath}
                    className="shrink-0 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] px-3 py-2 rounded-xl text-xs font-medium transition"
                  >
                    📁 Gözat
                  </button>
                </div>

                <label className="block text-xs font-medium text-gray-400 mb-1.5">DLL Yolu (ltk_patcher_dll.dll)</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    readOnly
                    value={settings.dllPath || ''}
                    placeholder="Seçilmedi..."
                    className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.08] text-gray-300 text-xs px-3 py-2.5 rounded-xl truncate"
                  />
                  <button
                    onClick={handleSelectDllPath}
                    className="shrink-0 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] px-3 py-2 rounded-xl text-xs font-medium transition"
                  >
                    📁 Gözat
                  </button>
                </div>

                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Oyun Klasörü (League of Legends\Game) — boş bırakılırsa otomatik bulunur
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    readOnly
                    value={settings.gamePath || ''}
                    placeholder="Otomatik..."
                    className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.08] text-gray-300 text-xs px-3 py-2.5 rounded-xl truncate"
                  />
                  <button
                    onClick={handleSelectGamePath}
                    className="shrink-0 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] px-3 py-2 rounded-xl text-xs font-medium transition"
                  >
                    📁 Gözat
                  </button>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full bg-white/[0.07] hover:bg-white/[0.13] border border-white/[0.1] px-4 py-2.5 rounded-xl font-medium transition text-sm"
                >
                  💾 Ayarları Kaydet
                </button>
              </div>

              <div className="border-t border-white/[0.08] pt-4">
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
                  Hiqu v{appVersion} - League Champions Manager
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

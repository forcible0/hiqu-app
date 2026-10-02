"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceId = getDeviceId;
exports.getSavedRoomCode = getSavedRoomCode;
exports.getMemberName = getMemberName;
exports.setMemberName = setMemberName;
exports.createRoom = createRoom;
exports.joinRoom = joinRoom;
exports.leaveRoom = leaveRoom;
exports.getProcessedMap = getProcessedMap;
exports.setProcessedEntry = setProcessedEntry;
exports.clearProcessedMap = clearProcessedMap;
exports.listenToMembers = listenToMembers;
exports.listenToRoomSkins = listenToRoomSkins;
exports.broadcastActiveSkin = broadcastActiveSkin;
exports.removeActiveSkin = removeActiveSkin;
exports.listenToRemovedSkins = listenToRemovedSkins;
const firebase_1 = require("./firebase");
const database_1 = require("firebase/database");
const DEVICE_ID_KEY = 'hiqu_device_id';
const ROOM_CODE_KEY = 'hiqu_party_room';
const MEMBER_NAME_KEY = 'hiqu_party_name';
const PROCESSED_KEY_PREFIX = 'hiqu_party_processed_';
function getDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}
function getSavedRoomCode() {
    return localStorage.getItem(ROOM_CODE_KEY);
}
function getMemberName() {
    return localStorage.getItem(MEMBER_NAME_KEY) || 'Oyuncu';
}
function setMemberName(name) {
    localStorage.setItem(MEMBER_NAME_KEY, name);
}
function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
async function createRoom() {
    let code = generateRoomCode();
    for (let i = 0; i < 5; i++) {
        const snap = await (0, database_1.get)((0, database_1.ref)(firebase_1.db, `rooms/${code}`));
        if (!snap.exists())
            break;
        code = generateRoomCode();
    }
    const deviceId = getDeviceId();
    await (0, database_1.set)((0, database_1.ref)(firebase_1.db, `rooms/${code}`), {
        createdAt: Date.now(),
        members: {
            [deviceId]: { id: deviceId, name: getMemberName(), joinedAt: Date.now() }
        }
    });
    localStorage.setItem(ROOM_CODE_KEY, code);
    return code;
}
async function joinRoom(code) {
    const snap = await (0, database_1.get)((0, database_1.ref)(firebase_1.db, `rooms/${code}`));
    if (!snap.exists())
        return false;
    const deviceId = getDeviceId();
    await (0, database_1.set)((0, database_1.ref)(firebase_1.db, `rooms/${code}/members/${deviceId}`), {
        id: deviceId,
        name: getMemberName(),
        joinedAt: Date.now()
    });
    localStorage.setItem(ROOM_CODE_KEY, code);
    return true;
}
async function leaveRoom(code) {
    const deviceId = getDeviceId();
    await (0, database_1.remove)((0, database_1.ref)(firebase_1.db, `rooms/${code}/members/${deviceId}`));
    localStorage.removeItem(ROOM_CODE_KEY);
    clearProcessedMap(code);
}
// Parti'den gelen aktivasyonların "işlendi" bilgisini kalıcı tutar (championId -> setAt).
// Bu bilgi sadece bellekte (useRef) tutulursa uygulama kapanıp açıldığında sıfırlanır;
// eğer odaya otomatik yeniden bağlanılırsa Firebase o odanın TÜM geçmiş activeSkins
// verisini yeniden yollar ve her şey "yeni" sanılıp tekrar indirilip aktive edilmeye
// çalışılır. localStorage'a yazarak bunu kalıcı hale getiriyoruz.
function getProcessedMap(code) {
    try {
        const raw = localStorage.getItem(PROCESSED_KEY_PREFIX + code);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
function setProcessedEntry(code, championId, setAt) {
    const map = getProcessedMap(code);
    map[championId] = setAt;
    try {
        localStorage.setItem(PROCESSED_KEY_PREFIX + code, JSON.stringify(map));
    }
    catch {
        // localStorage dolu/erişilemez olsa bile akışı bozmasın
    }
}
function clearProcessedMap(code) {
    localStorage.removeItem(PROCESSED_KEY_PREFIX + code);
}
// onValue() zaten kendi unsubscribe fonksiyonunu döndürür — off() ile
// karıştırmaya gerek yok (yanlış callback referansı verirsen dinleyici
// gerçekte kapanmaz, tam olarak yaşadığın "partiden ayrılınca da
// güncellemeler gelmeye devam ediyor" bugu buydu).
function listenToMembers(code, callback) {
    const membersRef = (0, database_1.ref)(firebase_1.db, `rooms/${code}/members`);
    const unsubscribe = (0, database_1.onValue)(membersRef, (snap) => {
        const val = snap.val() || {};
        callback(Object.values(val));
    });
    return unsubscribe;
}
function listenToRoomSkins(code, callback) {
    const skinsRef = (0, database_1.ref)(firebase_1.db, `rooms/${code}/activeSkins`);
    const unsubscribe = (0, database_1.onValue)(skinsRef, (snap) => {
        callback(snap.val() || {});
    });
    return unsubscribe;
}
// SADECE "Aktif Et" tıklanınca çağrılacak — indirme aşamasında çağrılmıyor
async function broadcastActiveSkin(code, entry) {
    const deviceId = getDeviceId();
    await (0, database_1.update)((0, database_1.ref)(firebase_1.db, `rooms/${code}/activeSkins/${entry.championId}`), {
        ...entry,
        setBy: deviceId,
        setAt: Date.now()
    });
}
// Bir şampiyon için parti kaydını tamamen kaldırır — kişi kendi aktive ettiği
// skini silince çağrılır, böylece diğer üyeler de onu kendi taraflarında
// kaldırabilsin.
function removeActiveSkin(code, championId) {
    return (0, database_1.remove)((0, database_1.ref)(firebase_1.db, `rooms/${code}/activeSkins/${championId}`));
}
// Bir kayıt Firebase'den silindiğinde tetiklenir (silinmeden hemen önceki
// değeriyle birlikte). onChildRemoved, onValue'nun aksine, dinlemeye
// başladığın andan ÖNCE silinmiş kayıtları tekrar oynatmaz — yani "aktivasyon"
// dinleyicisinde çözdüğümüz restart/replay yarış durumu burada zaten yok.
function listenToRemovedSkins(code, callback) {
    const skinsRef = (0, database_1.ref)(firebase_1.db, `rooms/${code}/activeSkins`);
    const unsubscribe = (0, database_1.onChildRemoved)(skinsRef, (snap) => {
        const val = snap.val();
        if (snap.key && val)
            callback(snap.key, val);
    });
    return unsubscribe;
}

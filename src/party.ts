import { db } from './firebase'
import { ref, set, get, onValue, off, remove, update } from 'firebase/database'

export interface PartyMember {
  id: string
  name: string
  joinedAt: number
}

export interface PartySkinEntry {
  skinId: string
  chromaId?: string
  name: string
  championId: string
  championName: string
  num: number
  setBy: string
  setAt: number
}

const DEVICE_ID_KEY = 'hiqu_device_id'
const ROOM_CODE_KEY = 'hiqu_party_room'
const MEMBER_NAME_KEY = 'hiqu_party_name'

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function getSavedRoomCode(): string | null {
  return localStorage.getItem(ROOM_CODE_KEY)
}

export function getMemberName(): string {
  return localStorage.getItem(MEMBER_NAME_KEY) || 'Oyuncu'
}

export function setMemberName(name: string) {
  localStorage.setItem(MEMBER_NAME_KEY, name)
}

function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function createRoom(): Promise<string> {
  let code = generateRoomCode()
  for (let i = 0; i < 5; i++) {
    const snap = await get(ref(db, `rooms/${code}`))
    if (!snap.exists()) break
    code = generateRoomCode()
  }
  const deviceId = getDeviceId()
  await set(ref(db, `rooms/${code}`), {
    createdAt: Date.now(),
    members: {
      [deviceId]: { id: deviceId, name: getMemberName(), joinedAt: Date.now() }
    }
  })
  localStorage.setItem(ROOM_CODE_KEY, code)
  return code
}

export async function joinRoom(code: string): Promise<boolean> {
  const snap = await get(ref(db, `rooms/${code}`))
  if (!snap.exists()) return false
  const deviceId = getDeviceId()
  await set(ref(db, `rooms/${code}/members/${deviceId}`), {
    id: deviceId,
    name: getMemberName(),
    joinedAt: Date.now()
  })
  localStorage.setItem(ROOM_CODE_KEY, code)
  return true
}

export async function leaveRoom(code: string) {
  const deviceId = getDeviceId()
  await remove(ref(db, `rooms/${code}/members/${deviceId}`))
  localStorage.removeItem(ROOM_CODE_KEY)
}

export function listenToMembers(code: string, callback: (members: PartyMember[]) => void) {
  const membersRef = ref(db, `rooms/${code}/members`)
  const handler = onValue(membersRef, (snap) => {
    const val = snap.val() || {}
    callback(Object.values(val))
  })
  return () => off(membersRef, 'value', handler)
}

export function listenToRoomSkins(code: string, callback: (skins: Record<string, PartySkinEntry>) => void) {
  const skinsRef = ref(db, `rooms/${code}/activeSkins`)
  const handler = onValue(skinsRef, (snap) => {
    callback(snap.val() || {})
  })
  return () => off(skinsRef, 'value', handler)
}

// SADECE "Aktif Et" tıklanınca çağrılacak — indirme aşamasında çağrılmıyor
export async function broadcastActiveSkin(code: string, entry: Omit<PartySkinEntry, 'setBy' | 'setAt'>) {
  const deviceId = getDeviceId()
  await update(ref(db, `rooms/${code}/activeSkins/${entry.championId}`), {
    ...entry,
    setBy: deviceId,
    setAt: Date.now()
  })
}
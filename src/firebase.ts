import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyDTuI0R4TFFH7yu_R1TuDqs0kKdyEsDsLY",
  authDomain: "hiqu-party.firebaseapp.com",
  databaseURL: "https://hiqu-party-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hiqu-party",
  storageBucket: "hiqu-party.firebasestorage.app",
  messagingSenderId: "638093301541",
  appId: "1:638093301541:web:81f10dbef32dc38ccbeccc"
}

export const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
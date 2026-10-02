"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.app = void 0;
const app_1 = require("firebase/app");
const database_1 = require("firebase/database");
const firebaseConfig = {
    apiKey: "AIzaSyDTuI0R4TFFH7yu_R1TuDqs0kKdyEsDsLY",
    authDomain: "hiqu-party.firebaseapp.com",
    databaseURL: "https://hiqu-party-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "hiqu-party",
    storageBucket: "hiqu-party.firebasestorage.app",
    messagingSenderId: "638093301541",
    appId: "1:638093301541:web:81f10dbef32dc38ccbeccc"
};
exports.app = (0, app_1.initializeApp)(firebaseConfig);
exports.db = (0, database_1.getDatabase)(exports.app);

// js/core/database.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ⚠️ IMPORTANTE: Vuelve a copiar esto de tu consola de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDiJu8tonqFk1-LZTxe5nN8vAMU9vapicU",
    authDomain: "donadores-1f1d9.firebaseapp.com",
    databaseURL: "https://donadores-1f1d9-default-rtdb.firebaseio.com",
    projectId: "donadores-1f1d9",
    storageBucket: "donadores-1f1d9.firebasestorage.app",
    messagingSenderId: "196349053056",
    appId: "1:196349053056:web:b3e98a6ee7a8d486f3fe65"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.DB = {
    // Guardar usuario (Usamos CURP como ID)
    saveUser: async (user) => {
        try {
            const userId = user.curp.replace(/[^a-zA-Z0-9]/g, '');
            await set(ref(db, 'users/' + userId), user);
            console.log("✅ Usuario guardado en la nube");
            return true;
        } catch (error) {
            console.error("Error guardando:", error);
            alert("Error al guardar en la nube: " + error.message);
            return false;
        }
    },

    // Buscar usuario (Login)
    findUser: async (curp, password) => {
        try {
            const dbRef = ref(db);
            const userId = curp.replace(/[^a-zA-Z0-9]/g, '');
            const snapshot = await get(child(dbRef, `users/${userId}`));
            
            if (snapshot.exists()) {
                const user = snapshot.val();
                if (user.password === password) return user;
            }
            return null;
        } catch (error) {
            console.error("Error buscando usuario:", error);
            return null;
        }
    },

    // Verificar si existe (Registro)
    exists: async (curp, correo) => {
        try {
            const dbRef = ref(db);
            const snapshot = await get(child(dbRef, 'users'));
            
            if (snapshot.exists()) {
                const users = snapshot.val();
                for (let id in users) {
                    if (users[id].curp === curp || users[id].correo === correo) return true;
                }
            }
            return false;
        } catch (error) {
            console.error(error);
            return false;
        }
    },

    // Actualizar usuario
    updateUser: async (user) => {
        try {
            const userId = user.curp.replace(/[^a-zA-Z0-9]/g, '');
            await update(ref(db, 'users/' + userId), user);
            sessionStorage.setItem('currentUser', JSON.stringify(user));
        } catch (e) {
            console.error("Error actualizando:", e);
        }
    },

    // Obtener todos (Para solicitudes)
    getAllUsers: async () => {
        try {
            const dbRef = ref(db);
            const snapshot = await get(child(dbRef, 'users'));
            if (snapshot.exists()) return Object.values(snapshot.val());
            return [];
        } catch (error) {
            console.error(error);
            return [];
        }
    }
};
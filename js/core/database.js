// js/core/database.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, update, push, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ⚠️ TUS CREDENCIALES (Consérvalas)
const firebaseConfig = {
    apiKey: "AIzaSyDiJu8tonqFk1-LZTxe5nN8vAMU9vapicU",
    authDomain: "donadores-1f1d9.firebaseapp.com",
    databaseURL: "https://donadores-1f1d9-default-rtdb.firebaseio.com",
    projectId: "donadores-1f1d9",
    storageBucket: "donadores-1f1d9.firebasestorage.app",
    messagingSenderId: "196349053056",
    appId: "1:196349053056:web:b3e98a6ee7a8d486f3fe65"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.DB = {
    // ... (Mantén saveUser, findUser, exists, updateUser, getAllUsers IGUAL que antes) ...
    // Solo agrega/reemplaza estas nuevas funciones:

    // 1. Guardar Ubicación GPS Real
    updateLocation: async (user, lat, lng) => {
        const userId = user.curp.replace(/[^a-zA-Z0-9]/g, '');
        await update(ref(db, 'users/' + userId), { lat: lat, lng: lng });
    },

    // 2. Crear Solicitud Global (Pizarra Central)
    createGlobalRequest: async (requestData) => {
        const reqRef = push(ref(db, 'global_requests')); // ID único
        await set(reqRef, requestData);
        return reqRef.key;
    },

    // 3. Escuchar Solicitudes Activas (Tiempo Real)
    listenToRequests: (callback) => {
        const reqRef = ref(db, 'global_requests');
        onValue(reqRef, (snapshot) => {
            const data = snapshot.val();
            const requests = data ? Object.entries(data).map(([key, value]) => ({ id: key, ...value })) : [];
            callback(requests);
        });
    },

    // 4. Aceptar Donación (Reducir cupo)
    acceptRequest: async (requestId) => {
        const reqRef = ref(db, `global_requests/${requestId}`);
        const snapshot = await get(reqRef);
        
        if (snapshot.exists()) {
            const req = snapshot.val();
            const nuevosFaltantes = req.faltantes - 1;

            if (nuevosFaltantes <= 0) {
                // Si ya no faltan donadores, BORRAMOS la solicitud para todos
                await remove(reqRef);
                return { status: 'COMPLETE', hospital: req.hospital };
            } else {
                // Si aún faltan, solo actualizamos el contador
                await update(reqRef, { faltantes: nuevosFaltantes });
                return { status: 'CONTINUE', hospital: req.hospital };
            }
        }
        return null;
    }
};
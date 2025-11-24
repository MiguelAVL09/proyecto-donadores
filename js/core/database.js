// js/core/database.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, update, push, onValue, off } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ⚠️ PEGA AQUÍ TUS CREDENCIALES DE FIREBASE (Las mismas que ya tenías)
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
    // ... (Mantén saveUser, findUser, exists, updateUser, getAllUsers igual que antes) ...
    saveUser: async (user) => {
        try {
            const userId = user.curp.replace(/[^a-zA-Z0-9]/g, '');
            await set(ref(db, 'users/' + userId), user);
            return true;
        } catch (error) { console.error(error); return false; }
    },
    findUser: async (curp, pass) => {
        try {
            const userId = curp.replace(/[^a-zA-Z0-9]/g, '');
            const s = await get(child(ref(db), `users/${userId}`));
            if(s.exists() && s.val().password === pass) return s.val();
            return null;
        } catch(e) { return null; }
    },
    exists: async (curp, correo) => {
        const s = await get(child(ref(db), 'users'));
        if(!s.exists()) return false;
        const u = s.val();
        for(let k in u) if(u[k].curp === curp || u[k].correo === correo) return true;
        return false;
    },
    updateUser: async (user) => {
        const userId = user.curp.replace(/[^a-zA-Z0-9]/g, '');
        await update(ref(db, 'users/' + userId), user);
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    },
    getAllUsers: async () => {
        const s = await get(child(ref(db), 'users'));
        return s.exists() ? Object.values(s.val()) : [];
    },

    // --- NUEVAS FUNCIONES PARA EL CHAT ---
    
    // Crear un nuevo chat y devolver su ID
    createChat: async (user1, user2) => {
        const chatRef = push(ref(db, 'chats')); // Genera ID único
        await set(chatRef, {
            participants: { [user1]: true, [user2]: true },
            createdAt: Date.now()
        });
        return chatRef.key;
    },

    // Enviar mensaje
    sendMessage: async (chatId, senderName, text) => {
        const messagesRef = ref(db, `chats/${chatId}/messages`);
        await push(messagesRef, {
            sender: senderName,
            text: text,
            timestamp: Date.now()
        });
    },

    // Escuchar mensajes en tiempo real (Live)
    listenForMessages: (chatId, callback) => {
        const messagesRef = ref(db, `chats/${chatId}/messages`);
        onValue(messagesRef, (snapshot) => {
            const data = snapshot.val();
            const msgs = data ? Object.values(data) : [];
            callback(msgs);
        });
    },

    // Dejar de escuchar (para no saturar memoria)
    stopListening: (chatId) => {
        const messagesRef = ref(db, `chats/${chatId}/messages`);
        off(messagesRef);
    }
};
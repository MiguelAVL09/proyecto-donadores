// js/core/communication.js

const CONFIG = {
    emailJS: {
        // ⚠️ Recupera estos datos de tu panel de EmailJS
        serviceID: "service_do8cm09",   
        templateID: "template_jfwe7m9", 
        publicKey: "0w-RKmOmXDauzwlJA"  
    },
    telegram: {
        // ⚠️ Recupera estos datos de @BotFather y @userinfobot
        token: "8369480132:AAEgOCDY1UlGHKaef7mn7meOeH4Jo2dde3U", 
        adminChatID: "7511937045" 
    }
};

const Comm = {
    init: () => {
        if (window.emailjs) {
            emailjs.init(CONFIG.emailJS.publicKey);
            console.log("✅ Comunicación inicializada");
        }
    },

    // Enviar Correo Real
    enviarCorreoVerificacion: (destinatarioEmail, nombreUsuario, codigo) => {
        const params = { to_email: destinatarioEmail, nombre: nombreUsuario, codigo: codigo };
        return emailjs.send(CONFIG.emailJS.serviceID, CONFIG.emailJS.templateID, params)
            .then(() => true)
            .catch((error) => { console.error(error); return false; });
    },

    // Simular SMS (UX)
    simularEnvioTelefono: (telefono, codigo) => {
        return new Promise((resolve) => {
            console.log(`📱 Enviando SMS simulado a ${telefono}...`);
            setTimeout(() => {
                console.log(`📩 SMS entregado: ${codigo}`);
                resolve(true);
            }, 2000);
        });
    },

    // Notificar Admin por Telegram
    enviarTelegram: async (chatId, mensaje) => {
        if (CONFIG.telegram.token === "TU_BOT_TOKEN_AQUI") return; // Evita error si no hay token
        
        const url = `https://api.telegram.org/bot${CONFIG.telegram.token}/sendMessage`;
        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: 'Markdown' })
            });
        } catch (error) { console.error("Error Telegram:", error); }
    },

    notificarAdminNuevoUsuario: async (datosUsuario) => {
        const mensaje = `
🚀 *NUEVO DONADOR REGISTRADO*
👤 *Nombre:* ${datosUsuario.nombre}
🩸 *Sangre:* ${datosUsuario.sangre}
📞 *Tel:* ${datosUsuario.telefono}
📧 *Email:* ${datosUsuario.correo}
        `;
        await Comm.enviarTelegram(CONFIG.telegram.adminChatID, mensaje);
    }
};
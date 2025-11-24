// js/app.js - VERSIÓN FINAL INTEGRADA

// ==========================================
// 1. INICIALIZACIÓN Y SESIÓN
// ==========================================

// Inicializar servicios de comunicación
if (typeof Comm !== 'undefined') { Comm.init(); }

const Session = {
    login: (u) => sessionStorage.setItem('currentUser', JSON.stringify(u)),
    logout: () => { sessionStorage.removeItem('currentUser'); window.location.href = 'index.html'; },
    getUser: () => JSON.parse(sessionStorage.getItem('currentUser')),
    protect: () => { if (!Session.getUser()) window.location.href = 'index.html'; }
};

// ==========================================
// 2. LÓGICA DE PÁGINAS
// ==========================================

// --- PÁGINA DE REGISTRO ---
if (document.getElementById('page-registro')) {
    console.log("✅ Registro cargado");
    let codigoEmail = null, emailValidado = false;
    let codigoTel = null, telValidado = false;

    // A) Email
    document.getElementById('btnPedirCodigo')?.addEventListener('click', async () => {
        const correo = document.getElementById('txtCorreo').value;
        const nombre = document.getElementById('txtNombre').value;
        const btn = document.getElementById('btnPedirCodigo');
        
        if (!correo || !nombre) return alert("Falta nombre o correo.");
        
        btn.innerText = "Enviando..."; btn.disabled = true;
        codigoEmail = Math.floor(1000 + Math.random() * 9000).toString();
        
        const exito = await Comm.enviarCorreoVerificacion(correo, nombre, codigoEmail);
        
        if (exito) {
            alert(`Código enviado a ${correo}`);
            document.getElementById('msgCodigo').innerText = "✅ Enviado.";
            document.getElementById('msgCodigo').className = "msg-success";
        } else alert("Error enviando correo.");
        btn.innerText = "Reenviar"; btn.disabled = false;
    });

    document.getElementById('btnVerificar')?.addEventListener('click', () => {
        if (document.getElementById('txtCodigo').value === codigoEmail && codigoEmail) {
            emailValidado = true;
            alert("✅ Correo verificado.");
            checarBoton();
        } else alert("Código incorrecto.");
    });

    // B) Teléfono
    document.getElementById('btnPedirCodigoTel')?.addEventListener('click', async () => {
        const tel = document.getElementById('txtTelefono').value;
        const btn = document.getElementById('btnPedirCodigoTel');
        
        if (tel.length < 10) return alert("Número inválido.");
        
        btn.innerText = "Enviando..."; btn.disabled = true;
        codigoTel = Math.floor(1000 + Math.random() * 9000).toString();
        
        await Comm.simularEnvioTelefono(tel, codigoTel);
        
        alert(`🔔 SIMULACIÓN SMS: Tu código es ${codigoTel}`);
        document.getElementById('msgCodigoTel').innerText = "✅ Enviado.";
        document.getElementById('msgCodigoTel').className = "msg-success";
        btn.innerText = "Reenviar"; btn.disabled = false;
    });

    document.getElementById('btnVerificarTel')?.addEventListener('click', () => {
        if (document.getElementById('txtCodigoTel').value === codigoTel && codigoTel) {
            telValidado = true;
            alert("✅ Teléfono verificado.");
            checarBoton();
        } else alert("Código incorrecto.");
    });

    function checarBoton() {
        if (emailValidado && telValidado) {
            const btn = document.getElementById('btnRegistrar');
            btn.disabled = false; btn.classList.add('btn-brand');
        }
    }

    // C) Submit Registro
    document.getElementById('formRegistro')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pass = document.getElementById('txtPass').value;
        if (pass !== document.getElementById('txtConfirm').value) return alert("Contraseñas no coinciden.");
        
        const curp = document.getElementById('txtCURP').value;
        const correo = document.getElementById('txtCorreo').value;

        const exists = await DB.exists(curp, correo);
        if (exists) return alert("Usuario ya registrado.");

        const newUser = {
            nombre: document.getElementById('txtNombre').value,
            curp: curp, correo: correo,
            telefono: document.getElementById('txtTelefono').value,
            sangre: document.getElementById('ddlSangre').value,
            password: pass, aceptoAviso: false, cuestionario: false, notificaciones: [],
            puntos: 0, nivel: "Novato"
        };

        await DB.saveUser(newUser);
        await Comm.notificarAdminNuevoUsuario(newUser);
        alert("¡Registro Exitoso!");
        window.location.href = 'index.html';
    });
}

// --- PÁGINA DE LOGIN ---
if (document.getElementById('page-login')) {
    document.getElementById('formLogin')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.querySelector('button[type="submit"]');
        btn.innerText = "Buscando..."; btn.disabled = true;

        const user = await DB.findUser(document.getElementById('txtCURP').value, document.getElementById('txtPass').value);
        
        if (user) {
            Session.login(user);
            if (!user.aceptoAviso) window.location.href = 'aviso.html';
            else if (!user.cuestionario) window.location.href = 'cuestionario.html';
            else window.location.href = 'dashboard.html';
        } else {
            alert("Credenciales incorrectas");
            btn.innerText = "Entrar"; btn.disabled = false;
        }
    });
}

// --- PÁGINA DASHBOARD (GRÁFICAS Y NIVEL) ---
if (document.getElementById('page-dashboard')) {
    Session.protect();
    const user = Session.getUser();
    
    document.getElementById('lblBienvenida').innerText = `Hola, ${user.nombre}`;
    document.getElementById('lblNivel').innerText = user.nivel || "Novato";
    document.getElementById('lblPuntos').innerText = `${user.puntos || 0} XP`;

    // Gráfica Chart.js
    cargarGrafica();

    async function cargarGrafica() {
        const users = await DB.getAllUsers();
        const conteo = { "O+":0, "O-":0, "A+":0, "A-":0, "B+":0, "AB+":0 };
        users.forEach(u => { if (conteo[u.sangre] !== undefined) conteo[u.sangre]++; });

        const ctx = document.getElementById('graficaSangre');
        if(ctx) {
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(conteo),
                    datasets: [{
                        data: Object.values(conteo),
                        backgroundColor: ['#b30000', '#ff4d4d', '#990000', '#ff9999', '#800000', '#ffcccc']
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }
    }
}

// --- PÁGINA PERFIL (MEDALLAS) ---
if (document.getElementById('page-perfil')) {
    Session.protect();
    const user = Session.getUser();

    // Cargar Datos
    document.getElementById('lblNombre').innerText = user.nombre;
    document.getElementById('lblSangre').innerText = "Tipo " + user.sangre;
    document.getElementById('txtCorreo').value = user.correo;
    document.getElementById('txtTelefono').value = user.telefono;
    document.getElementById('txtCURP').value = user.curp;

    // Gamificación
    const puntos = user.puntos || 0;
    document.getElementById('lblNivel').innerText = user.nivel || "Novato";
    document.getElementById('lblPuntos').innerText = `${puntos} XP`;

    // Renderizar Medallas
    const container = document.getElementById('containerMedallas');
    if(container){
        let html = "";
        html += cardMedalla("🌱", "Novato", "Registro completado", true);
        html += cardMedalla("🩸", "Primer Donante", "1 ayuda confirmada", puntos >= 50);
        html += cardMedalla("🦸", "Héroe", "Nivel Héroe alcanzado", puntos >= 100);
        html += cardMedalla("👑", "Leyenda", "500 XP acumulados", puntos >= 500);
        container.innerHTML = html;
    }

    function cardMedalla(icono, titulo, desc, desbloqueada) {
        const color = desbloqueada ? "text-dark" : "text-muted opacity-50";
        const bg = desbloqueada ? "bg-warning-subtle" : "bg-light";
        const check = desbloqueada ? "✅" : "🔒";
        return `
            <div class="col-6 mb-3">
                <div class="${bg} p-3 rounded h-100 ${color} border">
                    <div class="fs-1">${icono}</div>
                    <div class="fw-bold">${titulo}</div>
                    <small>${desc}</small><br><small>${check}</small>
                </div>
            </div>`;
    }
}

// --- PÁGINA MAPA (LEAFLET) ---
if (document.getElementById('page-mapa')) {
    Session.protect();
    const map = L.map('map').setView([19.4326, -99.1332], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

    cargarMarcadores();
    async function cargarMarcadores() {
        const users = await DB.getAllUsers();
        users.forEach(u => {
            const lat = 19.4326 + (Math.random() - 0.5) * 0.1;
            const lng = -99.1332 + (Math.random() - 0.5) * 0.1;
            L.marker([lat, lng]).addTo(map)
                .bindPopup(`<b>${u.nombre}</b><br>Tipo: ${u.sangre}<br>Nivel: ${u.nivel || 'Novato'}`);
        });
        L.marker([19.4000, -99.1500]).addTo(map).bindPopup("🏥 <b>Hospital General</b><br>Requiere Sangre O+").openPopup();
    }
}

// --- SOLICITUDES ---
if (document.getElementById('page-solicitudes')) {
    document.querySelectorAll('.btn-pedir').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const tipo = e.target.getAttribute('data-tipo');
            const currentUser = Session.getUser();
            const allUsers = await DB.getAllUsers();
            let count = 0; const updates = [];

            allUsers.forEach(u => {
                if (u.curp !== currentUser.curp) {
                    if(!u.notificaciones) u.notificaciones = [];
                    // AGREGAMOS 'deCurp' PARA PODER CREAR EL CHAT DESPUÉS
                    u.notificaciones.push({
                        id: Date.now(),
                        msg: `Solicitud urgente de sangre ${tipo}`,
                        de: currentUser.nombre,
                        deCurp: currentUser.curp, 
                        type: 'REQUEST',
                        fecha: new Date().toLocaleDateString()
                    });
                    updates.push(DB.updateUser(u));
                    count++;
                }
            });
            await Promise.all(updates);
            alert(`Solicitud enviada a ${count} donadores.`);
        });
    });
}

// --- NOTIFICACIONES (CHAT Y PUNTOS) ---
if (document.getElementById('page-notificaciones')) {
    const user = Session.getUser();
    const container = document.getElementById('listaNotificaciones');
    
    if (!user.notificaciones || user.notificaciones.length === 0) {
        container.innerHTML = "<p>No hay notificaciones.</p>";
    } else {
        user.notificaciones.forEach((n, i) => {
            // Diferenciar Invitación a Chat vs Solicitud Normal
            if (n.type === 'CHAT_INVITE') {
                container.innerHTML += `
                <div class="card p-3 mb-2 border-primary shadow-sm">
                    <h5 class="text-primary">💬 ${n.msg}</h5>
                    <small>De: ${n.de}</small>
                    <a href="chat.html?id=${n.chatId}" class="btn btn-primary mt-2">Entrar al Chat</a>
                    <button class="btn btn-sm btn-link text-danger" onclick="borrarNotif(${i})">Borrar</button>
                </div>`;
            } else {
                container.innerHTML += `
                <div class="card p-3 mb-2 shadow-sm">
                    <h5>${n.msg}</h5> <small>De: ${n.de} | ${n.fecha}</small>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-success" onclick="responder(true, ${i}, '${n.deCurp || ''}')">Aceptar</button>
                        <button class="btn btn-sm btn-danger" onclick="responder(false, ${i})">Rechazar</button>
                    </div>
                </div>`;
            }
        });
    }

    // Responder Solicitud
    window.responder = async (acepta, index, solicitanteCurp) => {
        const u = Session.getUser();
        
        if (acepta) {
            // 1. Gamificación
            if (!u.puntos) u.puntos = 0;
            u.puntos += 50;
            let nuevoNivel = "Novato";
            if (u.puntos >= 100) nuevoNivel = "Héroe de Vida";
            if (u.puntos >= 500) nuevoNivel = "Leyenda";
            
            if ((u.nivel || "Novato") !== nuevoNivel) {
                alert(`🎉 ¡SUBISTE DE NIVEL!\nAhora eres: ${nuevoNivel}`);
                u.nivel = nuevoNivel;
            }

            // 2. Crear Chat (si tenemos el ID del solicitante)
            if (solicitanteCurp) {
                const chatId = await DB.createChat(u.curp, solicitanteCurp);
                alert("✅ Solicitud Aceptada. Creando sala de chat...");
                
                // Redirigir al usuario actual al chat
                window.location.href = `chat.html?id=${chatId}`;
                
                // OPCIONAL: Enviar invitación al solicitante para que también entre (requiere buscarlo en DB)
                // Esto se haría buscando al usuario 'solicitanteCurp' y poniéndole una notif 'CHAT_INVITE'
            }
        }

        u.notificaciones.splice(index, 1);
        await DB.updateUser(u);
        if (!acepta) location.reload();
    };

    window.borrarNotif = async(i) => {
        const u = Session.getUser();
        u.notificaciones.splice(i, 1);
        await DB.updateUser(u);
        location.reload();
    };
}

// --- PÁGINA CHAT (REALTIME) ---
if (document.getElementById('page-chat')) {
    Session.protect();
    const user = Session.getUser();
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get('id');

    if (!chatId) { alert("Error de chat."); window.location.href = 'dashboard.html'; }

    const chatBox = document.getElementById('chatBox');

    // Escuchar mensajes
    DB.listenForMessages(chatId, (messages) => {
        chatBox.innerHTML = "";
        if(messages.length === 0) chatBox.innerHTML = "<p class='text-center text-muted'>Inicio del chat.</p>";
        
        messages.forEach(m => {
            const isMe = m.sender === user.nombre;
            const clase = isMe ? "msg-me" : "msg-other"; // Estilos definidos en chat.html
            const hora = new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            chatBox.innerHTML += `
                <div class="msg ${clase}">
                    <strong>${m.sender}</strong><br>
                    ${m.text}
                    <div class="text-end" style="font-size:0.7em">${hora}</div>
                </div>`;
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    });

    // Enviar
    document.getElementById('btnEnviar').addEventListener('click', async () => {
        const txt = document.getElementById('txtMensaje');
        if (txt.value.trim() === "") return;
        await DB.sendMessage(chatId, user.nombre, txt.value);
        txt.value = "";
    });
}

// --- AUXILIARES ---
if (document.getElementById('page-aviso')) {
    Session.protect();
    const chk = document.getElementById('chkAcepto'), btn = document.getElementById('btnContinuar');
    chk?.addEventListener('change', () => btn.disabled = !chk.checked);
    btn?.addEventListener('click', async () => {
        const u = Session.getUser(); u.aceptoAviso = true; await DB.updateUser(u); window.location.href = 'cuestionario.html';
    });
}
if (document.getElementById('page-cuestionario')) {
    Session.protect();
    document.getElementById('formCuestionario')?.addEventListener('submit', async (e) => {
        e.preventDefault(); const u = Session.getUser(); u.cuestionario = true; await DB.updateUser(u);
        alert("✅ Eres apto."); window.location.href = 'dashboard.html';
    });
}
if (document.querySelector('.sidebar')) {
    Session.protect();
    document.getElementById('btnLogout')?.addEventListener('click', Session.logout);
}
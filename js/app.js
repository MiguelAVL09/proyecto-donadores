// js/app.js - PROYECTO FINAL COMPLETO

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
if (typeof Comm !== 'undefined') { Comm.init(); }

const Session = {
    login: (u) => sessionStorage.setItem('currentUser', JSON.stringify(u)),
    logout: () => { sessionStorage.removeItem('currentUser'); window.location.href = 'index.html'; },
    getUser: () => JSON.parse(sessionStorage.getItem('currentUser')),
    protect: () => { if (!Session.getUser()) window.location.href = 'index.html'; }
};

// ==========================================
// 2. LÓGICA DE PÁGINAS (DONADORES)
// ==========================================

// --- REGISTRO ---
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

    // C) Submit
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
            rol: 'donador', puntos: 0, nivel: "Novato"
        };

        await DB.saveUser(newUser);
        await Comm.notificarAdminNuevoUsuario(newUser);
        alert("¡Registro Exitoso!");
        window.location.href = 'index.html';
    });
}

// --- LOGIN (REDIRECCIÓN POR ROLES) ---
if (document.getElementById('page-login')) {
    document.getElementById('formLogin')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.querySelector('button[type="submit"]');
        btn.innerText = "Verificando..."; btn.disabled = true;

        const user = await DB.findUser(document.getElementById('txtCURP').value, document.getElementById('txtPass').value);
        
        if (user) {
            Session.login(user);
            if (user.rol === 'admin') window.location.href = 'admin-dashboard.html';
            else if (user.rol === 'doctor') window.location.href = 'doctor-dashboard.html';
            else {
                if (!user.aceptoAviso) window.location.href = 'aviso.html';
                else if (!user.cuestionario) window.location.href = 'cuestionario.html';
                else window.location.href = 'dashboard.html';
            }
        } else {
            alert("Credenciales incorrectas");
            btn.innerText = "Entrar"; btn.disabled = false;
        }
    });
}

// --- DASHBOARD ---
if (document.getElementById('page-dashboard')) {
    Session.protect();
    const user = Session.getUser();
    
    document.getElementById('lblBienvenida').innerText = `Hola, ${user.nombre}`;
    if(document.getElementById('lblNivel')) {
        document.getElementById('lblNivel').innerText = user.nivel || "Novato";
        document.getElementById('lblPuntos').innerText = `${user.puntos || 0} XP`;
    }

    if(document.getElementById('graficaSangre')) cargarGrafica();

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
                    datasets: [{ data: Object.values(conteo), backgroundColor: ['#b30000', '#ff4d4d', '#990000', '#ff9999', '#800000', '#ffcccc'] }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }
    }
}

// --- MAPA (GEOLOCALIZACIÓN) ---
if (document.getElementById('page-mapa')) {
    Session.protect();
    const user = Session.getUser();
    const map = L.map('map').setView([19.4326, -99.1332], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            map.setView([lat, lng], 14);
            L.marker([lat, lng]).addTo(map).bindPopup("<b>Tú</b>").openPopup();
            await DB.updateLocation(user, lat, lng);
        });
    }

    cargarOtrosUsuarios();
    async function cargarOtrosUsuarios() {
        const users = await DB.getAllUsers();
        users.forEach(u => {
            if (u.curp !== user.curp && u.lat && u.lng) {
                L.marker([u.lat, u.lng]).addTo(map)
                    .bindPopup(`<b>Héroe Donador</b><br>Tipo: ${u.sangre}<br>Nivel: ${u.nivel || 'Novato'}`);
            }
        });
        L.marker([19.4000, -99.1500]).addTo(map).bindPopup("🏥 <b>Hospital Central</b>").openPopup();
    }
}

// --- SOLICITUDES (LITROS Y ANONIMATO) ---
if (document.getElementById('page-solicitudes')) {
    document.getElementById('btnLanzarSolicitud')?.addEventListener('click', async () => {
        const tipo = document.getElementById('ddlTipoSolicitud').value;
        const litros = parseFloat(document.getElementById('txtLitros').value);
        const user = Session.getUser();

        if (!litros || litros <= 0) return alert("Ingresa cantidad válida.");

        const donadoresNecesarios = Math.ceil(litros / 0.45); // 450ml por persona

        const requestData = {
            tipo: tipo,
            litros: litros,
            faltantes: donadoresNecesarios,
            hospital: "Hospital General Regional",
            fecha: new Date().toLocaleDateString(),
            solicitanteId: user.curp 
        };

        await DB.createGlobalRequest(requestData);
        alert(`Solicitud creada anónimamente.\nSe requieren ${donadoresNecesarios} personas.`);
        window.location.href = 'notificaciones.html';
    });
}

// --- NOTIFICACIONES (PIZARRA CENTRAL) ---
if (document.getElementById('page-notificaciones')) {
    const user = Session.getUser();
    const container = document.getElementById('listaNotificaciones');

    DB.listenToRequests((requests) => {
        container.innerHTML = "";
        const visibles = requests.filter(r => r.solicitanteId !== user.curp);

        if (visibles.length === 0) {
            container.innerHTML = "<p>No hay solicitudes activas.</p>";
            return;
        }

        visibles.forEach(req => {
            container.innerHTML += `
            <div class="card p-3 mb-3 border-danger shadow-sm">
                <div class="d-flex justify-content-between">
                    <h5 class="text-danger">🩸 Se necesita sangre ${req.tipo}</h5>
                    <span class="badge bg-warning text-dark">${req.faltantes} donadores faltantes</span>
                </div>
                <p class="mb-1 text-muted">
                    Ubicación: ${req.hospital}<br>Meta: ${req.litros}L
                </p>
                <button class="btn btn-brand w-100 mt-2" onclick="aceptarDonacion('${req.id}')">Aceptar y Donar</button>
            </div>`;
        });
    });

    window.aceptarDonacion = async (reqId) => {
        if(confirm("¿Confirmas que irás a donar?")) {
            const result = await DB.acceptRequest(reqId);
            if (result) {
                window.location.href = `chat.html?hospital=${encodeURIComponent(result.hospital)}`;
            } else {
                alert("Esta solicitud ya fue completada.");
            }
        }
    };
}

// --- CHAT BOT (CITAS) ---
if (document.getElementById('page-chat')) {
    Session.protect();
    const user = Session.getUser();
    const params = new URLSearchParams(window.location.search);
    const hospital = params.get('hospital') || "Centro de Salud";
    const chatBox = document.getElementById('chatBox');
    let paso = 0;

    setTimeout(() => botSay(`Hola ${user.nombre}, soy el asistente virtual.`), 500);
    setTimeout(() => botSay(`Veo que quieres donar en: <b>${hospital}</b>. ¿Es correcto? (Responde Sí)`), 1500);

    document.getElementById('btnEnviar').addEventListener('click', () => {
        const input = document.getElementById('txtMensaje');
        const msg = input.value.trim();
        if (!msg) return;
        userSay(msg);
        input.value = "";
        setTimeout(() => procesarRespuesta(msg), 1000);
    });

    function procesarRespuesta(msg) {
        const m = msg.toLowerCase();
        if (paso === 0) {
            if (m.includes('si') || m.includes('sí')) {
                botSay("Excelente. Te asignamos el siguiente horario:");
                const f = new Date(); f.setDate(f.getDate() + 1);
                botSay(`📅 <b>${f.toLocaleDateString()}</b> 08:00 AM<br>📍 ${hospital}`);
                botSay("¿Confirmas tu asistencia? (Escribe 'Confirmar')");
                paso = 1;
            } else {
                botSay("Entiendo. Cancelaremos el proceso.");
                paso = 99;
            }
        } else if (paso === 1) {
            if (m.includes('confirm')) {
                botSay("¡Cita agendada! Gracias por ser un héroe. 🎉");
                botSay(`<a href="dashboard.html" class="btn btn-sm btn-outline-dark mt-2">Volver al Inicio</a>`);
                paso = 2;
            } else botSay("Por favor escribe 'Confirmar'.");
        }
    }

    function botSay(h) { chatBox.innerHTML += `<div class="msg msg-other mb-2 bg-light p-2 rounded w-75 border">🤖 ${h}</div>`; chatBox.scrollTop = chatBox.scrollHeight; }
    function userSay(t) { chatBox.innerHTML += `<div class="msg msg-me mb-2 bg-primary text-white p-2 rounded w-75 ms-auto text-end">${t}</div>`; chatBox.scrollTop = chatBox.scrollHeight; }
}

// ==========================================
// 3. LÓGICA DE ROLES (DOCTOR Y ADMIN)
// ==========================================

// --- DOCTOR ---
if (document.getElementById('page-doctor')) {
    Session.protect();
    const currentUser = Session.getUser();
    if(currentUser.rol !== 'doctor') window.location.href = 'index.html';

    cargarPacientes();

    async function cargarPacientes() {
        const users = await DB.getAllUsers();
        const tabla = document.getElementById('tablaPacientes');
        tabla.innerHTML = "";
        const pacientes = users.filter(u => u.cuestionario === true && u.rol === 'donador');

        if(pacientes.length === 0) tabla.innerHTML = "<tr><td colspan='5' class='text-center p-3'>No hay pacientes pendientes.</td></tr>";

        pacientes.forEach(p => {
            tabla.innerHTML += `
                <tr>
                    <td>${p.nombre}</td>
                    <td><span class="badge bg-danger">${p.sangre}</span></td>
                    <td>${p.telefono}</td>
                    <td><span class="badge bg-success">Apto</span></td>
                    <td><button class="btn btn-sm btn-primary" onclick="confirmarDonacion('${p.curp}')">✅ Confirmar Extracción</button></td>
                </tr>`;
        });
    }

    window.confirmarDonacion = async (curpPaciente) => {
        if(confirm("¿Confirmar donación exitosa?")) {
            const users = await DB.getAllUsers();
            const paciente = users.find(u => u.curp === curpPaciente);
            if(paciente) {
                paciente.puntos = (paciente.puntos || 0) + 100;
                paciente.cuestionario = false; 
                await DB.updateUser(paciente);
                alert("Puntos asignados al paciente.");
                cargarPacientes();
            }
        }
    };
}

// --- ADMIN ---
if (document.getElementById('page-admin')) {
    Session.protect();
    const currentUser = Session.getUser();
    if(currentUser.rol !== 'admin') window.location.href = 'index.html';

    cargarAdminData();

    async function cargarAdminData() {
        const users = await DB.getAllUsers();
        const inventario = { "O+": 12, "O-": 5, "A+": 8, "A-": 2, "B+": 4, "AB+": 1 };
        
        new Chart(document.getElementById('graficaInventario'), {
            type: 'bar',
            data: {
                labels: Object.keys(inventario),
                datasets: [{ label: 'Bolsas Disponibles', data: Object.values(inventario), backgroundColor: '#d63384' }]
            }
        });

        const lista = document.getElementById('listaUsuariosAdmin');
        lista.innerHTML = "";
        users.forEach(u => {
            lista.innerHTML += `
                <div class="d-flex justify-content-between border-bottom py-2">
                    <span>${u.nombre} (${u.rol || 'donador'})</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario('${u.curp}')">Dar de Baja</button>
                </div>`;
        });
    }
    window.eliminarUsuario = (curp) => alert("Función en mantenimiento.");
}

// --- PERFIL ---
if (document.getElementById('page-perfil')) {
    Session.protect();
    const user = Session.getUser();
    document.getElementById('lblNombre').innerText = user.nombre;
    document.getElementById('lblSangre').innerText = "Tipo " + user.sangre;
    document.getElementById('txtCorreo').value = user.correo;
    document.getElementById('txtTelefono').value = user.telefono;
    document.getElementById('txtCURP').value = user.curp;

    const puntos = user.puntos || 0;
    document.getElementById('lblNivel').innerText = user.nivel || "Novato";
    document.getElementById('lblPuntos').innerText = `${puntos} XP`;

    const container = document.getElementById('containerMedallas');
    if(container){
        let html = "";
        html += cardMedalla("🌱", "Novato", "Registro completado", true);
        html += cardMedalla("🩸", "Primer Donante", "1 donación confirmada", puntos >= 100);
        html += cardMedalla("🦸", "Héroe", "Nivel Héroe alcanzado", puntos >= 300);
        container.innerHTML = html;
    }
    function cardMedalla(icono, titulo, desc, desbloqueada) {
        const color = desbloqueada ? "text-dark" : "text-muted opacity-50";
        const bg = desbloqueada ? "bg-warning-subtle" : "bg-light";
        const check = desbloqueada ? "✅" : "🔒";
        return `<div class="col-6 mb-3"><div class="${bg} p-3 rounded h-100 ${color} border"><div class="fs-1">${icono}</div><div class="fw-bold">${titulo}</div><small>${desc}</small><br><small>${check}</small></div></div>`;
    }
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
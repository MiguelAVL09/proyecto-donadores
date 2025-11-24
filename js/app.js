// js/app.js - CÓDIGO COMPLETO PROYECTO DONADORES

// ==========================================
// 1. INICIALIZACIÓN Y SESIÓN
// ==========================================

// Inicializar servicios de comunicación si cargaron correctamente
if (typeof Comm !== 'undefined') {
    Comm.init();
}

const Session = {
    login: (user) => {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    },
    logout: () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    },
    getUser: () => JSON.parse(sessionStorage.getItem('currentUser')),
    protect: () => {
        if (!Session.getUser()) window.location.href = 'index.html';
    }
};

// ==========================================
// 2. LÓGICA DE PÁGINAS
// ==========================================

// --- PÁGINA DE REGISTRO ---
if (document.getElementById('page-registro')) {
    console.log("✅ Página de Registro Activa");

    let codigoEmail = null;
    let emailValidado = false;
    
    let codigoTel = null;
    let telValidado = false;

    // A) Enviar Correo
    document.getElementById('btnPedirCodigo')?.addEventListener('click', async () => {
        const correo = document.getElementById('txtCorreo').value;
        const nombre = document.getElementById('txtNombre').value;
        const btn = document.getElementById('btnPedirCodigo');
        const msg = document.getElementById('msgCodigo');

        if (!correo || !nombre) return alert("Falta nombre o correo.");

        btn.innerText = "Enviando..."; btn.disabled = true;
        msg.innerText = "⏳ Conectando...";

        codigoEmail = Math.floor(1000 + Math.random() * 9000).toString();
        
        const exito = await Comm.enviarCorreoVerificacion(correo, nombre, codigoEmail);

        if (exito) {
            msg.innerText = "✅ Código enviado al correo.";
            msg.className = "msg-success";
            alert(`Código enviado a ${correo}`);
        } else {
            msg.innerText = "❌ Error al enviar.";
            msg.className = "msg-error";
        }
        btn.innerText = "Reenviar"; btn.disabled = false;
    });

    document.getElementById('btnVerificar')?.addEventListener('click', () => {
        if (document.getElementById('txtCodigo').value === codigoEmail && codigoEmail) {
            emailValidado = true;
            alert("✅ Correo verificado.");
            checarBotonRegistro();
        } else alert("Código de correo incorrecto.");
    });

    // B) Enviar SMS (Simulado)
    document.getElementById('btnPedirCodigoTel')?.addEventListener('click', async () => {
        const tel = document.getElementById('txtTelefono').value;
        const btn = document.getElementById('btnPedirCodigoTel');
        const msg = document.getElementById('msgCodigoTel');

        if (tel.length < 10) return alert("Número celular inválido.");

        btn.innerText = "Enviando..."; btn.disabled = true;
        msg.innerText = "📡 Contactando proveedor...";

        codigoTel = Math.floor(1000 + Math.random() * 9000).toString();
        
        await Comm.simularEnvioTelefono(tel, codigoTel);

        msg.innerText = "✅ Enviado (Simulado).";
        msg.className = "msg-success";
        alert(`🔔 SIMULACIÓN SMS:\nTu código es: ${codigoTel}`);
        
        btn.innerText = "Reenviar"; btn.disabled = false;
    });

    document.getElementById('btnVerificarTel')?.addEventListener('click', () => {
        if (document.getElementById('txtCodigoTel').value === codigoTel && codigoTel) {
            telValidado = true;
            alert("✅ Teléfono verificado.");
            checarBotonRegistro();
        } else alert("Código SMS incorrecto.");
    });

    function checarBotonRegistro() {
        if (emailValidado && telValidado) {
            const btn = document.getElementById('btnRegistrar');
            btn.disabled = false;
            btn.classList.add('btn-brand');
        }
    }

    // C) Submit Registro
    document.getElementById('formRegistro')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const pass = document.getElementById('txtPass').value;
        if (pass !== document.getElementById('txtConfirm').value) return alert("Contraseñas no coinciden.");

        const curp = document.getElementById('txtCURP').value;
        const correo = document.getElementById('txtCorreo').value;

        // Verificar en Nube
        const exists = await DB.exists(curp, correo);
        if (exists) return alert("Usuario ya registrado.");

        const newUser = {
            nombre: document.getElementById('txtNombre').value,
            curp: curp,
            correo: correo,
            telefono: document.getElementById('txtTelefono').value,
            sangre: document.getElementById('ddlSangre').value,
            password: pass,
            aceptoAviso: false,
            cuestionario: false,
            notificaciones: [],
            puntos: 0,
            nivel: "Novato"
        };

        await DB.saveUser(newUser);
        await Comm.notificarAdminNuevoUsuario(newUser); // Telegram Admin

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

        const user = await DB.findUser(
            document.getElementById('txtCURP').value, 
            document.getElementById('txtPass').value
        );
        
        if (user) {
            Session.login(user);
            if (!user.aceptoAviso) window.location.href = 'aviso.html';
            else if (!user.cuestionario) window.location.href = 'cuestionario.html';
            else window.location.href = 'dashboard.html';
        } else {
            document.getElementById('msgLogin').innerText = "Credenciales incorrectas";
            btn.innerText = "Entrar"; btn.disabled = false;
        }
    });
}

// --- PÁGINA DASHBOARD (GRÁFICAS Y NIVEL) ---
if (document.getElementById('page-dashboard')) {
    Session.protect();
    const user = Session.getUser();
    
    // Mostrar datos usuario
    document.getElementById('lblBienvenida').innerText = `Hola, ${user.nombre}`;
    if(document.getElementById('lblNivel')) {
        document.getElementById('lblNivel').innerText = user.nivel || "Novato";
        document.getElementById('lblPuntos').innerText = `${user.puntos || 0} XP`;
    }

    // Gráfica Chart.js
    if(document.getElementById('graficaSangre')) {
        cargarGrafica();
    }

    async function cargarGrafica() {
        const users = await DB.getAllUsers();
        const conteo = { "O+":0, "O-":0, "A+":0, "A-":0, "B+":0, "AB+":0 };
        
        users.forEach(u => {
            if (conteo[u.sangre] !== undefined) conteo[u.sangre]++;
        });

        new Chart(document.getElementById('graficaSangre'), {
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

// --- PÁGINA MAPA (LEAFLET) ---
if (document.getElementById('page-mapa')) {
    Session.protect();

    const map = L.map('map').setView([19.4326, -99.1332], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    cargarMarcadores();

    async function cargarMarcadores() {
        const users = await DB.getAllUsers();
        
        users.forEach(u => {
            // Coordenadas aleatorias simuladas cerca de CDMX
            const lat = 19.4326 + (Math.random() - 0.5) * 0.1;
            const lng = -99.1332 + (Math.random() - 0.5) * 0.1;

            L.marker([lat, lng]).addTo(map)
                .bindPopup(`<b>${u.nombre}</b><br>Tipo: ${u.sangre}<br>Nivel: ${u.nivel || 'Novato'}`);
        });

        // Hospital Fijo
        L.marker([19.4000, -99.1500]).addTo(map)
            .bindPopup("🏥 <b>Hospital General</b><br>Requiere Sangre O+ Urgente")
            .openPopup();
    }
}

// --- SOLICITUDES ---
if (document.getElementById('page-solicitudes')) {
    document.querySelectorAll('.btn-pedir').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const tipo = e.target.getAttribute('data-tipo');
            const currentUser = Session.getUser();
            const allUsers = await DB.getAllUsers();
            let count = 0; 
            const updates = [];

            allUsers.forEach(u => {
                if (u.curp !== currentUser.curp) {
                    if(!u.notificaciones) u.notificaciones = [];
                    u.notificaciones.push({
                        id: Date.now(),
                        msg: `Solicitud urgente de sangre ${tipo}`,
                        de: currentUser.nombre,
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

// --- NOTIFICACIONES (GAMIFICACIÓN) ---
if (document.getElementById('page-notificaciones')) {
    const user = Session.getUser();
    const container = document.getElementById('listaNotificaciones');
    
    if (!user.notificaciones || user.notificaciones.length === 0) {
        container.innerHTML = "<p>No hay notificaciones.</p>";
    } else {
        user.notificaciones.forEach((n, i) => {
            container.innerHTML += `
                <div class="card p-3 mb-2 shadow-sm">
                    <h5>${n.msg}</h5>
                    <small>De: ${n.de} | ${n.fecha}</small>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-success" onclick="responder(true, ${i})">Aceptar</button>
                        <button class="btn btn-sm btn-danger" onclick="responder(false, ${i})">Rechazar</button>
                    </div>
                </div>`;
        });
    }

    window.responder = async (acepta, index) => {
        const u = Session.getUser();
        
        if (acepta) {
            // Lógica de puntos
            if (!u.puntos) u.puntos = 0;
            u.puntos += 50;

            let nuevoNivel = "Novato";
            if (u.puntos >= 100) nuevoNivel = "Héroe de Vida";
            if (u.puntos >= 500) nuevoNivel = "Leyenda";

            if ((u.nivel || "Novato") !== nuevoNivel) {
                alert(`🎉 ¡SUBISTE DE NIVEL!\nAhora eres: ${nuevoNivel}`);
                u.nivel = nuevoNivel;
            }
        }

        u.notificaciones.splice(index, 1);
        await DB.updateUser(u);
        
        alert(acepta ? "Gracias. Ganaste 50 XP." : "Solicitud rechazada.");
        location.reload();
    };
}

// --- PAGINAS AUXILIARES (AVISO / CUESTIONARIO / SIDEBAR) ---
if (document.getElementById('page-aviso')) {
    Session.protect();
    const chk = document.getElementById('chkAcepto');
    const btn = document.getElementById('btnContinuar');
    chk?.addEventListener('change', () => btn.disabled = !chk.checked);
    btn?.addEventListener('click', async () => {
        const u = Session.getUser();
        u.aceptoAviso = true;
        await DB.updateUser(u);
        window.location.href = 'cuestionario.html';
    });
}

if (document.getElementById('page-cuestionario')) {
    Session.protect();
    document.getElementById('formCuestionario')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = Session.getUser();
        u.cuestionario = true;
        await DB.updateUser(u);
        alert("✅ Eres apto.");
        window.location.href = 'dashboard.html';
    });
}

// Perfil Simple
if (document.getElementById('page-perfil')) {
    Session.protect();
    const u = Session.getUser();
    // (Aquí podrías agregar lógica para llenar los inputs con u.nombre, u.correo, etc.)
}

if (document.querySelector('.sidebar')) {
    Session.protect();
    document.getElementById('btnLogout')?.addEventListener('click', Session.logout);
}
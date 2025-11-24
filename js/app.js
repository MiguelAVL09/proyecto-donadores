// js/app.js

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
if (typeof Comm !== 'undefined') { Comm.init(); }

const Session = {
    login: (user) => { sessionStorage.setItem('currentUser', JSON.stringify(user)); },
    logout: () => { sessionStorage.removeItem('currentUser'); window.location.href = 'index.html'; },
    getUser: () => JSON.parse(sessionStorage.getItem('currentUser')),
    protect: () => { if (!Session.getUser()) window.location.href = 'index.html'; }
};

// ==========================================
// 2. LÓGICA DE PÁGINAS
// ==========================================

// --- REGISTRO ---
if (document.getElementById('page-registro')) {
    console.log("✅ Registro cargado");
    let codigoEmail = null, emailValidado = false;
    let codigoTel = null, telValidado = false;

    // Verificación Email
    document.getElementById('btnPedirCodigo')?.addEventListener('click', async () => {
        const correo = document.getElementById('txtCorreo').value;
        const nombre = document.getElementById('txtNombre').value;
        const btn = document.getElementById('btnPedirCodigo');
        
        if (!correo || !nombre) return alert("Ingresa nombre y correo.");
        
        btn.innerText = "Enviando..."; btn.disabled = true;
        codigoEmail = Math.floor(1000 + Math.random() * 9000).toString();
        
        const exito = await Comm.enviarCorreoVerificacion(correo, nombre, codigoEmail);
        
        if (exito) {
            alert(`Código enviado a ${correo}`);
            document.getElementById('msgCodigo').innerText = "✅ Enviado.";
            document.getElementById('msgCodigo').className = "msg-success";
        } else {
            alert("Error al enviar correo.");
        }
        btn.innerText = "Reenviar"; btn.disabled = false;
    });

    document.getElementById('btnVerificar')?.addEventListener('click', () => {
        if (document.getElementById('txtCodigo').value === codigoEmail && codigoEmail) {
            emailValidado = true;
            alert("✅ Correo verificado.");
            checarBoton();
        } else alert("Código incorrecto.");
    });

    // Verificación Teléfono
    document.getElementById('btnPedirCodigoTel')?.addEventListener('click', async () => {
        const tel = document.getElementById('txtTelefono').value;
        const btn = document.getElementById('btnPedirCodigoTel');
        
        if (tel.length < 10) return alert("Número inválido.");
        
        btn.innerText = "Enviando..."; btn.disabled = true;
        codigoTel = Math.floor(1000 + Math.random() * 9000).toString();
        
        await Comm.simularEnvioTelefono(tel, codigoTel);
        
        alert(`🔔 SIMULACIÓN SMS: Tu código es ${codigoTel}`);
        document.getElementById('msgCodigoTel').innerText = "✅ Enviado (Simulado).";
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

    // Submit Registro (Async)
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
            password: pass, aceptoAviso: false, cuestionario: false, notificaciones: []
        };

        await DB.saveUser(newUser);
        await Comm.notificarAdminNuevoUsuario(newUser);
        
        alert("¡Registro Exitoso!");
        window.location.href = 'index.html';
    });
}

// --- LOGIN ---
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

// --- AVISO ---
if (document.getElementById('page-aviso')) {
    Session.protect();
    const chk = document.getElementById('chkAcepto');
    const btn = document.getElementById('btnContinuar');
    
    chk?.addEventListener('change', () => btn.disabled = !chk.checked);
    btn?.addEventListener('click', async () => {
        const user = Session.getUser();
        user.aceptoAviso = true;
        await DB.updateUser(user);
        window.location.href = 'cuestionario.html';
    });
}

// --- CUESTIONARIO ---
if (document.getElementById('page-cuestionario')) {
    Session.protect();
    document.getElementById('formCuestionario')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = Session.getUser();
        user.cuestionario = true;
        await DB.updateUser(user);
        alert("✅ Eres apto.");
        window.location.href = 'dashboard.html';
    });
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
                    u.notificaciones.push({
                        id: Date.now(), msg: `Solicitud urgente: ${tipo}`,
                        de: currentUser.nombre, fecha: new Date().toLocaleDateString()
                    });
                    updates.push(DB.updateUser(u));
                    count++;
                }
            });
            await Promise.all(updates);
            alert(`Enviado a ${count} donadores.`);
        });
    });
}

// --- NOTIFICACIONES ---
if (document.getElementById('page-notificaciones')) {
    const user = Session.getUser();
    const container = document.getElementById('listaNotificaciones');
    
    if (!user.notificaciones || user.notificaciones.length === 0) {
        container.innerHTML = "<p>Sin notificaciones.</p>";
    } else {
        user.notificaciones.forEach((n, i) => {
            container.innerHTML += `
                <div class="card p-3 mb-2 shadow-sm">
                    <h5>${n.msg}</h5> <small>De: ${n.de} | ${n.fecha}</small>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-success" onclick="responder(true, ${i})">Aceptar</button>
                        <button class="btn btn-sm btn-danger" onclick="responder(false, ${i})">Rechazar</button>
                    </div>
                </div>`;
        });
    }
    window.responder = async (acepta, index) => {
        const u = Session.getUser();
        u.notificaciones.splice(index, 1);
        await DB.updateUser(u);
        alert(acepta ? "Gracias." : "Rechazado.");
        location.reload();
    };
}

if (document.querySelector('.sidebar')) {
    Session.protect();
    document.getElementById('btnLogout')?.addEventListener('click', Session.logout);
}
const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const wss = new WebSocket.Server({
    server: server
});

// ==============================
// SALAS
// ==============================

const salas = new Map();

function gerarCodigo() {
    let codigo;

    do {
        codigo = "BR" + Math.floor(10000 + Math.random() * 90000);
    } while (salas.has(codigo));

    return codigo;
}


// ==============================
// CRIAR SALA
// ==============================

app.post("/criar-sala", (req, res) => {

    const codigo = gerarCodigo();

    salas.set(codigo, {
        jogadores: new Set()
    });

    console.log("🎮 Sala criada:", codigo);

    res.json({
        sucesso: true,
        codigo: codigo
    });
});


// ==============================
// VERIFICAR / ENTRAR NA SALA
// ==============================

app.post("/entrar-sala", (req, res) => {

    const codigo = req.body.codigo;

    if (!codigo) {
        return res.json({
            sucesso: false,
            mensagem: "Código não informado"
        });
    }

    if (!salas.has(codigo)) {
        return res.json({
            sucesso: false,
            mensagem: "Sala não encontrada"
        });
    }

    const sala = salas.get(codigo);

    if (sala.jogadores.size >= 2) {
        return res.json({
            sucesso: false,
            mensagem: "Sala cheia"
        });
    }

    console.log("🔎 Sala encontrada:", codigo);

    // A entrada real será feita pelo WebSocket.
    res.json({
        sucesso: true,
        codigo: codigo
    });
});


// ==============================
// WEBSOCKET
// ==============================

wss.on("connection", (ws) => {

    console.log("🔌 Novo WebSocket conectado");

    ws.sala = null;


    ws.on("message", (message) => {

        let dados;

        try {
            dados = JSON.parse(message.toString());
        } catch (erro) {

            ws.send(JSON.stringify({
                tipo: "erro",
                mensagem: "Mensagem inválida"
            }));

            return;
        }


        // ==========================
        // ENTRAR NA SALA
        // ==========================

        if (dados.tipo === "entrar_sala") {

            const codigo = dados.codigo;

            if (!codigo || !salas.has(codigo)) {

                ws.send(JSON.stringify({
                    tipo: "erro",
                    mensagem: "Sala não encontrada"
                }));

                return;
            }


            const sala = salas.get(codigo);


            // Se já estiver em alguma sala
            if (ws.sala !== null) {

                ws.send(JSON.stringify({
                    tipo: "erro",
                    mensagem: "Você já está em uma sala"
                }));

                return;
            }


            // Sala cheia
            if (sala.jogadores.size >= 2) {

                ws.send(JSON.stringify({
                    tipo: "erro",
                    mensagem: "Sala cheia"
                }));

                return;
            }


            // Coloca jogador na sala
            sala.jogadores.add(ws);

            ws.sala = codigo;

            console.log(
                "👤 Jogador entrou na sala:",
                codigo,
                "| Jogadores:",
                sala.jogadores.size
            );


            // Confirma para esse jogador
            ws.send(JSON.stringify({
                tipo: "entrou_sala",
                codigo: codigo,
                jogadores: sala.jogadores.size
            }));


            // ==========================
            // DOIS JOGADORES
            // ==========================

            if (sala.jogadores.size === 2) {

                console.log(
                    "🔥 SALA PRONTA:",
                    codigo
                );

                const mensagem = JSON.stringify({
                    tipo: "sala_pronta",
                    codigo: codigo
                });


                // Avisa os DOIS jogadores
                for (const jogador of sala.jogadores) {

                    if (jogador.readyState === WebSocket.OPEN) {
                        jogador.send(mensagem);
                    }
                }
            }
        }
    });


    // ==============================
    // JOGADOR DESCONECTOU
    // ==============================

    ws.on("close", () => {

        console.log("❌ WebSocket desconectado");

        if (ws.sala === null) {
            return;
        }

        const codigo = ws.sala;

        if (!salas.has(codigo)) {
            return;
        }

        const sala = salas.get(codigo);

        sala.jogadores.delete(ws);

        console.log(
            "👤 Jogador saiu:",
            codigo,
            "| Restantes:",
            sala.jogadores.size
        );


        // Se ficou vazia, apaga a sala
        if (sala.jogadores.size === 0) {

            salas.delete(codigo);

            console.log(
                "🗑️ Sala removida:",
                codigo
            );
        }
    });
});


// ==============================
// ROTA PRINCIPAL
// ==============================

app.get("/", (req, res) => {

    res.send(
        "🚀 Rocket Brasil Server ONLINE!"
    );
});


// ==============================
// PORTA
// ==============================

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `🚀 Rocket Brasil Server rodando na porta ${PORT}!`
    );

    console.log(
        "🔌 WebSocket disponível!"
    );
});

const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const salas = new Map();

function gerarCodigo() {
    let codigo;

    do {
        codigo = "BR" + Math.floor(10000 + Math.random() * 90000);
    } while (salas.has(codigo));

    return codigo;
}

// Página de teste
app.get("/", (req, res) => {
    res.send("Rocket Brasil WebSocket ONLINE 🚀");
});

// Criar sala
app.post("/criar-sala", (req, res) => {
    const codigo = gerarCodigo();

    salas.set(codigo, {
        jogadores: [],
        sockets: []
    });

    console.log("Sala criada:", codigo);

    res.json({
        sucesso: true,
        codigo: codigo
    });
});

// Entrar em sala
app.post("/entrar-sala", (req, res) => {
    const codigo = req.body.codigo;

    const sala = salas.get(codigo);

    if (!sala) {
        return res.json({
            sucesso: false,
            mensagem: "Sala não encontrada"
        });
    }

    if (sala.sockets.length >= 2) {
        return res.json({
            sucesso: false,
            mensagem: "Sala cheia"
        });
    }

    res.json({
        sucesso: true,
        codigo: codigo
    });
});

// WebSocket
wss.on("connection", (socket) => {
    console.log("Novo jogador conectado!");

    socket.on("message", (message) => {
        try {
            const dados = JSON.parse(message);

            // Jogador entra no WebSocket de uma sala
            if (dados.tipo === "entrar_sala") {

                const codigo = dados.codigo;
                const sala = salas.get(codigo);

                if (!sala) {
                    socket.send(JSON.stringify({
                        tipo: "erro",
                        mensagem: "Sala não encontrada"
                    }));

                    return;
                }

                if (sala.sockets.length >= 2) {
                    socket.send(JSON.stringify({
                        tipo: "erro",
                        mensagem: "Sala cheia"
                    }));

                    return;
                }

                sala.sockets.push(socket);

                socket.sala = codigo;

                console.log(
                    "Jogador entrou na sala:",
                    codigo
                );

                // Avisar o jogador que entrou
                socket.send(JSON.stringify({
                    tipo: "entrou_sala",
                    codigo: codigo
                }));

                // Se já existem 2 jogadores
                if (sala.sockets.length === 2) {

                    console.log(
                        "Sala pronta:",
                        codigo
                    );

                    sala.sockets.forEach((player) => {
                        player.send(JSON.stringify({
                            tipo: "sala_pronta"
                        }));
                    });
                }
            }
        } catch (erro) {
            console.log("Mensagem inválida:", erro);
        }
    });

    socket.on("close", () => {

        const codigo = socket.sala;

        if (!codigo) return;

        const sala = salas.get(codigo);

        if (!sala) return;

        sala.sockets = sala.sockets.filter(
            (player) => player !== socket
        );

        console.log(
            "Jogador saiu da sala:",
            codigo
        );
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(
        `🚀 Rocket Brasil Server rodando na porta ${PORT}`
    );
});
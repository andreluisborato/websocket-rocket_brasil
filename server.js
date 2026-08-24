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

const salas = new Map();

let proximoJogador = 1;


// ==========================
// GERAR CÓDIGO
// ==========================

function gerarCodigo() {

    let codigo;

    do {
        codigo = "BR" + Math.floor(10000 + Math.random() * 90000);
    } while (salas.has(codigo));

    return codigo;
}


// ==========================
// CRIAR SALA
// ==========================

app.post("/criar-sala", (req, res) => {

    const codigo = gerarCodigo();

    salas.set(codigo, {
        jogadores: new Map()
    });

    console.log("🎮 Sala criada:", codigo);

    res.json({
        sucesso: true,
        codigo: codigo
    });
});


// ==========================
// ENTRAR NA SALA
// ==========================

app.post("/entrar-sala", (req, res) => {

    const codigo = req.body.codigo;

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

    res.json({
        sucesso: true,
        codigo: codigo
    });
});


// ==========================
// WEBSOCKET
// ==========================

wss.on("connection", (ws) => {

    console.log("🔌 WebSocket conectado");

    ws.sala = null;
    ws.jogador_id = null;


    ws.on("message", (message) => {

        let dados;

        try {
            dados = JSON.parse(message.toString());
        } catch {

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

            if (!salas.has(codigo)) {

                ws.send(JSON.stringify({
                    tipo: "erro",
                    mensagem: "Sala não encontrada"
                }));

                return;
            }

            const sala = salas.get(codigo);


            if (sala.jogadores.size >= 2) {

                ws.send(JSON.stringify({
                    tipo: "erro",
                    mensagem: "Sala cheia"
                }));

                return;
            }


            // ID do jogador
            const jogador_id = proximoJogador++;

            ws.sala = codigo;
            ws.jogador_id = jogador_id;


            sala.jogadores.set(jogador_id, ws);


            const numeroJogador = sala.jogadores.size;


            console.log(
                `🚗 Jogador ${numeroJogador} entrou na sala ${codigo}`
            );


            // Avisar quem acabou de entrar
            ws.send(JSON.stringify({
                tipo: "entrou_sala",
                codigo: codigo,
                jogador_id: jogador_id,
                numero: numeroJogador
            }));


            // ==========================
            // AVISAR TODOS SOBRE OS JOGADORES
            // ==========================

            enviarListaJogadores(sala);


            // ==========================
            // SALA PRONTA
            // ==========================

            if (sala.jogadores.size === 2) {

                console.log(
                    "🔥 SALA PRONTA:",
                    codigo
                );


                for (const jogador of sala.jogadores.values()) {

                    jogador.send(JSON.stringify({
                        tipo: "sala_pronta",
                        codigo: codigo
                    }));
                }
            }
        }


        // ==========================
        // MOVIMENTO
        // ==========================

        if (dados.tipo === "movimento") {

            if (ws.sala === null) {
                return;
            }

            if (!salas.has(ws.sala)) {
                return;
            }

            const sala = salas.get(ws.sala);


            const mensagem = JSON.stringify({
                tipo: "movimento",
                jogador_id: ws.jogador_id,
                x: dados.x,
                y: dados.y,
                rotacao: dados.rotacao
            });


            // Enviar para os outros jogadores
            for (const [id, jogador] of sala.jogadores) {

                if (
                    id !== ws.jogador_id &&
                    jogador.readyState === WebSocket.OPEN
                ) {

                    jogador.send(mensagem);
                }
            }
        }
    });


    // ==========================
    // DESCONECTOU
    // ==========================

    ws.on("close", () => {

        console.log("❌ Jogador desconectou");


        if (ws.sala === null) {
            return;
        }


        if (!salas.has(ws.sala)) {
            return;
        }


        const sala = salas.get(ws.sala);


        sala.jogadores.delete(ws.jogador_id);


        enviarListaJogadores(sala);


        if (sala.jogadores.size === 0) {

            salas.delete(ws.sala);

            console.log(
                "🗑️ Sala removida:",
                ws.sala
            );
        }
    });
});


// ==========================
// ENVIAR LISTA
// ==========================

function enviarListaJogadores(sala) {

    const jogadores = [];


    let numero = 1;


    for (const [id, ws] of sala.jogadores) {

        jogadores.push({
            id: id,
            nome: "Player " + numero
        });

        numero++;
    }


    const mensagem = JSON.stringify({
        tipo: "jogadores",
        jogadores: jogadores
    });


    for (const ws of sala.jogadores.values()) {

        if (ws.readyState === WebSocket.OPEN) {

            ws.send(mensagem);
        }
    }
}


// ==========================
// SITE
// ==========================

app.get("/", (req, res) => {

    res.send(
        "🚀 Rocket Brasil Server ONLINE!"
    );
});


// ==========================
// PORTA
// ==========================

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `🚀 Servidor rodando na porta ${PORT}`
    );
});

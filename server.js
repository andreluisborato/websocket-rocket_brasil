const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const salas = new Map();

function gerarCodigo() {
    let codigo;

    do {
        codigo = "BR" + Math.floor(10000 + Math.random() * 90000);
    } while (salas.has(codigo));

    return codigo;
}

// Criar sala
app.post("/criar-sala", (req, res) => {
    const codigo = gerarCodigo();

    salas.set(codigo, {
        jogadores: 1
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

    if (!salas.has(codigo)) {
        return res.json({
            sucesso: false,
            mensagem: "Sala não encontrada"
        });
    }

    const sala = salas.get(codigo);

    if (sala.jogadores >= 2) {
        return res.json({
            sucesso: false,
            mensagem: "Sala cheia"
        });
    }

    sala.jogadores++;

    console.log("Jogador entrou:", codigo);

    res.json({
        sucesso: true,
        codigo: codigo
    });
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Rocket Brasil Server ONLINE 🚀");
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor Rocket Brasil rodando na porta ${PORT}!`);
});

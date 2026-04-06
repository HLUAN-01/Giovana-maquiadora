const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let agendamentos = [];

// TESTE
app.get("/", (req, res) => {
  res.send("Servidor da Giovana funcionando 💄");
});

// TESTE EXTRA
app.get("/teste", (req, res) => {
  res.send("Rota teste OK");
});

// AGENDAR
app.post("/agendar", (req, res) => {
  console.log("BATEU NA ROTA /agendar");

  const { nome, data, hora, servico } = req.body;

  const novoAgendamento = {
    id: Date.now(),
    nome,
    data,
    hora,
    servico
  };

  agendamentos.push(novoAgendamento);

  res.json({
    mensagem: "Agendamento realizado com sucesso!",
    agendamento: novoAgendamento
  });
});

// LISTAR
app.get("/agendamentos", (req, res) => {
  res.json(agendamentos);
});

// START
app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
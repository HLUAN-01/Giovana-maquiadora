const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

const DATA_DIR = path.join(__dirname, "data");
const AGENDAMENTOS_FILE = path.join(DATA_DIR, "agendamentos.json");
const USUARIOS_FILE = path.join(DATA_DIR, "usuarios.json");
const USUARIOS_PADRAO = [
  { usuario: "admin", senha: "admin123", perfil: "admin", nome: "Administrador" },
  { usuario: "usuario", senha: "usuario123", perfil: "usuario", nome: "Usuario" }
];
const sessoes = new Map();

let agendamentos = [];
let usuarios = [];

async function carregarAgendamentos() {
  try {
    const dados = await fs.readFile(AGENDAMENTOS_FILE, "utf-8");
    const lista = JSON.parse(dados);
    agendamentos = Array.isArray(lista) ? lista : [];
  } catch (erro) {
    if (erro.code === "ENOENT") {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(AGENDAMENTOS_FILE, "[]", "utf-8");
      agendamentos = [];
      return;
    }
    throw erro;
  }
}

async function salvarAgendamentos() {
  await fs.writeFile(AGENDAMENTOS_FILE, JSON.stringify(agendamentos, null, 2), "utf-8");
}

function garantirAdmin(listaUsuarios) {
  const temAdmin = listaUsuarios.some((item) => item.usuario === "admin");
  if (!temAdmin) {
    listaUsuarios.push(USUARIOS_PADRAO[0]);
  }
}

async function carregarUsuarios() {
  try {
    const dados = await fs.readFile(USUARIOS_FILE, "utf-8");
    const lista = JSON.parse(dados);
    usuarios = Array.isArray(lista) ? lista : [];
    garantirAdmin(usuarios);
    await salvarUsuarios();
  } catch (erro) {
    if (erro.code === "ENOENT") {
      await fs.mkdir(DATA_DIR, { recursive: true });
      usuarios = [...USUARIOS_PADRAO];
      await salvarUsuarios();
      return;
    }
    throw erro;
  }
}

async function salvarUsuarios() {
  await fs.writeFile(USUARIOS_FILE, JSON.stringify(usuarios, null, 2), "utf-8");
}

function autenticar(req, res, next) {
  const header = req.headers.authorization || "";
  const [tipo, token] = header.split(" ");

  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ mensagem: "Nao autenticado." });
  }

  const sessao = sessoes.get(token);
  if (!sessao) {
    return res.status(401).json({ mensagem: "Sessao invalida." });
  }

  req.usuarioLogado = sessao;
  return next();
}

function exigirAdmin(req, res, next) {
  if (req.usuarioLogado.perfil !== "admin") {
    return res.status(403).json({ mensagem: "Apenas admin pode executar essa acao." });
  }
  return next();
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// TESTE EXTRA
app.get("/teste", (req, res) => {
  res.send("Rota teste OK");
});

// LOGIN
app.post("/login", (req, res) => {
  const { usuario, senha } = req.body;
  const conta = usuarios.find((item) => item.usuario === usuario && item.senha === senha);

  if (!conta) {
    return res.status(401).json({ mensagem: "Usuario ou senha invalidos." });
  }

  const token = crypto.randomUUID();
  const dadosUsuario = {
    usuario: conta.usuario,
    nome: conta.nome,
    perfil: conta.perfil
  };
  sessoes.set(token, dadosUsuario);

  return res.json({
    mensagem: "Login realizado com sucesso.",
    token,
    usuario: dadosUsuario
  });
});

app.post("/usuarios", async (req, res) => {
  const { nome, usuario, senha } = req.body;

  if (!nome || !usuario || !senha) {
    return res.status(400).json({ mensagem: "Nome, usuario e senha sao obrigatorios." });
  }

  const usuarioLimpo = String(usuario).trim().toLowerCase();
  const nomeLimpo = String(nome).trim();
  const senhaLimpa = String(senha);

  if (usuarioLimpo.length < 3) {
    return res.status(400).json({ mensagem: "Usuario deve ter pelo menos 3 caracteres." });
  }

  if (senhaLimpa.length < 4) {
    return res.status(400).json({ mensagem: "Senha deve ter pelo menos 4 caracteres." });
  }

  const usuarioExiste = usuarios.some((item) => item.usuario === usuarioLimpo);
  if (usuarioExiste) {
    return res.status(409).json({ mensagem: "Usuario ja cadastrado." });
  }

  const novoUsuario = {
    nome: nomeLimpo,
    usuario: usuarioLimpo,
    senha: senhaLimpa,
    perfil: "usuario"
  };

  try {
    usuarios.push(novoUsuario);
    await salvarUsuarios();
    return res.status(201).json({ mensagem: "Conta criada com sucesso." });
  } catch (erro) {
    console.error("Erro ao cadastrar usuario:", erro);
    return res.status(500).json({ mensagem: "Erro ao cadastrar usuario." });
  }
});

app.post("/logout", autenticar, (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  sessoes.delete(token);
  res.json({ mensagem: "Logout realizado com sucesso." });
});

app.get("/me", autenticar, (req, res) => {
  res.json(req.usuarioLogado);
});

// AGENDAR
app.post("/agendar", autenticar, async (req, res) => {
  console.log("BATEU NA ROTA /agendar");

  const { nome, data, hora, servico } = req.body;

  if (!nome || !data || !hora || !servico) {
    return res.status(400).json({ mensagem: "Preencha todos os campos obrigatorios." });
  }

  const novoAgendamento = {
    id: Date.now(),
    nome,
    data,
    hora,
    servico,
    criadoPor: req.usuarioLogado.usuario
  };

  try {
    agendamentos.push(novoAgendamento);
    await salvarAgendamentos();
  } catch (erro) {
    console.error("Erro ao salvar agendamento:", erro);
    return res.status(500).json({ mensagem: "Erro ao salvar agendamento." });
  }

  res.json({
    mensagem: "Agendamento realizado com sucesso!",
    agendamento: novoAgendamento
  });
});

// LISTAR
app.get("/agendamentos", autenticar, (req, res) => {
  if (req.usuarioLogado.perfil === "admin") {
    return res.json(agendamentos);
  }

  const meusAgendamentos = agendamentos.filter(
    (item) => item.criadoPor === req.usuarioLogado.usuario
  );
  return res.json(meusAgendamentos);
});

// EXCLUIR
app.delete("/agendamentos/:id", autenticar, exigirAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ mensagem: "ID invalido." });
  }

  const quantidadeAntes = agendamentos.length;
  agendamentos = agendamentos.filter((item) => item.id !== id);

  if (agendamentos.length === quantidadeAntes) {
    return res.status(404).json({ mensagem: "Agendamento nao encontrado." });
  }

  try {
    await salvarAgendamentos();
    return res.json({ mensagem: "Agendamento removido com sucesso." });
  } catch (erro) {
    console.error("Erro ao remover agendamento:", erro);
    return res.status(500).json({ mensagem: "Erro ao remover agendamento." });
  }
});

// START
async function iniciarServidor() {
  try {
    await carregarAgendamentos();
    await carregarUsuarios();
    const porta = 3000;
    const host = "0.0.0.0";
    app.listen(porta, host, () => {
      const interfaces = os.networkInterfaces();
      const ips = Object.values(interfaces)
        .flat()
        .filter((iface) => iface && iface.family === "IPv4" && !iface.internal)
        .map((iface) => iface.address);

      console.log(`Servidor rodando em http://localhost:${porta}`);
      if (ips.length) {
        console.log("Acesso na rede local:");
        ips.forEach((ip) => {
          console.log(`http://${ip}:${porta}`);
        });
      }
    });
  } catch (erro) {
    console.error("Erro ao iniciar servidor:", erro);
    process.exit(1);
  }
}

iniciarServidor();
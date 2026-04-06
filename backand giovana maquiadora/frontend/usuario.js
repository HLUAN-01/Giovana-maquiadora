const token = localStorage.getItem("token") || "";
const usuarioLogadoEl = document.getElementById("usuario-logado");
const botaoLogout = document.getElementById("btn-logout");
const form = document.getElementById("agendamento-form");
const mensagem = document.getElementById("mensagem");
const listaAgendamentos = document.getElementById("lista-agendamentos");

function cabecalhosAutenticados() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

function mostrarMensagem(texto, tipo) {
  mensagem.textContent = texto;
  mensagem.className = tipo;
}

function sairLocal() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

function renderizarAgendamentos(agendamentos) {
  if (!agendamentos.length) {
    listaAgendamentos.innerHTML = "<li>Nenhum agendamento ainda.</li>";
    return;
  }

  const itens = agendamentos
    .slice()
    .sort((a, b) => new Date(`${a.data}T${a.hora}`) - new Date(`${b.data}T${b.hora}`))
    .map((item) => {
      return `<li><div><strong>${item.nome}</strong><br>${item.servico}<br>${item.data} as ${item.hora}</div></li>`;
    })
    .join("");

  listaAgendamentos.innerHTML = itens;
}

async function carregarAgendamentos() {
  try {
    const resposta = await fetch("/agendamentos", {
      headers: cabecalhosAutenticados()
    });

    if (resposta.status === 401 || resposta.status === 403) {
      sairLocal();
      return;
    }

    if (!resposta.ok) {
      throw new Error("Falha ao listar agendamentos");
    }

    const agendamentos = await resposta.json();
    renderizarAgendamentos(agendamentos);
  } catch (erro) {
    console.error(erro);
    listaAgendamentos.innerHTML = "<li>Erro ao carregar agendamentos.</li>";
  }
}

async function agendar(event) {
  event.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const data = document.getElementById("data").value;
  const hora = document.getElementById("hora").value;
  const servico = document.getElementById("servico").value;

  if (!nome || !data || !hora || !servico) {
    mostrarMensagem("Preencha todos os campos para continuar.", "erro");
    return;
  }

  try {
    const resposta = await fetch("/agendar", {
      method: "POST",
      headers: cabecalhosAutenticados(),
      body: JSON.stringify({ nome, data, hora, servico })
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.mensagem || "Falha ao criar agendamento");
    }

    mostrarMensagem(dados.mensagem || "Agendamento realizado com sucesso!", "sucesso");
    form.reset();
    carregarAgendamentos();
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(erro.message || "Erro ao conectar com o servidor.", "erro");
  }
}

async function carregarSessao() {
  if (!token) {
    sairLocal();
    return;
  }

  try {
    const resposta = await fetch("/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!resposta.ok) {
      throw new Error("Sessao invalida");
    }

    const usuarioLogado = await resposta.json();
    if (usuarioLogado.perfil !== "usuario") {
      throw new Error("Acesso restrito ao usuario");
    }

    usuarioLogadoEl.textContent = `Logado como: ${usuarioLogado.nome} (${usuarioLogado.perfil})`;
    carregarAgendamentos();
  } catch (erro) {
    console.error(erro);
    sairLocal();
  }
}

async function fazerLogout() {
  if (!token) {
    sairLocal();
    return;
  }

  try {
    await fetch("/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (erro) {
    console.error(erro);
  } finally {
    sairLocal();
  }
}

form.addEventListener("submit", agendar);
botaoLogout.addEventListener("click", fazerLogout);
carregarSessao();

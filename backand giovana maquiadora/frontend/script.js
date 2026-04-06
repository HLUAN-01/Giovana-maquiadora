const loginForm = document.getElementById("login-form");
const cadastroForm = document.getElementById("cadastro-form");
const tabLogin = document.getElementById("tab-login");
const tabCadastro = document.getElementById("tab-cadastro");
const painelLogin = document.getElementById("painel-login");
const painelCadastro = document.getElementById("painel-cadastro");
const loginCard = document.getElementById("login-card");
const appCard = document.getElementById("app-card");
const mensagemLogin = document.getElementById("mensagem-login");
const mensagemCadastro = document.getElementById("mensagem-cadastro");
const usuarioLogadoEl = document.getElementById("usuario-logado");
const botaoLogout = document.getElementById("btn-logout");
const form = document.getElementById("agendamento-form");
const mensagem = document.getElementById("mensagem");
const listaAgendamentos = document.getElementById("lista-agendamentos");

let token = localStorage.getItem("token") || "";
let usuarioLogado = null;

function alternarAbaAuth(aba) {
  const mostrarLogin = aba === "login";
  painelLogin.classList.toggle("hidden", !mostrarLogin);
  painelCadastro.classList.toggle("hidden", mostrarLogin);
  tabLogin.classList.toggle("is-active", mostrarLogin);
  tabCadastro.classList.toggle("is-active", !mostrarLogin);
  tabLogin.setAttribute("aria-selected", String(mostrarLogin));
  tabCadastro.setAttribute("aria-selected", String(!mostrarLogin));
}

function mostrarMensagem(texto, tipo) {
  mensagem.textContent = texto;
  mensagem.className = tipo;
}

function mostrarMensagemLogin(texto, tipo) {
  mensagemLogin.textContent = texto;
  mensagemLogin.className = tipo;
}

function mostrarMensagemCadastro(texto, tipo) {
  mensagemCadastro.textContent = texto;
  mensagemCadastro.className = tipo;
}

function cabecalhosAutenticados() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

function atualizarTelaLogada() {
  if (!usuarioLogado) {
    return;
  }

  loginCard.classList.add("hidden");
  appCard.classList.remove("hidden");
  usuarioLogadoEl.textContent = `Logado como: ${usuarioLogado.nome} (${usuarioLogado.perfil})`;
  mostrarMensagem("", "");
}

function sairLocal() {
  token = "";
  usuarioLogado = null;
  localStorage.removeItem("token");
  loginCard.classList.remove("hidden");
  appCard.classList.add("hidden");
  alternarAbaAuth("login");
  mostrarMensagem("", "");
  mostrarMensagemLogin("Faça login para continuar.", "sucesso");
}

function renderizarAgendamentos(agendamentos) {
  if (!agendamentos.length) {
    listaAgendamentos.innerHTML = "<li>Nenhum agendamento ainda.</li>";
    return;
  }

  const podeRemover = usuarioLogado && usuarioLogado.perfil === "admin";
  const itens = agendamentos
    .slice()
    .sort((a, b) => new Date(`${a.data}T${a.hora}`) - new Date(`${b.data}T${b.hora}`))
    .map((item) => {
      const botaoRemover = podeRemover
        ? `<button class="btn-remover" data-id="${item.id}" type="button">Remover</button>`
        : "";

      return `<li>
        <div><strong>${item.nome}</strong><br>${item.servico}<br>${item.data} as ${item.hora}</div>
        ${botaoRemover}
      </li>`;
    })
    .join("");

  listaAgendamentos.innerHTML = itens;
}

async function carregarAgendamentos() {
  try {
    const resposta = await fetch("/agendamentos", {
      headers: cabecalhosAutenticados()
    });

    if (resposta.status === 401) {
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

async function removerAgendamento(id) {
  try {
    const resposta = await fetch(`/agendamentos/${id}`, {
      method: "DELETE",
      headers: cabecalhosAutenticados()
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.mensagem || "Falha ao remover agendamento");
    }

    mostrarMensagem(dados.mensagem || "Agendamento removido com sucesso!", "sucesso");
    carregarAgendamentos();
  } catch (erro) {
    console.error(erro);
    mostrarMensagem("Erro ao remover agendamento.", "erro");
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

  const dataSelecionada = new Date(`${data}T${hora}`);
  const agora = new Date();

  if (Number.isNaN(dataSelecionada.getTime()) || dataSelecionada < agora) {
    mostrarMensagem("Escolha uma data e horario validos no futuro.", "erro");
    return;
  }

  try {
    const resposta = await fetch("/agendar", {
      method: "POST",
      headers: cabecalhosAutenticados(),
      body: JSON.stringify({
        nome,
        data,
        hora,
        servico
      })
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
    mostrarMensagem("Erro ao conectar com o servidor.", "erro");
  }
}

async function fazerLogin(event) {
  event.preventDefault();

  const usuario = document.getElementById("login-usuario").value.trim();
  const senha = document.getElementById("login-senha").value;

  if (!usuario || !senha) {
    mostrarMensagemLogin("Informe usuario e senha.", "erro");
    return;
  }

  try {
    const resposta = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, senha })
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.mensagem || "Falha no login");
    }

    token = dados.token;
    usuarioLogado = dados.usuario;
    localStorage.setItem("token", token);
    mostrarMensagemLogin("Login realizado com sucesso.", "sucesso");
    atualizarTelaLogada();
    carregarAgendamentos();
  } catch (erro) {
    console.error(erro);
    mostrarMensagemLogin("Usuario ou senha invalidos.", "erro");
  }
}

async function carregarSessao() {
  if (!token) {
    sairLocal();
    return;
  }

  try {
    const resposta = await fetch("/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!resposta.ok) {
      throw new Error("Sessao invalida");
    }

    usuarioLogado = await resposta.json();
    atualizarTelaLogada();
    carregarAgendamentos();
  } catch (erro) {
    console.error(erro);
    sairLocal();
  }
}

async function cadastrarUsuario(event) {
  event.preventDefault();

  const nome = document.getElementById("cadastro-nome").value.trim();
  const usuario = document.getElementById("cadastro-usuario").value.trim();
  const senha = document.getElementById("cadastro-senha").value;

  if (!nome || !usuario || !senha) {
    mostrarMensagemCadastro("Preencha nome, usuario e senha.", "erro");
    return;
  }

  try {
    const resposta = await fetch("/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, usuario, senha })
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.mensagem || "Falha ao criar conta");
    }

    cadastroForm.reset();
    document.getElementById("login-usuario").value = usuario.toLowerCase();
    document.getElementById("login-senha").value = "";
    mostrarMensagemCadastro(dados.mensagem || "Conta criada com sucesso.", "sucesso");
    mostrarMensagemLogin("Conta criada. Agora faca login.", "sucesso");
    alternarAbaAuth("login");
  } catch (erro) {
    console.error(erro);
    mostrarMensagemCadastro(erro.message || "Erro ao criar conta.", "erro");
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
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch (erro) {
    console.error(erro);
  } finally {
    sairLocal();
  }
}

loginForm.addEventListener("submit", fazerLogin);
cadastroForm.addEventListener("submit", cadastrarUsuario);
tabLogin.addEventListener("click", () => alternarAbaAuth("login"));
tabCadastro.addEventListener("click", () => alternarAbaAuth("cadastro"));
form.addEventListener("submit", agendar);
botaoLogout.addEventListener("click", fazerLogout);
listaAgendamentos.addEventListener("click", (event) => {
  const botaoRemover = event.target.closest(".btn-remover");

  if (!botaoRemover) {
    return;
  }

  removerAgendamento(botaoRemover.dataset.id);
});

carregarSessao();

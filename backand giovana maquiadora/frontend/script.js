const loginForm = document.getElementById("login-form");
const cadastroForm = document.getElementById("cadastro-form");
const tabLogin = document.getElementById("tab-login");
const tabCadastro = document.getElementById("tab-cadastro");
const painelLogin = document.getElementById("painel-login");
const painelCadastro = document.getElementById("painel-cadastro");
const mensagemLogin = document.getElementById("mensagem-login");
const mensagemCadastro = document.getElementById("mensagem-cadastro");

let token = localStorage.getItem("token") || "";

function alternarAbaAuth(aba) {
  const mostrarLogin = aba === "login";
  painelLogin.classList.toggle("hidden", !mostrarLogin);
  painelCadastro.classList.toggle("hidden", mostrarLogin);
  tabLogin.classList.toggle("is-active", mostrarLogin);
  tabCadastro.classList.toggle("is-active", !mostrarLogin);
  tabLogin.setAttribute("aria-selected", String(mostrarLogin));
  tabCadastro.setAttribute("aria-selected", String(!mostrarLogin));
}

function mostrarMensagemLogin(texto, tipo) {
  mensagemLogin.textContent = texto;
  mensagemLogin.className = tipo;
}

function mostrarMensagemCadastro(texto, tipo) {
  mensagemCadastro.textContent = texto;
  mensagemCadastro.className = tipo;
}

function irParaPainel(perfil) {
  if (perfil === "admin") {
    window.location.href = "/admin.html";
    return;
  }
  window.location.href = "/usuario.html";
}

async function fazerLogin(event) {
  event.preventDefault();

  const perfilSelecionado = document.getElementById("login-perfil").value;
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

    if (dados.usuario.perfil !== perfilSelecionado) {
      throw new Error("Tipo de acesso incorreto para esse login.");
    }

    token = dados.token;
    localStorage.setItem("token", token);
    mostrarMensagemLogin("Login realizado com sucesso.", "sucesso");
    irParaPainel(dados.usuario.perfil);
  } catch (erro) {
    console.error(erro);
    mostrarMensagemLogin(erro.message || "Usuario ou senha invalidos.", "erro");
  }
}

async function carregarSessao() {
  if (!token) {
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

    const usuarioLogado = await resposta.json();
    irParaPainel(usuarioLogado.perfil);
  } catch (erro) {
    console.error(erro);
    localStorage.removeItem("token");
    token = "";
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

loginForm.addEventListener("submit", fazerLogin);
cadastroForm.addEventListener("submit", cadastrarUsuario);
tabLogin.addEventListener("click", () => alternarAbaAuth("login"));
tabCadastro.addEventListener("click", () => alternarAbaAuth("cadastro"));
carregarSessao();

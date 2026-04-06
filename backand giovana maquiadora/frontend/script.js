function agendar() {
  const nome = document.getElementById("nome").value;
  const data = document.getElementById("data").value;
  const hora = document.getElementById("hora").value;
  const servico = document.getElementById("servico").value;

  fetch("http://localhost:3000/agendar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      nome,
      data,
      hora,
      servico
    })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.mensagem);
  })
  .catch(err => {
    console.error(err);
    alert("Erro ao conectar com o servidor");
  });
}



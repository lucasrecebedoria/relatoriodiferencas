// Lógica simulada de autenticação e cadastro
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Login efetuado (simulação).");
      // Aqui entraria lógica real Firebase Auth
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Usuário cadastrado com sucesso!");
      window.location.href = "index.html"; // Redireciona para login após cadastro
    });
  }
});

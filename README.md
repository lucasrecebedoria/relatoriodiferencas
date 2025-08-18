# Relatório de Diferenças — Move Buss

Site estático (HTML/CSS/JS) pronto para subir no GitHub Pages, usando Firebase Authentication, Firestore e Storage.

## Recursos atendidos
- Login, Logout e Alterar Senha (apenas quando logado).
- Cadastro de usuários (matrícula → e-mail automatizado `matricula@movebuss.local`).
- Coleção **usuarios** no Firestore; matrículas **6266, 4144, 70029** já identificadas como admins no primeiro login/cadastro.
- Coleção **relatorios** no Firestore com: data do caixa, valor folha (R$), valor em dinheiro (R$), sobra/falta (R$ calculado), observação, flags de pós-conferência e caminho da imagem.
- Campos em padrão brasileiro (datas e moeda BRL).
- Regras de visibilidade/ações:
  - **Admins**: criam, editam e excluem relatórios de quaisquer matrículas; podem escrever no *Pós conferência*, anexar/visualizar/excluir imagem; veem o **Resumo do Recebedor** com filtros, últimos 20 por matrícula (mais antigos só via filtro).
  - **Usuários**: visualizam apenas os relatórios de sua matrícula; últimos 15 visíveis por padrão; acesso de leitura ao *Pós conferência* e visualizar imagem.
- Itens de UI: degradê preto/cinza com textura fibra de carbono, detalhes verde-bandeira, botões estilo metal escovado. Logo no canto superior esquerdo.
- Rodapé: “desenvolvido por Lucas L Custodio, versão 1.0”.

## Como usar localmente
1. Coloque os arquivos em um servidor estático (GitHub Pages, Vercel static, etc.).
2. Edite `app.js` se desejar alterar admins iniciais (`ADMIN_MATS`) ou campos.
3. Garanta que o projeto Firebase (já fornecido) tenha Firestore e Storage ativados.

## Estrutura de dados
### usuarios (doc id = uid)
```json
{ "uid":"", "matricula":"6266", "nome":"", "role":"admin|user", "createdAt": <serverTimestamp> }
```
### relatorios (doc id = auto)
```json
{
  "data": <Timestamp>, "matricula":"6266",
  "valorFolha": 0, "valorDinheiro": 0, "sobraFalta": 0,
  "observacao":"",
  "posConferenciaTexto":"",
  "posConferenciaEdited": false,
  "posConferenciaImagePath": "posconferencia/<id>/<file>",
  "createdAt": <serverTimestamp>, "updatedAt": <serverTimestamp>,
  "createdBy": "<uid>"
}
```

## Regras sugeridas do Firestore/Storage
> Copie para **Rules** no console do Firebase ajustando conforme necessário.

**Firestore Rules (exemplo de referência)**
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isAdmin() {
      return isSignedIn() && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.role == 'admin';
    }
    match /usuarios/{uid} {
      allow read: if isSignedIn() && (uid == request.auth.uid || isAdmin());
      allow write: if isAdmin() || (isSignedIn() && uid == request.auth.uid);
    }
    match /relatorios/{id} {
      allow read: if isSignedIn() && (
        isAdmin() ||
        resource.data.matricula == get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.matricula
      );
      allow create, update, delete: if isAdmin();
    }
  }
}
```

**Storage Rules (exemplo de referência)**
```rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isSignedIn() { return request.auth != null; }
    function isAdmin() {
      return isSignedIn() && get(/databases/(default)/documents/usuarios/$(request.auth.uid)).data.role == 'admin';
    }
    match /posconferencia/{reportId}/{fileName} {
      allow read: if isSignedIn();
      allow write, delete: if isAdmin();
    }
  }
}
```

## Observações
- Para **Alterar Senha**, a tela usa reautenticação por senha atual e `updatePassword`.
- Os cálculos do **Resumo do Recebedor**:
  - **Valor geral recebido (Folha)**: soma de `valorFolha` no mês/ano selecionado.
  - **Saldo do mês**: soma de `(valorDinheiro - valorFolha)` no mês.
  - Lista com filtro “Todos / Somente sobras / Somente faltas”.
- No modal de *Pós conferência*, quando o admin salvar texto ou imagem, o relatório recebe a flag “**verificar pós conferência**”.

## Deploy no GitHub Pages
1. Crie um repositório e envie os arquivos.
2. Em *Settings → Pages*, selecione a branch `main` e diretório `/root`.
3. Acesse a URL publicada.

Boa utilização! 🚍

# MoveBuss - Relatório de Diferenças (v9)

## O que foi incluído
- **Login** e **Cadastro** em páginas separadas (**centralizados**, visual profissional).
- **Dashboard** com:
  - Gerar relatório (somente **admin**), com campo **Matrícula do Caixa**.
  - **Sobra/Falta** calculada automaticamente (Dinheiro − Folha).
  - **Pós Conferência** com texto (somente admin) e **anexo de imagem**.
  - Lista **minimizada** (data + matrícula) com **Esconder/Exibir**.
  - **Filtros**: por matrícula (admin) e por data (todos).
  - **Resumo do Recebedor** (admin): total de folha do mês, saldo e filtro de positivos/negativos. A lista de **todas as matrículas** é carregada da coleção `usuarios`.

## Coleções
- `usuarios/{uid}`: `{ matricula, nome, criadoEm }`
- `relatorios/{id}`: `{ matricula, dataCaixa(Timestamp), valorFolha:Number, valorDinheiro:Number, sobraFalta:Number, observacao:String, posTexto:String, posEditado:Boolean, imagemPath:String, criadoEm:Timestamp, createdBy:UID }`

## Regras Firestore
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Usuários (cadastro aberto, cada um gerencia o próprio doc; admins podem gerenciar todos)
    match /usuarios/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && (request.auth.uid == userId || isAdmin());
    }

    // Relatórios
    match /relatorios/{relatorioId} {
      // Leitura: admin vê tudo; usuário só o que é da própria matrícula
      allow read: if request.auth != null && ( isAdmin() || resource.data.matricula == userMatricula() );

      // Escrita: apenas admins criam/alteram/excluem
      allow create, update, delete: if request.auth != null && isAdmin();
    }
  }

  function userMatricula() {
    return request.auth.token.email.split('@')[0];
  }
  function isAdmin(){
    return request.auth.token.email in [
      "6266@movebuss.local",
      "4144@movebuss.local",
      "70029@movebuss.local"
    ];
  }
}

```

## Regras Storage
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Estrutura: posConferencia/{matricula}/{relatorioId}/{filename}
    match /posConferencia/{matricula}/{relatorioId}/{filename} {
      // Admin: pode tudo
      allow read, write, delete: if request.auth != null && isAdmin();

      // Usuário comum: pode LER somente se a pasta corresponder à própria matrícula
      allow read: if request.auth != null && request.auth.token.email.split('@')[0] == matricula;
    }
  }

  function isAdmin(){
    return request.auth.token.email in [
      "6266@movebuss.local",
      "4144@movebuss.local",
      "70029@movebuss.local"
    ];
  }
}

```

## Como rodar local
Sirva os arquivos via http (ex.: `npx http-server` ou `python -m http.server 8080`) e abra `index.html`.

## Observações
- Apenas **admins (6266, 4144, 70029)** podem criar/editar/excluir relatórios e editar o campo de **Pós Conferência**.
- Usuários comuns só **leem** relatórios da **própria matrícula**.
- As imagens são salvas em `posConferencia/{matricula}/{relatorioId}/...` para que as regras de Storage funcionem por pasta.

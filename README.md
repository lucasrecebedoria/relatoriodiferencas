# MoveBuss Relatórios

## Instalação
1. Instale Firebase CLI: `npm install -g firebase-tools`
2. Faça login: `firebase login`
3. Inicialize o projeto: `firebase init`
4. Suba para hosting: `firebase deploy`

## Regras Firestore
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /relatorios/{docId} {
      allow create, update, delete: if request.auth != null && request.auth.token.matricula in ['70029','6266','4144'];
      allow read: if request.auth != null && (request.auth.token.matricula in ['70029','6266','4144'] || request.auth.token.matricula == resource.data.matricula);
    }
  }
}
```

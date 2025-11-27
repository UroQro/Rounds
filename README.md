# UroRounds - Proyecto

## ⚠️ CONFIGURACIÓN CRÍTICA DE FIREBASE (Para evitar error "Missing or insufficient permissions")

Por defecto, la base de datos de Firebase viene bloqueada. Para que la app funcione, debes configurar las reglas de seguridad:

1. Ve a tu [Consola de Firebase](https://console.firebase.google.com/).
2. Entra a tu proyecto `rounds-75bc9`.
3. En el menú izquierdo, ve a **Firestore Database** > pestaña **Reglas (Rules)**.
4. **Borra todo** lo que hay y pega exactamente esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite lectura y escritura a cualquier usuario (incluso anónimos)
    // NOTA: Para producción real con datos sensibles, deberías restringir esto más adelante.
    match /artifacts/urorounds-prod/{document=**} {
      allow read, write: if true;
    }
  }
}
```

5. Haz clic en **Publicar**.

---

## Instalación Local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor:
   ```bash
   npm run dev
   ```

## Despliegue en Vercel

1. Sube este código a GitHub.
2. Importa el proyecto en Vercel.
3. ¡Listo! Las claves ya están integradas.

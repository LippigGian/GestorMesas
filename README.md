# Gestor Mesas

Aplicacion web hecha con React, TypeScript y Vite para gestionar mesas.

## Requisitos

Antes de correr el proyecto, asegurate de tener instalado:

- Node.js
- npm
- Git

Para verificarlo, podes ejecutar:

```powershell
node -v
npm -v
git --version
```

## Instalacion

Clonar el repositorio:

```powershell
git clone https://github.com/LippigGian/GestorMesas.git
```

Entrar a la carpeta del proyecto:

```powershell
cd GestorMesas
```

Si ya lo clonaste en esta carpeta:

```powershell
cd "C:\Users\GianL\OneDrive\Desktop\gestor mesas"
```

Instalar las dependencias:

```powershell
npm install
```

## Correr en desarrollo

Levantar el servidor local:

```powershell
npm run dev
```

Vite va a mostrar una URL en la terminal. Normalmente es:

```text
http://localhost:5173/
```

Abrila en el navegador para usar la aplicacion.

## Compilar para produccion

Generar la version final del proyecto:

```powershell
npm run build
```

La salida se genera en la carpeta `dist`.

## Previsualizar la build

Despues de compilar, podes previsualizar la version de produccion con:

```powershell
npm run preview
```

## Comandos disponibles

```powershell
npm run dev
```

Inicia el entorno de desarrollo.

```powershell
npm run build
```

Compila TypeScript y genera la build de Vite.

```powershell
npm run lint
```

Ejecuta ESLint para revisar el codigo.

```powershell
npm run preview
```

Sirve localmente la build generada.

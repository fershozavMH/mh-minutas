# MH Executive OS (Minutas)

Sistema único de reuniones, minutas, acciones, decisiones y bloqueos de Machinery Hunters. La IA solo propone; una persona aprueba.

## Stack

Next.js (App Router), React, TypeScript, PostgreSQL (Neon) con Prisma, better-auth, Anthropic SDK y Vitest. Hosting en Vercel.

## Empezar

```bash
npm install
cp .env.example .env.local   # llena DATABASE_URL
npm run dev
```

## Comandos

- `npm run lint`, `npm run typecheck`, `npm test`: lo que revisa CI.
- `npm run db:generate` y `npm run db:migrate`: Prisma.

## Reglas del producto

- La IA solo escribe propuestas pendientes; nada es oficial sin una persona.
- Nunca se borran entidades oficiales: se retiran o se reemplazan.
- La visibilidad por nivel se filtra en el servidor, en una sola capa de datos.
- Sin secretos en el repositorio.

## Ramas y versiones

- `main`: producción en Vercel. No se hace push directo; solo se fusiona `develop` cuando Fernando autoriza una liberación.
- `develop`: aquí van todos los commits, uno pequeño por tarea con su ID (por ejemplo `T-02: esquema de datos`).
- Versiones semánticas con etiquetas sobre `main` y una entrada por versión en `CHANGELOG.md`.
- Las migraciones de Prisma están versionadas en el repositorio; ninguna migración destructiva se aplica sin autorización.

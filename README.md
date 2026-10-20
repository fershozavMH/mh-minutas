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

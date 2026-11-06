# MH Executive OS (Minutas)

Sistema único de reuniones, minutas, acciones, decisiones y bloqueos de Machinery Hunters. La IA solo propone; una persona aprueba.

## Stack

Next.js (App Router), React, TypeScript, PostgreSQL (Neon) con Prisma, better-auth, Anthropic SDK y Vitest. Hosting en Vercel.

## Empezar

```bash
npm install
cp .env.example .env.local   # llena las variables (ver abajo)
npx prisma migrate deploy    # aplica las migraciones a la base
npm run db:seed              # niveles y estados de prueba, y el administrador inicial
npm run dev
```

### Variables de entorno

Todas se describen en `.env.example`. Nunca se suben valores reales; en producción van en las variables de Vercel.

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Base de datos PostgreSQL (Neon) |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Sesiones (better-auth) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Entrada con Google Workspace |
| `ANTHROPIC_API_KEY` | Propuestas de la IA; sin ella la app funciona y avisa que la IA no está configurada |
| `ANTHROPIC_MODEL`, `AI_DAILY_LIMIT` | Opcionales: modelo y tope de propuestas por persona en 24 h (30 por defecto) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME` | Primer administrador al correr el seed |
| `TEST_DATABASE_URL` | Rama de pruebas de Neon para las pruebas de permisos (si falta, se omiten) |
| `ENABLE_TEST_LOGIN`, `TEST_LOGIN_PASSWORD` | Solo local: entrada con contraseña para usuarios `prueba.*`; se ignora en producción |

## Comandos

- `npm run lint`, `npm run typecheck`, `npm test`: lo que revisa CI.
- `npm run db:generate` y `npm run db:migrate`: Prisma. Las migraciones son SQL escrito a mano en `prisma/migrations/`; se aplican con `npx prisma migrate deploy`.
- `npm run db:seed`: datos iniciales. `npm run db:test-passwords`: contraseñas de los usuarios de prueba (solo local).

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

## Pantallas

| Ruta | Quién | Para qué |
|---|---|---|
| `/reuniones`, `/reuniones/[id]` | Asistente (directivo en lectura) | Crear reuniones, cargar transcripts, pedir la propuesta de la IA y revisarla |
| `/acciones`, `/acciones/[id]` | Asistente (directivo en lectura) | Lista con filtros, edición, historial, retirar y reemplazar |
| `/personas` | Asistente y Administración | Registro de responsables |
| `/admin`, `/admin/catalogos` | Administración | Usuarios, niveles de visibilidad y estados de acción |
| `/ayuda` | Todos | Glosario y ayudas |

## Más documentación

- [Guía para las asistentes](docs/guia-asistentes.md)
- [Decisiones de arquitectura](docs/decisiones.md)
- [Cambios](CHANGELOG.md)

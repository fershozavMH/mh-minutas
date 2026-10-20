# Cambios

## Sin liberar

- T-01: base del proyecto (Next.js, TypeScript, Prisma, Vitest, CI).
- T-08b: ayudas contextuales (signo ?), página de ayuda y siguiente paso en Administración.
- T-08: tema Corporate Indigo en modo claro y oscuro, con botón para cambiarlo.
- T-07: prueba de permisos por perfil y nivel contra una rama de pruebas de Neon.
- T-06: capa de acceso a datos con filtro por nivel y registro de lecturas sensibles.
- T-05: alta de usuarios y edición de niveles para Administración (rutas y página /admin).
- T-04: inicio de sesión con Google (better-auth) restringido a los dos dominios y a personas dadas de alta.
- T-03: datos de prueba de niveles y estados, cliente de base de datos y seed.
- T-02: esquema de datos con usuarios, niveles, reuniones, fuentes, propuestas, acciones, historial y auditoría.

## T-09
- Crear reunión con título, fecha y nivel obligatorio (`/reuniones`, `POST/GET /api/meetings`).
- Solo asistentes crean, y solo en niveles activos hasta su máximo; cada alta queda en la auditoría.

## Entrada de prueba
- Correo y contraseña solo en local (`ENABLE_TEST_LOGIN=true`), solo para usuarios `prueba.*`; apagado siempre en producción.

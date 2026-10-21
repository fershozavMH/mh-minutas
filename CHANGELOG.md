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

## T-10
- Cargar transcript en una reunión (`/reuniones/[id]`, `POST /api/meetings/[id]/sources`): texto pegado o archivo .txt/.md/.vtt/.srt.
- Se guarda el texto normalizado y su huella SHA-256; el mismo texto en la misma reunión se rechaza.

## T-12
- Pedir propuesta a la IA por transcript (`POST /api/meetings/[id]/sources/[sourceId]/propose`): salida estructurada validada con zod, guardada como ReviewItem pendiente.
- Una reunión de nivel sensible se corta antes de crear el cliente de la IA; nada se envía.

## T-13
- Prueba de frontera: solo `data/proposals.ts` puede usar la IA y corta el nivel sensible antes de crear el cliente.
- El intento de enviar a la IA una reunión sensible queda en la auditoría (`AiBlocked`), sin contenido.

## T-14
- Revisar, editar, aprobar o rechazar las propuestas de la IA (`POST /api/review/[itemId]`).
- Aprobar una acción crea la acción oficial; la fecha de compromiso es obligatoria. Resumen, decisiones, riesgos y siguientes pasos aprobados pasan a la ficha oficial.
- Se conserva lo que propuso la IA y lo que editó la persona; una propuesta decidida no se vuelve a decidir.

## T-15
- Pantalla de acciones oficiales (`/acciones`, `/acciones/[id]`): lista, edición de título, responsable, fecha y estado, historial con valor anterior.
- Retirar (con motivo) y reemplazar acciones; nunca se borran. La fecha de compromiso no se puede vaciar.

## Revisión con casillas
- Las propuestas se seleccionan con casillas y se aprueban o rechazan con una sola barra; "Editar" abre los campos solo cuando hace falta.
- Una acción sin fecha no se puede seleccionar hasta tenerla. Si una propuesta falla, las demás se deciden igual y se avisa cuál falló.
- Los campos de texto son más anchos para que no corten títulos largos.

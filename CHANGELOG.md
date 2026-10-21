# Cambios

## Sin liberar

- Pendientes con tipo, prioridad, repetición, «agendar» y avances con fecha (requisitos tomados del modelo de referencia de Daray, 21 oct 2026). Tipos editables en Administración > Catálogos (siete iniciales en la migración). La lista filtra por tipo, urgentes y «solo lo que ya toca» (fecha de aparición). Migración `20261021230000_types_followups` (solo agrega tablas y columnas; reversa en el propio archivo).
- Aviso de acción repetida al aprobar una propuesta: si se parece a una acción existente (abierta o cerrada, de las que la persona ve), no se crea otra sin preguntar; se puede sumar como avance de la existente (las cerradas siguen cerradas) o crear una nueva. Nueva ruta POST /api/actions/[id]/followups.
- Alerta de temas sensibles antes de la IA: si el texto parece tratar contrataciones, bajas de colaboradores, créditos, sueldos, bonos y comisiones o conflictos internos y la reunión no es sensible, no se envía sin confirmar; se puede marcar la reunión como sensible o enviar de todos modos (queda en la auditoría). Nueva opción de subir el nivel de una reunión (solo hacia arriba) en PATCH /api/meetings/[id].
- Lo cerrado se archiva de la lista de acciones: las completadas o canceladas hace más de 7 días (según su último cambio) no salen, salvo con «Ver cerradas» o filtrando por un estado. Los filtros ahora siguen a la dirección cuando cambia por fuera (por ejemplo, el enlace «Acciones»).
- Estándar de 6 estados (Pendiente, En progreso, En revisión, En espera, Completado, Cancelado) en los datos de ejemplo; en Administración se pueden renombrar y reordenar estados y niveles. Los estados pueden pedir una nota (En espera y Cancelado): sin nota no se fijan, la nota se ve en la lista y se limpia al salir del estado, con historial. Migración `20261021210000_status_notes` (solo agrega columnas; reversa en el propio archivo).
- Botones rápidos de estado en la lista de acciones (pendiente, completado, cancelado): un clic, cambio inmediato y vuelta atrás si el servidor lo rechaza. Los estados se toman de los activos en Administración, sin atarse a un nombre. Solo para asistentes.
- Fecha de la reunión sugerida desde el texto: al cargar un transcript o minuta, si el encabezado trae una fecha distinta, se ofrece «Usar esa fecha» (nada cambia sin confirmar). Nueva ruta PATCH /api/meetings/[id] solo para la asistente dueña, con auditoría.
- Filtros de /acciones sin recargar la página: se aplican al cambiar (el responsable con una pausa de 400 ms), la lista se atenúa mientras se actualiza y el botón «atrás» los respeta.
- Carga visible en Personas y demás formularios: el indicador dura al menos 400 ms y se mantiene hasta que llegan los datos nuevos (hook `useBusy`).
- Documentación: README con variables y pantallas, guía para las asistentes y decisiones de arquitectura (ADR-001 a ADR-009).
- Indicadores de carga: botones que trabajan se atenúan, muestran un giro y no aceptan clics repetidos (alta de usuarios, niveles y estados, entrada y salida de sesión); aviso de espera en la propuesta de la IA.
- Revisión de seguridad y accesibilidad (parcial): tope diario de propuestas de la IA por persona (AI_DAILY_LIMIT, 30 por defecto), descarte de propuestas duplicadas por solicitudes simultáneas, cabeceras de seguridad, etiqueta en el campo de edición y encabezados de tabla con alcance.
- Administración de niveles y estados (/admin/catalogos y /api/admin/statuses): alta y desactivación, nada se borra; siempre queda un estado abierto activo.
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

## T-17
- Filtros en la lista de acciones: estado, compromiso (vencidas, próximos 7 días, sin fecha), reunión y responsable. Se suman a la visibilidad por nivel y nunca la reemplazan.
- La IA recibe la fecha de la reunión como referencia para convertir fechas dichas sin año («el viernes 23 de octubre») a AAAA-MM-DD; si es ambigua, devuelve null.

## T-22
- Registro de personas (`/personas`): nombre y correo opcional; se desactivan, no se borran. Asistentes y Administración las gestionan; el directivo solo consulta.
- El responsable de una acción se elige del registro (o se escribe un nombre nuevo). Al aprobar una propuesta de la IA se sugiere la persona si el nombre coincide con una sola.
- Migración `20261021190000_people`: tabla `Person` y columna opcional `Action.ownerId`. Reversible: no cambia ni borra datos existentes.

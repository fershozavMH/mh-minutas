# Decisiones de arquitectura

Formato: contexto, decisión y consecuencia. Una decisión nueva se agrega al final; no se reescriben las anteriores, se marcan como reemplazadas.

## ADR-001 La IA solo propone
- **Contexto:** la IA a veces saca cosas de contexto o se equivoca en cifras y fechas.
- **Decisión:** su salida se guarda como `ReviewItem` pendiente; solo una persona la aprueba y crea la entidad oficial.
- **Consecuencia:** hay una pantalla de revisión obligatoria; la IA nunca escribe datos oficiales.

## ADR-002 Nada oficial se borra
- **Contexto:** hay que poder explicar por qué cambió una fecha o un responsable.
- **Decisión:** las acciones se editan con historial, se retiran con motivo o se reemplazan. Personas, niveles y estados se desactivan.
- **Consecuencia:** no existen rutas de borrado para entidades oficiales.

## ADR-003 La visibilidad se filtra en una sola capa de datos
- **Contexto:** la información sensible no debe depender de que cada pantalla filtre bien.
- **Decisión:** `src/lib/access.ts` define qué ve cada perfil (asistente: lo suyo; directivo: lo de sus asistentes; administración: sin contenido), siempre hasta el nivel máximo. Las lecturas de nivel sensible se registran en la auditoría.
- **Consecuencia:** las rutas y pantallas consultan por esa capa; hay pruebas de permisos contra una rama de pruebas de Neon.

## ADR-004 Lo sensible nunca llega a la IA
- **Decisión:** el corte ocurre en `requestProposal`, antes de crear el cliente o enviar texto. El intento bloqueado se registra en la auditoría sin contenido.
- **Consecuencia:** una prueba verifica que no hay llamada de red ni con la clave configurada.

## ADR-005 Salida estructurada y validada, con tope de uso
- **Decisión:** la pregunta a la IA usa un esquema JSON y la respuesta se valida de nuevo con zod; si no cumple, se descarta. Cada persona tiene un tope diario (`AI_DAILY_LIMIT`) y cada llamada se registra antes de hacerla.
- **Consecuencia:** el gasto en la API tiene un máximo por persona; el modelo se cambia con `ANTHROPIC_MODEL` sin tocar código.

## ADR-006 Sin transacciones interactivas
- **Contexto:** el adaptador de Neon con Prisma no las usa en este proyecto.
- **Decisión:** las operaciones que deben ser atómicas usan reclamos con `updateMany` condicional y, si algo falla después, una compensación.
- **Consecuencia:** hay que mantener ese patrón en el código nuevo.

## ADR-007 Entrada solo con Google en producción
- **Decisión:** el acceso es con Google Workspace para los dominios permitidos y personas dadas de alta. La contraseña existe solo en local, con `ENABLE_TEST_LOGIN=true` y usuarios `prueba.*`, y se ignora en producción.
- **Consecuencia:** producción necesita su propio cliente de Google.

## ADR-008 Fechas
- **Decisión:** las fechas de reunión y de compromiso se guardan a mediodía UTC para que no cambien de día; «hoy» se calcula en la zona America/Hermosillo.

## ADR-009 Ramas y liberación
- **Decisión:** todo va a `develop`; `main` es producción y solo se fusiona con autorización explícita de Fernando. Migraciones destructivas, borrado de datos y envío de correos también requieren su sí.

## ADR-010 Alerta de temas sensibles antes de la IA
- **Contexto:** la reunión se marca con un nivel a mano; un texto sensible podría cargarse en una reunión que no lo es. La dirección dio una lista parcial de temas sensibles (21 oct 2026).
- **Decisión:** antes de enviar un texto a la IA, el servidor busca esos temas (`src/lib/sensitive-topics.ts`). Si aparecen y la reunión no es sensible, no se envía sin confirmación; la persona puede subir el nivel de la reunión (solo hacia arriba) o confirmar el envío, y la confirmación queda en la auditoría.
- **Consecuencia:** es una alerta con posibles falsos positivos, no una garantía; el nivel de la reunión sigue siendo la regla. La lista se edita en el archivo; «Créditos» está por aclarar.

## ADR-011 Estados que piden nota y archivo de lo cerrado
- **Decisión:** cada estado puede pedir una nota (`requiresNote`): En espera (qué se espera) y Cancelado (por qué). Sin nota no se fija el estado; la nota se limpia al salir y queda en el historial. Lo cerrado hace más de 7 días (por su último cambio) no sale en la lista salvo con «Ver cerradas».

## ADR-012 Acciones repetidas, tipos y avances
- **Contexto:** el modelo de referencia de Daray exige que una acción repetida en otra junta se sume como avance de la existente (llegó a recibir decenas de duplicadas), que lo cerrado no se reabra y que cada pendiente tenga un tipo (quién entrega y qué papel tiene quien da seguimiento).
- **Decisión:** al aprobar una acción, el servidor compara su título con las acciones visibles para la persona (similitud de palabras significativas, umbral 0.6, hasta 3 candidatas). Si hay parecidas y no se resolvió, responde `posible_duplicado` y la propuesta sigue pendiente. La persona elige sumar un avance (`FollowUp`, con fecha y reunión de origen; la acción no cambia de estado) o crear una nueva. Los tipos son un catálogo editable (`ActionType`), no una lista fija, y no llevan nombres de personas.
- **Consecuencia:** es una heurística: puede avisar de más o dejar pasar variantes muy distintas; la decisión siempre es de la persona. Solo compara contra las acciones que ella ve, para no filtrar información de otros niveles.

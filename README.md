# Personal Resolver Frontend

Frontend en **Angular** para consultar documentos colombianos (cédula o NIT) con un
único formulario. Muestra solo la información relevante de la persona o empresa
encontrada.

El backend es **Persona Resolver**, en el repositorio `personal-resolver`.

---

## Configuración del servicio

- **Horario de servicio: 7:00 a 17:00 (UTC−5)**, definido en
  `src/app/service-hours.ts`. Es el horario que anuncia la interfaz y con el que
  interpreta que el backend no responda.
- Las fuentes de la información solo se mencionan en la columna **Fuentes** del
  pie de página: RUI (DNP) y RUES. Ningún otro texto de la interfaz las nombra,
  y una prueba lo comprueba.

---

## Funcionalidades

- Consulta de **cédula** (persona) y **NIT** (empresa). El NIT se normaliza antes
  de enviarlo: se aceptan puntos, espacios y dígito de verificación.
- Resultado separado por tipo:
  - **Persona:** nombre, cédula, género, edad, departamento y residencia
    registrados.
  - **Empresa:** razón social, NIT, tipo de empresa, estado y ciudad.
- Metadatos de consulta: cuántas veces se ha consultado el documento con la misma
  información y la fecha de la consulta anterior (o de la primera).
- Disponibilidad del servicio, en la cabecera y en el aviso de horario, siempre
  con el mismo estado (ver abajo).
- Un tratamiento distinto para cada estado del panel de resultado: inicial (qué
  datos mostrará), consultando, persona, empresa, sin resultados, error de la
  consulta (con "Reintentar"), servicio no disponible y fuera de horario. Los
  datos no válidos, incluido un `400` del backend, se indican junto al campo.
- Si el resultado queda debajo del pliegue, la página se desplaza lo justo para
  mostrarlo.
- Secciones de apoyo: cómo se usa y preguntas frecuentes. Describen lo que hace
  el código; ninguna nombra las fuentes.

## Disponibilidad

La cabecera y el aviso de horario muestran un único estado, que combina el
horario con lo que responde `GET /api/health`:

| Estado | Cuándo |
|---|---|
| **Verificando…** | Todavía no se ha comprobado el backend. |
| **Disponible** | `/api/health` responde `{"status":"UP"}`. Muestra cuánto falta para el cierre, o "Fuera del horario habitual" si el backend responde fuera del horario. |
| **No disponible** | El backend no responde dentro del horario. |
| **Fuera de horario** | El backend no responde fuera del horario. Muestra cuánto falta para que abra. |

El backend se comprueba al cargar la página, cada 30 segundos mientras está
visible, y al volver a la pestaña.

Al consultar:

- Si ya se sabe que el backend no responde, se vuelve a comprobar antes de enviar
  la consulta; si sigue sin responder, se informa que el servicio no está
  disponible sin consultar.
- Si la consulta falla, se contrasta con `/api/health`. Solo se muestra como
  error de la consulta (no encontrado, datos no válidos…) si el backend confirma
  que está arriba. Si no, la respuesta no vino del backend sino de algún
  intermediario (el proxy, un túnel u otro servicio) y se muestra **"El servicio no
  está disponible en este momento"**, o **"El servicio está fuera de horario"**
  con el horario y cuánto falta para que abra.
- Los mensajes de error son propios del frontend: los del backend nombran las
  fuentes.

El horario se expresa en UTC−5 para que se entienda desde cualquier país. Si quien
consulta está en otra zona horaria, también se muestra convertido (por ejemplo,
"En tu zona horaria: 14:00 – 0:00 (UTC+2)"). La lógica está en
`src/app/service-hours.ts`.

La página se prerenderiza: la hora y el estado del backend solo se calculan en el
navegador, después de la hidratación, para que el HTML no congele la hora del
build.

---

## Diseño

- **Tokens** en `src/styles.css`, dentro de `@theme static` de Tailwind CSS 4:
  colores, tipografía, radios y sombras. Los componentes los leen con `var()`.
- **Paleta:** base neutra (blanco, gris de banda, tinta casi negra) y, como
  acento, el tricolor colombiano. El amarillo de la bandera solo se usa como
  relleno con texto oscuro encima; para texto hay una versión oscura que cumple
  el contraste AA.
- **Tipografía:** Inter variable con eje óptico, incluida en el proyecto con
  `@fontsource-variable/inter` (licencia OFL); los navegadores solo descargan el
  subconjunto latino. Las etiquetas y metadatos usan la monoespaciada del
  sistema.
- **Movimiento:** solo transiciones cortas al cambiar de estado, el indicador
  del selector y la apertura de las preguntas. Con `prefers-reduced-motion` se
  desactivan, incluido el desplazamiento suave.
- Sin modo oscuro: la interfaz declara `color-scheme: light`.

---

## Despliegue

Pensado para **Vercel**. La aplicación siempre llama a rutas relativas
(`/api/lookup`, `/api/health`) y Vercel reescribe `/api/*` hacia el backend en su
CDN, así que no hay CORS de por medio.

```text
Navegador ──► Vercel ──rewrite /api/*──► BACKEND_URL
```

La dirección del backend **no está en el repositorio**: `vercel.ts` la toma de la
variable de entorno `BACKEND_URL` al compilar. Hay que definirla en el proyecto de
Vercel (*Settings → Environment Variables*), **solo para Production**:

```text
BACKEND_URL=https://backend.example.com
```

- **Production:** si falta, el build falla con un mensaje claro en vez de publicar
  un sitio sin backend. Si cambia, hay que volver a desplegar.
- **Preview** (pull requests, incluidos los de forks): sin la variable, el sitio se
  publica sin conexión al backend; la interfaz funciona y muestra el servicio como
  no disponible. Así los previews no conocen la dirección del backend. Además,
  con *Git Fork Protection* activo (lo está por defecto), los PR de forks esperan
  tu aprobación antes de desplegarse.

Para ver la configuración resultante sin desplegar:

```bash
BACKEND_URL=https://backend.example.com npx @vercel/config compile
```

Comprobación de punta a punta, ya desplegado:

```bash
curl https://<tu-proyecto>.vercel.app/api/health    # {"status":"UP"}
```

---

## Contrato con el backend

### `POST /api/lookup`

```json
{ "documentType": "CEDULA", "documentNumber": "12345678" }
```

```json
{ "documentType": "NIT", "documentNumber": "891408584" }
```

Respuesta `200` (persona):

```json
{
  "documentType": "CEDULA",
  "documentNumber": "12345678",
  "source": "RUI",
  "status": "FOUND",
  "entityType": "PERSON",
  "person": {
    "documentNumber": "12345678",
    "fullName": "LAURA SOFIA GOMEZ TORRES",
    "gender": "Femenino",
    "state": "BOLÍVAR",
    "city": "TURBACO",
    "age": 43
  },
  "message": "Consulta realizada con éxito",
  "consultCount": 4,
  "firstConsultDate": "2026-09-15T21:08:40Z",
  "previousConsultDate": "2026-10-19T14:02:11Z"
}
```

Las fechas llegan en UTC y se muestran en la hora local del navegador. El campo
`source` no se muestra.

Errores que el frontend interpreta (siempre después de confirmar con
`/api/health` que respondió el backend):

| HTTP | Mensaje |
|---|---|
| `404` | No encontramos información para el documento consultado. |
| `400` | La solicitud no es válida. |
| Otro | No fue posible obtener la información en este momento. |

### `GET /api/health`

`{"status":"UP"}` cuando el backend está arriba. Cualquier otra respuesta, o
ninguna en 8 segundos, cuenta como no disponible.

---

## Desarrollo

Requisitos: Node.js 22.22.3+, 24.15+ o 26 (lo exige Angular CLI 22) y npm.

```bash
npm install
npm start          # http://localhost:4200
npm test
npm run build
```

En desarrollo, `src/proxy.conf.json` envía `/api` a `http://localhost:8099`, el
puerto por defecto con el que el `docker-compose.yml` del backend publica el
contenedor.

## Estructura principal

```text
src/
├── app/
│   ├── models/document.models.ts         # contrato con el backend
│   ├── services/document-api.service.ts  # /api/lookup y /api/health
│   ├── service-hours.ts                  # horario de servicio y zonas horarias
│   ├── document-format.ts                # "CC 12.345.678", "NIT 891.408.584"
│   ├── ui/brand.ts                       # marca
│   ├── sections/
│   │   ├── how-it-works/                 # "Tres pasos."
│   │   ├── faq/                          # preguntas frecuentes
│   │   └── site-footer/                  # pie: el único lugar con las fuentes
│   ├── app.ts                            # estado, disponibilidad y consulta
│   ├── app.html                          # encabezado, portada y consola
│   ├── app.css
│   └── *.spec.ts
├── proxy.conf.json
├── server.ts                             # servidor SSR de Angular
└── styles.css                            # tokens y estilos compartidos
vercel.ts                                 # rewrite /api/* hacia BACKEND_URL
```

## Relación con el backend

El backend guarda el estado actual en `persona` y `empresa`, y el historial de
respuestas en `consulta_documento` (PostgreSQL). El frontend muestra el estado actual
de la entidad y los metadatos de consulta; nunca el JSON crudo de la fuente.

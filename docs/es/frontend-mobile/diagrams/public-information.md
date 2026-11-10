# Navegación pública y recuperación

## Rutas y canales

```mermaid
flowchart TD
    Entrada["Footer / perfil / registro"] --> Centro["/legal"]
    Entrada --> Ayuda["/help"]
    Centro --> Terminos["/terms"]
    Centro --> Datos["/privacy y /cookies"]
    Centro --> Reglas["Comunidad, seguridad, moderación"]
    Centro --> Transparencia["Ranking y eventos/pagos"]
    Ayuda --> Busqueda["Búsqueda local de FAQ"]
    Ayuda --> Contacto["/contact"]
    Reglas --> Contacto
    Datos --> Contacto
    Contacto --> Form["Formulario → useSupportForm"]
    Contacto --> Correo["Correo directo: sin acuse de entrega"]
    Form --> Servicio["supportService"]
    Servicio --> Cliente["supportClient"]
    Cliente --> API["POST /support/requests"]
```

[Ver diagrama de «Rutas y canales» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-public-information-6a0dfc734bfe.svg)

Los documentos son públicos. Los términos vigentes se consultan al backend;
las otras políticas y FAQs se incluyen en el frontend. No hay llamadas IA. El mapa no cambia la autorización de catálogo privado o admin.

## Contacto: máquina de estados

```mermaid
stateDiagram-v2
    [*] --> Edicion
    Edicion --> Invalido: Faltan datos o exceden límites
    Invalido --> Edicion: Corregir
    Edicion --> Enviando: UUID nuevo para contenido nuevo
    Enviando --> Recibido: 202 y UUID coincidente
    Enviando --> Fallo: Red, servidor o recibo inválido
    Fallo --> Enviando: Reintentar mismo contenido y UUID
    Fallo --> Edicion: Modificar contenido
    Recibido --> Edicion: Nueva consulta
```

[Ver diagrama de «Contacto: máquina de estados» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-public-information-79a5a934e064.svg)

Durante Enviando no se admite otro submit. Fallo conserva el formulario.
Recibido significa aceptación durable; el envío externo ocurre después.

## Lecturas y estados visuales

```mermaid
flowchart TD
    Consulta["Consulta de lectura"] --> Respuesta{"Resultado"}
    Respuesta -->|Datos| Mostrar["Mostrar datos"]
    Respuesta -->|Vacío real| Vacio["Vacío contextual"]
    Respuesta -->|Error| Clasificar["Resolver estado sin texto interno"]
    Clasificar -->|401| Sesion["Recuperación de sesión existente"]
    Clasificar -->|403 / 404| Salida["Explicar y salir sin retry ciego"]
    Clasificar -->|429| Limite["Respetar retryAt si existe"]
    Clasificar -->|Red / timeout / 500 / 503| Reintento["Reintento explícito de lectura"]
    Limite --> Reintento
    Reintento --> Consulta
```

[Ver diagrama de «Lecturas y estados visuales» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-public-information-8b0f1107c940.svg)

La clasificación no limpia credenciales ni borra contenido cacheado. Mutaciones
de inscripción, pago y generación conservan su recuperación específica.

## Límites de render

Un error de render utiliza un límite independiente del resultado HTTP.
Reintentar reinicia esa superficie, no ejecuta una mutación de negocio desde
el componente de error. Ningún mensaje expone el stack o las credenciales.

Ver [contrato funcional](../../modules/support/architecture.md).

## Revisión contractual

```mermaid
stateDiagram-v2
    [*] --> Consultando
    Consultando --> Contenido: Revisión ya aceptada
    Consultando --> Revision: Falta aceptación
    Consultando --> Fallo: Red o contrato inválido
    Revision --> Confirmando: Casilla explícita y aceptar
    Revision --> Salida: Cerrar sesión
    Confirmando --> Contenido: Servidor confirma
    Confirmando --> Fallo: Error o versión cambiada
    Fallo --> Consultando: Recargar documento sin reenvío automático
    Fallo --> Salida: Cerrar sesión
```

[Ver diagrama de «Revisión contractual» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-public-information-4972ec009120.svg)

Legal, privacidad, ayuda y contacto quedan fuera de la barrera de aceptación.
Registro usa el mismo documento y envía la selección con el alta.

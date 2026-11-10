# Vinnot

Vinnot es una plataforma para descubrir y gestionar vinos. Reúne en un solo lugar
el catálogo de vinos, las bodegas, las rutas del vino y los eventos, con una
comunidad que reseña y comparte, herramientas para quienes organizan eventos y un
panel para el equipo que cuida el contenido.

Funciona en la web, en [vinnot.com](https://vinnot.com), y en una app móvil que
además permite escanear la etiqueta de un vino para encontrarlo en el catálogo.

## Qué se puede hacer

| Área | Qué ofrece |
|---|---|
| Vinos | Buscar y filtrar por tipo, región, país, bodega, cepa y puntaje; ver el detalle de cada vino |
| Escaneo de etiquetas | Desde la app, fotografiar una etiqueta y encontrar el vino en el catálogo, o proponerlo si no existe |
| Bodegas y regiones | Explorar bodegas con su ubicación, contacto y vinos, y las regiones vitivinícolas |
| Reseñas y comunidad | Reseñar vinos, comentar, dar likes, denunciar contenido y bloquear cuentas |
| Cava | Guardar los vinos propios con notas y puntajes personales |
| Rutas del vino | Recorrer rutas con sus paradas sobre el mapa |
| Eventos y entradas | Descubrir eventos, inscribirse, pagar con Mercado Pago y tener la entrada en el teléfono |
| Perfiles con IA | Leer perfiles de vino y comparaciones generados con inteligencia artificial |
| Notificaciones | Recibir avisos por push y email, y elegir cuáles |
| Compartir | Compartir vinos, eventos y rutas con un enlace que abre la web o la app |

## Quién la usa

| Rol | Qué puede hacer |
|---|---|
| Visitante | Crear una cuenta o iniciar sesión, leer las páginas públicas (ayuda, contacto, términos y políticas), enviar consultas a soporte y abrir la vista previa de un enlace compartido |
| Usuario | Recorrer el catálogo, las bodegas, las rutas y los eventos; reseñar, comentar, armar su cava, inscribirse a eventos, escanear etiquetas y proponer vinos |
| Partner | Además: publicar y gestionar sus propios eventos, sus inscripciones y sus cobros con Mercado Pago |
| Moderador | Revisar reseñas, comentarios, denuncias y vinos propuestos, y mantener el catálogo |
| Administrador | Todo lo anterior, más la gestión de usuarios y roles, los anuncios y las eliminaciones definitivas |

Los roles salen de
[`Role.java`](../../backend/src/main/java/com/vinnot/user/domain/valueobject/Role.java)
y los permisos de cada uno, de
[`SecurityConfig.java`](../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java)
y de los controladores de cada módulo.

## Cómo está hecha

| Parte | Tecnología |
|---|---|
| Web | React, Vite y TypeScript |
| App móvil | Expo y React Native |
| API | Spring Boot: un monolito modular con arquitectura hexagonal y CQRS lógico |
| Datos | PostgreSQL |
| Infraestructura | AWS para la API, la base de datos y la web (S3 + CloudFront); Cloudflare para el DNS, las imágenes (R2) y esta documentación |

## Cómo leer esta documentación

El libro va de lo general a lo técnico:

1. [Proyecto](project/README.md): objetivos, alcance, entregables, accesos y
   organización del repositorio.
2. [Presentación](presentation/README.mdx): la exposición oral del proyecto en
   diapositivas animadas, con la rúbrica y el enlace a cada tema.
3. [Manuales](manuals/README.md): cómo se usa Vinnot, por rol y plataforma.
4. [Videos](videos/README.md): demos y recorridos.
5. [Módulos](modules/README.md): cada parte del producto con sus casos de uso,
   requisitos, arquitectura y pruebas.
6. [Modelo de negocio](business/README.md): propuesta de valor, competencia, FODA,
   monetización, costos y proyección a escala.
7. [Arquitectura del sistema](architecture/README.md): cómo se conectan las partes
   y qué [tecnologías](architecture/technologies/README.md) se usan.
8. Detalle técnico por plataforma: [Backend](backend/README.md),
   [Web](frontend-web/README.md), [App móvil](frontend-mobile/README.md),
   [Infraestructura](infra/README.md) y [Diseño compartido](shared/README.md).
9. [Seguridad](security/README.md): cómo se protegen las cuentas, los datos y la plataforma.
10. [Calidad de software](quality/README.md): modelo de calidad, requisitos no
   funcionales, métricas y plan de pruebas.
11. [Primeros pasos](getting-started/README.md): cómo levantar el proyecto en local.
12. [Diagramas](diagrams/README.md): catálogo de todos los diagramas y dónde está cada uno.
13. [URLs importantes](important-urls/README.md) y [Cronograma](gantt/README.md).
14. [Gobierno](governance/README.md): cómo se trabaja en el repositorio.

[Read in English](../en/README.md)

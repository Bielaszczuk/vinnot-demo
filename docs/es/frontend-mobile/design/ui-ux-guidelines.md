# Lineamientos UI/UX mobile

> La guía visual completa de web y app (tokens, componentes, imágenes, layout, textos) es
> la [guía de diseño](../../shared/design/visual-system.md). Esta página conserva las reglas
> de comportamiento de la app; si difieren, mandan la guía de diseño y el código actual.

## Principios

- Claridad antes que decoración.
- Respuesta visible para cada acción.
- Jerarquía y espaciado consistentes.
- Controles cómodos para uso táctil.
- Estados recuperables ante red, permisos o proveedor.
- Paridad de intención con web, adaptada al contexto mobile.

## Layout

- Respetar safe areas superior e inferior.
- El contenido scrolleable agrega espacio suficiente para que la tab bar no tape
  acciones ni la última card.
- La selección de la navegación permanece dentro de sus límites visuales.
- Cards, formularios y listas usan spacing/tokens del theme.
- El teclado no debe ocultar el campo activo ni la acción principal.
- Los formularios en `BottomSheetModal` usan `fillParent` con `adjustResize` en
  Android e `interactive` en iOS. Gorhom omite el desplazamiento interactivo con
  `adjustResize` en Android. El scroll compartido vuelve a medir el campo activo
  cuando aparece el teclado y cambia el layout; al ocultarlo se restaura el panel.

## Controles

- Touch target mínimo: 44×44 puntos.
- Botones principales con texto completo; no truncar labels críticos.
- El área en blanco entre opciones no debe disparar otra opción.
- Una selección reemplazable muestra una acción clara para quitar/cambiar.
- Estados disabled mantienen contraste suficiente y explican por qué cuando es
  necesario.

## Feedback

| Estado | Presentación |
|---|---|
| Loading breve | Indicador local sin bloquear toda la pantalla |
| Operación larga | Progreso con etapa comprensible y cancelación |
| Vacío | Motivo y próxima acción válida |
| Error recuperable | Mensaje específico y reintento |
| Sin conexión | Mantener contexto y permitir reintentar |
| Éxito | Confirmación y navegación predecible |

## Animación

La animación tiene una relación semántica con el proceso: captura, análisis,
comparación, generación o finalización. Elementos no se superponen, las etapas son una representación de UI, no telemetría del proveedor.
El hook del journey coordina una duración mínima de presentación. Respetar preferencia de movimiento reducido.

El perfil IA y la comparación muestran en cada etapa una escena en acuarela, con la misma estética que el resto de las ilustraciones de la app, dentro de un aro que se completa a medida que avanzan las etapas. Cada escena se anima por partes y representa lo que hace la etapa: el sacacorchos descorcha la botella, el vino llena la copa, los aromas suben, un sorbo baja el nivel, la pluma escribe la nota de cata, las dos copas se sirven lado a lado, cae un racimo de uvas en cada platillo y la balanza oscila hasta equilibrarse, y una lupa examina un vino y después el otro. Cada etapa dura 1,8 s en el perfil y 2,5 s en la comparación, porque las respuestas tardan unos 10,4 y 11 s; así la última etapa empieza antes de que llegue la respuesta, dura al menos lo que tarda la pluma en escribir la nota y la espera mínima no supera esos tiempos. El gesto se reproduce una vez, con calma, y la escena queda quieta; solo la última etapa, la nota que se escribe, vuelve a escribirse con una pausa mientras llega la respuesta. Con movimiento reducido se muestra directamente la pose final y el aro completo, sin animación. Las capas viven en `frontend-mobile/assets/images/loading/`.

Las escenas siguen el tipo de cada vino (`wineSceneLook`): el tinto se sirve en copa Bordeaux y sale de una botella oscura; el fortificado usa la misma copa con un rubí más claro; el rosado usa su copa propia; el blanco, en copa tulipa, y el naranja y el de postre, en la misma copa con color ámbar; el espumante, en copa flauta con burbujas que suben. Las botellas de vinos que no son tintos son transparentes y dejan ver el color del vino. El chorro que llena la copa tiene el color del vino. El espumante no se descorcha con sacacorchos: se quita el bozal, el corcho salta y asoma un poco de espuma. En la comparación cada copa sigue a su vino, la lupa apunta a la copa de cada uno y en la balanza caen uvas tintas para tintos, fortificados y rosados, y blancas para el resto. Mientras el tipo del vino no se conoce, la escena dibuja un tinto. La nota que se escribe es igual para todos.

## Contenido e idioma

Los recursos de UI se mantienen en i18n; su consumo se verifica por componente. El idioma elegido por el usuario prevalece
sobre el dispositivo y se persiste. Contenido generado en backend se solicita en
el idioma activo; perfiles y comparaciones bilingües no se traducen en UI.

## Accesibilidad y QA

- VoiceOver/TalkBack para controles, imágenes informativas y estados.
- Contraste, texto ampliado, orientación y foco.
- Dispositivos compactos y grandes, iOS y Android.
- Red lenta/offline, permisos denegados y respuestas tardías.
- Capturas visuales para regresiones de navegación, cards y formularios.

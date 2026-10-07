# V5.1 — Transición ilustrada a “Fecha de vencimiento”

## Abrir y probar

Descomprimir todo el ZIP en una carpeta nueva. Cerrar el servidor anterior con Ctrl+C y ejecutar `npm start`. Abrir http://localhost:3000. La versión muestra V5.1.

Para ver la escena sin completar el nivel: **Recorridos → Ver transición al nivel 2**. También se puede repetir desde la pantalla final con **Ver la historia del viaje**. La vista previa no registra una victoria ni desbloquea contenido.

## Integración

Se conserva el juego V5. Al derrotar al guardián: fuegos de victoria → caminata de salida → fundido → cinemática → entrada al nivel 2.

La imagen aportada contiene seis viñetas. Se muestran por separado con zoom y desplazamiento suaves, lluvia superpuesta, variación tenue de luz, subtítulos y ambiente sonoro generado de volumen bajo. Se conserva la imagen original, sin redibujar personajes. Es una **cinemática ilustrada**, no una animación articulada del repartidor o la botella.

Duración aproximada: 18,2 segundos de reproducción activa. Escenas: emboscada, captura, encierro, viaje, llegada a El Molde y escape; luego aparece el título “Fecha de vencimiento”. El tono mantiene la amenaza de la captura.

- **Esc / P** o botón: pausar/continuar.
- **M** o botón Sonido: activar/desactivar. Respeta el volumen de Ajustes.
- **Saltar historia**: omite la secuencia y continúa una sola vez.
- Al cambiar de ventana, se pausa. Hay que pulsar Continuar al volver.
- Si el sistema solicita movimiento reducido, se desactivan el zoom, desplazamiento y lluvia añadidos.

La simulación y el ambiente musical del juego se detienen durante la cinemática. Sus sonidos se liberan al terminar o saltar. Si no se puede cargar la imagen, continúa a la pantalla pendiente para no bloquear la partida.

## Segundo nivel

El nivel 2 sigue pendiente de construcción. La secuencia acaba en el aviso existente, con opción de volver a jugar o regresar al inicio. La etiqueta de precio ya forma parte de la última viñeta; todavía no se incorpora como estado jugable.

El manejador `window.MilkLevels[2].start(payload)` y el evento `milk:level-transition` descritos en LEEME_V5.md ahora se ejecutan **después de completar o saltar la cinemática**, no antes. El título y el viaje no se consideran un nivel jugable nuevo.

## Archivos principales

- `js/cinema.js`: secuencia, encuadres, controles y audio.
- `assets/cinema/entrada-nivel-2.png`: imagen original aportada.
- `js/game.js`: conexión a la victoria y vistas previas.
- `style.css`: presentación de la cinemática.

## Verificación

Se conservan las 69 pruebas automáticas de V5. La integración se comprobó en Chromium: derrota mediante X, celebración, caminata, secuencia completa, entrega única al nivel siguiente, pausa, silencio, salto, repetición y vista previa. Capturas revisadas a 1280×720 y 844×390. Esto no equivale a probar un teléfono físico.

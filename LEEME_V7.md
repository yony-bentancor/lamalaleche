# LA MALA LECHE NEW — V7 / Fecha de vencimiento

> **V7 Premium:** las mejoras y correcciones de esta entrega están en `LEEME_V7_PREMIUM.md`.

Entrega completa que parte de la V5.1. Contiene el nivel 1, la cinemática ilustrada del camión y el nuevo nivel 2 jugable. No requiere motor externo ni proceso de compilación.

## Abrir desde Visual Studio Code

1. Descomprimí **todo el ZIP** en una carpeta nueva y abrí esa carpeta en Visual Studio Code. No ejecutes archivos dentro del ZIP.
2. En Terminal → Nueva terminal, ubicáte en la carpeta que contiene `package.json`.
3. Ejecutá:

```bash
npm start
```

4. Abrí **http://localhost:3000** en el navegador. La pestaña debe mostrar **V7 / Fecha de vencimiento**.
5. Para detener: `Ctrl+C` en esa terminal. No hace falta `npm install`: el servidor usa únicamente Node.js.

Si estabas ejecutando otra versión, detené su servidor primero. Si seguís viendo la anterior, verificá qué carpeta abrió la terminal y recargá con `Ctrl+F5`. Podés usar `http://127.0.0.1:3000` si localhost no responde.

El nivel 2 también funciona abriendo `index.html` directamente; se recomienda el servidor incluido para mantener un origen estable para los guardados.

## Entrar al nivel 2

- Menú principal → **Jugar nivel 2 · El Molde**. Empieza una partida nueva del supermercado.
- **Continuar nivel 2** aparece cuando existe una bandera guardada en ese navegador.
- Elegir recorrido → **Fecha de vencimiento** también entra directamente.
- Al derrotar al guardián del nivel 1: celebración, caminata, cinemática V5.1 y entrada automática a El Molde. Saltar la historia también entra al nivel 2.
- La opción de previsualizar la cinemática sigue disponible y vuelve al menú sin iniciar una partida.

## Controles

| Acción | Tecla |
| --- | --- |
| Mover | Flechas izquierda/derecha o A/D |
| Correr | Shift |
| Saltar | Espacio o Z; mantener para subir más |
| Agacharse / deslizar | Flecha abajo o S |
| Disparar | **X**; mantener para disparar repetidamente |
| Pausa | Esc o P |
| Sonido | M o botón de nota musical |
| Pantalla completa | F |

En celular o tableta se muestran controles táctiles; se recomienda jugar en horizontal. Al cambiar de pestaña o perder foco se pausa el nivel y su reloj. La pausa permite cambiar volumen, sonido y efectos, volver al checkpoint o salir al inicio.

## El recorrido

12 fondos originales, en el orden del ZIP aportado. Se prepararon copias WebP de alta calidad para cargar más rápido. La línea de suelo se alinea a 520 unidades lógicas; el personaje, los enemigos, cajas y plataformas usan el mismo sistema de coordenadas.

| Fondos | Tramo | Interacciones y ambientación |
| --- | --- | --- |
| 1–3 | Descarga | Pallets flotantes, cajas rompibles, carrito móvil, yogur y queso, lluvia en las zonas abiertas, reflejos y stickers de tiempo. |
| 4–6 | Depósito | Estantes y elevadores, cintas, repositores, moho, esporas desde el techo y cortes de luz con iluminación de la botella. |
| 7–9 | Salón de ventas | Tarimas de verdulería, góndolas flotantes, cucaracha y moscas, monedas, escudo, UHT y oferta 2×1. |
| 10–12 | Lácteos y cajas | Puertas de heladera, chocolatada, cintas rápidas, última bandera y batalla contra la Caja Registradora. |

Hay 33 plataformas principales de anchuras diferentes, más estantes laterales, tres elevadores móviles, cajas y plataformas temporales del jefe. Las subidas principales se verifican con la física real del personaje. Los estantes altos ofrecen premios; el piso permite seguir avanzando sin exigir todos los saltos.

Las plataformas son flotantes, sin pilares. Los pallets y cajas reutilizan detalles de textura de los propios fondos. Los estantes metálicos, cintas y tarimas tienen sombras de contacto, borde superior legible y paletas propias del tramo.

## Mecánicas

- **Vencimiento:** comenzás con 12 días. Un día equivale a 16 segundos de simulación. Los stickers verdes suman 3 días; tope de 40. En cero perdés energía gradualmente, sin reinicio inmediato ni empujones. El reloj se detiene en pausa y al ganar.
- **Energía:** el vidrio muestra grietas desde 60%; en cero se rompe y vuelve a la bandera. Los impactos físicos tienen invulnerabilidad breve para evitar daño repetido por el mismo contacto.
- **Intoxicación:** yogur y moho pueden contaminar la leche. Cambian los sprites y la energía disminuye lentamente. Una recarga o bandera restaura la leche. Las heladeras enfrían y empujan; no sustituyen a la recarga.
- **Monedas:** dan puntos; cada 20 recuperás 20 puntos de energía.
- **Recarga:** restaura energía y quita intoxicación.
- **Escudo:** absorbe un golpe.
- **2×1:** clon durante 14 segundos; repite el recorrido con retraso y puede pisar enemigos. No dispara ni recoge premios por duplicado.
- **Chocolatada:** durante 20 segundos usa sus sprites de disparo y proyectiles de 20 puntos de daño.
- **UHT:** invulnerabilidad durante 9 segundos y derrota enemigos vulnerables al contacto.
- **Etiqueta de precio:** la botella entra etiquetada. El repositor la detecta desde más lejos y corre más rápido. Las banderas retiran la etiqueta; ser atrapada vuelve a ponerla.
- **Cajas:** X las rompe. Se usan también para ocultarse del repositor agachándose cerca.
- **Cintas:** empujan físicamente a la botella. Los elevadores y carritos transportan al personaje apoyado.

### Enemigos

Se integraron tus dibujos de carrito, queso, yogur y moho. Las láminas no tienen una grilla uniforme: se seleccionaron poses completas por silueta para evitar cortar partes del personaje. Se usan 8 cuadros de carrito, 6 de queso, 8 de yogur y 8 de moho; las poses de ataque se cargan por separado. La lámina de ataque del queso queda preparada como recurso; su comportamiento sigue siendo rebote y resistencia al disparo, según la historia.

- **Carrito:** patrulla; es indestructible y se puede viajar encima. Un choque lateral resta 5.
- **Queso:** avanza a saltos; los disparos rebotan. Se derrota con pisotón.
- **Yogur:** patrulla lentamente, deja charcos y lanza contaminación con aviso previo. Pisotón o disparos.
- **Moho:** camina y emite esporas. Además hay manchas de techo. Conviene disparar o pasar protegido.
- **Repositor:** patrulla, detecta, persigue y devuelve la botella unos metros atrás. Ocultarse agachado cerca de cajas reduce la detección. Tiene un diseño auxiliar dibujado en Canvas.
- **Cucaracha:** corre y realiza tramos de ascenso; se derrota disparando.
- **Moscas:** se mueven en oscilación sobre frutas y ofertas. Se derrotan con disparos o UHT.

Repositor, cucaracha y moscas usan diseños procedurales auxiliares, ya que no se adjuntaron sus láminas. Se pueden reemplazar después sin cambiar la lógica. La cucaracha simula el ascenso; todavía no navega geometría arbitraria de paredes.

## Caja Registradora

Se añadió una ilustración nueva del jefe con tres estados: cerrado, lector activo y cajón abierto. Tiene aproximadamente el doble de altura visual de la botella. Las fases son:

1. **Lector:** aviso de 1,4 segundos. Alterna láser alto para agacharse y láser bajo para saltar. **5 puntos de energía por impacto**, como máximo una vez por pulso.
2. **Monedas:** lluvia de monedas que rebotan; al agotarse crean plataformas temporales de 3,5 segundos.
3. **Cajón abierto:** ventana de 4,3 segundos para atacar. Disparo normal: 10; chocolatada: 20; pisotón: 20. Cerrada es invulnerable.

Al ganar: luces y partículas de celebración, apertura del paso, caminata automática hacia la salida y resumen del nivel. Se guarda que el nivel 2 fue completado y se emite el evento `milk:level-transition` con `{from:2,to:3,...}`. **El nivel 3 aún no existe**: se deja preparada la salida narrativa a la ciudad.

## Presentación, sonido y accesibilidad

- Parallax del fondo a 0,90×, suelo a 1× y partículas de primer plano a 1,12×. El escenario se combina por zonas de solapamiento, sin huecos entre imágenes.
- Los fondos aportados son ilustraciones completas, no capas separadas originales. La profundidad se construye con capas compuestas, suelo, partículas y decorado interactivo. Los vehículos y personas pintados dentro del fondo no son esqueletos animados.
- Cámara suave con anticipación horizontal, seguimiento vertical al alcanzar plataformas y encuadre de batalla. La cámara permanece en la arena durante la celebración.
- Reflejo de la botella, sombras, lluvia, ondas, polvo, partículas, neblina, iluminación local durante apagones y señales visuales antes de los ataques.
- Sonido sintético suave, sin música externa ni descargas. Volumen compartido con el nivel 1; silencio mediante M. No hay voz ni banda sonora grabada.
- Respeta `prefers-reduced-motion`: reduce movimiento ornamental, partículas y sacudidas. La física jugable continúa funcionando.
- Interfaz de energía, fecha, puntuación, monedas, banderas, temperatura y estados. Las instrucciones aparecen por tramo; la barra del jefe explica cómo evitar cada ataque.

## Guardado

Las cuatro banderas guardan el punto de reaparición, objetos recogidos, enemigos derrotados, cajas rotas, puntaje y tiempo. Morir recupera la instantánea de la bandera; los premios recogidos después vuelven junto con la puntuación anterior, sin acumular monedas repitiendo la muerte.

Se usa `localStorage` del navegador. El progreso depende del navegador y la dirección usados; abrir con otro puerto o `file://` puede mostrar un guardado distinto. No hay cuenta ni guardado en la nube.

Claves nuevas: `milk-v7-level2` (checkpoint) y `milk-v7-progress` (victoria). Los guardados y ajustes anteriores se mantienen.

## Código y verificación

- `js/level2-core.js`: simulación y datos del recorrido; física fija a 120 Hz, sin DOM.
- `js/level2.js`: render, cámara, interfaz, audio, carga y ciclo de vida del nivel 2.
- `js/level2-assets.js`: catálogo de poses de enemigos y jefe.
- `level2.css`: interfaz del supermercado.
- `assets/level2/`: 12 fondos optimizados y poses transparentes.
- `tests/level2.test.cjs`: 28 pruebas nuevas.
- `js/game.js`: conexión de V5.1 con el nuevo nivel; el nivel 1 deja de simularse y dibujarse mientras está activo el 2.

```bash
npm test
```

97 pruebas de lógica: 69 existentes + 28 del nivel 2. Cubren ascensos, salto variable, energía, vencimiento, proyectiles, carrito, escudo, guardado, cintas, heladeras, clon, apagones, fases y salida del jefe.

Además se verificó en Chromium: entrada directa, teclas reales de movimiento/salto/disparo, pausa y silencio, persistencia de bandera, carga de los 12 escenarios, apagón, clon, combate con proyectiles reales, celebración, salida, enlace desde la victoria del nivel 1 y controles táctiles en una pantalla horizontal emulada. En el ensayo automático del recorrido y jefe se usó el modo de desarrollo para posicionar a la botella y evitar interrupciones por muerte. No se detectaron errores de JavaScript ni archivos faltantes.

No se ha probado en dispositivos móviles físicos ni en todas las GPU/navegadores. El tamaño de presentación se adapta, pero el ritmo y dificultad pueden seguir afinándose con partidas tuyas.

Para pruebas locales existe `?dev` y `MilkLevel2.dev`; las herramientas de desarrollo no están habilitadas en la dirección normal.

Los documentos V5 y V5.1 se conservan como historial. Este documento describe la entrega actual y reemplaza las menciones anteriores de que el nivel 2 estaba pendiente.

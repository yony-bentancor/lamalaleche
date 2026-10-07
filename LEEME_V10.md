# LA MALA LECHE — V10 · Nivel 4 «Por las nubes»

Basado en tu V9.1. No se quitó nada de los niveles 1, 2 y 3. Se suma el **nivel 4 completo**, jugable desde el último techo hasta el Capitán Cúmulo, con tus 12 fondos, la variante despejada del fondo 12, tus 5 láminas del paraguas y tus láminas del jefe final.

## Abrir

Descomprimí el ZIP. Adentro hay una sola carpeta: `LA MALA LECHE V10`. Detené cualquier servidor anterior (Ctrl+C) y, dentro de la carpeta:

```bash
npm start
```

Abrí http://localhost:3000. En Windows también podés usar `INICIAR.bat`.

El nivel 4 se abre de tres formas:

- **Menú → «Jugar nivel 4 · Por las nubes»** (y «Continuar nivel 4» después de tocar una boya).
- **Elegir recorrido → tarjeta «Por las nubes»**.
- **Al ganar el nivel 3**: ahora pasa el dirigible de reparto sobre la azotea, y el botón «JUGAR NIVEL 4» continúa con el puntaje acumulado. El camión del final anterior se reemplazó por el dirigible, para que la historia siga como la escribiste.

## Controles nuevos

| Acción | Tecla |
|---|---|
| Abrir el paraguas y planear | **Mantener ESPACIO en el aire** |
| Cerrar el paraguas y caer rápido | Soltar ESPACIO |
| Resistir una ráfaga | ↓ (agachada) |
| Volar (solo en la arena del jefe) | **↑** con el paraguas abierto |
| Disparar leche, también planeando o volando | X |

En pantallas táctiles se agrega el botón **↑**.

## El paraguas (tus 5 láminas)

- **Abrir:** la etiqueta azul se despega y se convierte en paraguas (5 cuadros).
- **Planear:** cae despacio y se balancea con el viento (4 cuadros).
- **Viento fuerte:** el paraguas se tuerce. Si te pega un rayo o el rayo del jefe, **se rompe** durante 4 segundos y frena mucho menos (3 cuadros).
- **Aterrizar:** camina mientras el paraguas vuelve a ser etiqueta (4 cuadros).
- **Ráfaga en el piso:** la botella se planta contra el viento con el paraguas (3 cuadros).
- **Corrientes ascendentes:** con el paraguas abierto, el vapor, las térmicas y las hélices del puerto te suben.
- **Escudo:** el paraguas abierto ataja las gotas del nubarrón y el granizo.
- Al planear, se conserva el impulso de la carrera.

## Física del viento: todo el nivel se puede terminar

- **18 huecos** en el piso. Caer quita **15 %** y te devuelve al último apoyo seguro. Ninguno supera lo que permite el paraguas: las pruebas cruzan los 18.
- **Brisa a favor** en la pasarela de carga.
- **Corredor de las ráfagas:** 4,2 s de calma, 1 s de aviso (las mangas de viento se inflan y aparece «¡RÁFAGA!») y 2,2 s de viento fuerte en contra. Agachada casi no te mueve. Durante la ráfaga plena, sin paraguas no se cruzan los huecos; con paraguas y carrera, sí.
- **Tormenta:** viento variable. En el último amarre, la tormenta aspira hacia adelante en pulsos.
- El HUD muestra la **altitud** y el **viento** (dirección y fuerza).

## Los 12 fondos y sus efectos

| # | Fondo | Qué se mueve |
|---|---|---|
| 1 | El último techo | Neón del cartel, vapor, luces de antenas, ventanas, **dirigible con cuerda**: saltá para engancharte |
| 2 | La ciudad bajo los pies | Las cargas pintadas se mecen; cajas colgantes como plataformas |
| 3 | La primera corriente | Hebras de vapor en espiral, partículas doradas, **corriente ascendente** |
| 4 | Un océano blanco | Tres capas de nubes; **nubes que se hunden** al pisarlas |
| 5 | Los molinos del aire | Aspas girando, cascadas, hojas; islas flotantes con ruta alta y baja |
| 6 | El corredor de las ráfagas | Mangas de viento, faroles, tormenta violeta que late |
| 7 | La frontera oscura | Sol a la izquierda, lluvia y relámpagos a la derecha, **rayos con aviso** y techitos-refugio |
| 8 | El cementerio de los dirigibles | Niebla, faroles, hélices quietas, **tablones que ceden** |
| 9 | El ojo de la tormenta | Haz de luz, partículas, boyas que titilan; bandera y recarga |
| 10 | El puerto suspendido | Hélices, faroles, grúa con carga móvil, **hélices que soplan por los huecos** |
| 11 | El último amarre | Papeles aspirados, faroles que fallan, la nube que «respira» |
| 12 | El Capitán Cúmulo | Remolino de tormenta, hélices laterales; al ganar se funde con el **fondo 12B despejado** |

Los huecos muestran el cielo de atrás, con bordes según el material del piso: nube, tablón roto, techo o muelle metálico.

## Enemigos (reemplazables desde el Catálogo de diseños)

- **Gaviota del puerto:** patrulla planeando y se tira en picada si pasás debajo. Se pisa.
- **Nubarrón gruñón:** te sigue desde arriba y suelta gotas. El paraguas las ataja. Si lo pisás, rebota como trampolín.
- **Dron cartero:** el ayudante del Capitán. Dispara chispas apuntadas. Se vence con tres disparos o un pisotón.
- **Globo meteorológico con púas:** un globo viejo de la estación del cielo, con púas de bronce, que sube y baja sobre los huecos. No se puede pisar: hay que calcular el salto o reventarlo con un disparo de leche.
- **Chispa de tormenta:** corre por el piso en la tormenta. Electrocuta, incluso si la pisás. Solo se apaga con leche.

Para cambiarlos, guardá imágenes con estos nombres: `assets/custom/gaviota-0.png`, `nubarron-0.png`, `dron-0.png`, `globo_pinchos-0.png` y `chispa-0.png`.

## El Capitán Cúmulo (tus láminas)

Es un robot cartero con hélice que maneja la tormenta. Usa tus cuadros de vuelo (8), ataque (8), rayo (8) y derrota (7), y tu retrato en el cartel de presentación.

- **Rayo:** carga, te apunta a tu altura y, al 70 % de la carga, **destella y fija la puntería**. En ese momento hay que cambiar de altura: volar con ↑ o bajar de una viga. El rayo quita **15 %**.
- El rayo cambia de color en cada fase, con tus 8 cuadros: cian y azul, violeta y rosa, rojo y naranja.
- **Fase II (66 %):** granizo y ráfagas de su hélice.
- **Fase III (33 %):** rayos de tormenta y doble descarga.
- Después de disparar, los **cañones quedan recalentados** y la leche le hace el doble.
- La leche le quita **1 %** (2 % recalentado; el doble con chocolatada). En simulación, con puntería perfecta, la pelea dura unos 45 segundos.
- **Volar:** en la arena, ↑ con el paraguas abierto te eleva mientras dure la barra de **VUELO**, que se recarga en el piso.
- **Victoria:** explosión con tus cuadros, el remolino se abre, entra el sol y el cielo cambia al fondo 12B. La botella corre al borde y baja planeando hacia **Granja La Esperanza**. Queda enganchado el nivel 5.

## Música y sonido

Tres temas nuevos: cielo abierto, tormenta y pelea con el Capitán. Sonidos nuevos: paraguas al abrir y cerrar, gaviotas, chispas, trueno cercano, aviso de rayo, granizo, nubes que se deshacen, tablones, cuerda, corrientes, carga y descarga del rayo, hélice.

## Tamaño del ZIP

Para que todo entre en un solo ZIP de menos de 30 MB, los cuadros de la vaca del nivel 3 pasaron a WebP de alta calidad, igual que los demás sprites. No se nota en pantalla.

## Verificado

- `npm test`: todas las pruebas anteriores y **19 nuevas del nivel 4**. Cubren el paraguas, los 18 huecos, las ráfagas, las corrientes, las caídas, la cuerda, las nubes que se hunden, los rayos y refugios, el granizo, las reglas del Capitán, el esquive del rayo volando, la barra de vuelo, las fases, el final, el guardado y un recorrido automático completo.
- Recorrido automático hasta la arena en unos 35 segundos de juego. La pelea simulada se gana en unos 46 segundos.
- Capturas en el navegador de los 12 fondos, los huecos, la cuerda, el planeo en corriente, la ráfaga, cada fase del jefe, la explosión, el cielo despejado y la pantalla final. Sin errores en consola.
- 60 cuadros por segundo en todas las zonas, medidos en un navegador sin aceleración gráfica.
- Se probó el paso del nivel 3 al nivel 4 con el puntaje acumulado.

## Archivos

Nuevos: `js/level4-core.js` (lógica), `js/level4.js` (dibujo, HUD y efectos), `js/level4-sky.js` (animación de los fondos), `js/level4-assets.js` (cuadros y medidas), `level4.css`, `assets/level4/`, `tests/level4.test.cjs` y este archivo.

Modificados: `index.html` (menú, tarjeta y scripts), `js/game.js` (conexión y botones), `js/level3-core.js` y `js/level3.js` (final con el dirigible y botón al nivel 4), `tests/level3.test.cjs` (prueba del nuevo final), `js/music.js` (3 temas), `js/sfx.js` (sonidos), `js/designs.js` (5 enemigos), `package.json` y `server.cjs` (V10).

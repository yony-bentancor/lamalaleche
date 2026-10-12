# La Mala Leche V12 · Nivel 5 «Bajo la superficie»

El nivel 5 dejó de ser un prólogo: ahora es un nivel completo bajo el agua, con 12 escenarios, enemigos, banderas y jefe final.

## Cómo se juega bajo el agua
- **Caminar** por la arena con ← →. Al caminar rápido se levanta arena del fondo.
- **SALTAR** desde el piso salta, y en el agua cada toque es una **brazada**: tocá varias veces para nadar hacia arriba. Mantenerlo apretado hace flotar más.
- **↓** bucea (te hundís más rápido). **SHIFT** nada y camina más rápido.
- **X** dispara leche, que bajo el agua frena antes.
- **C** activa el **TORBELLINO**, que se puede usar **una sola vez en todo el nivel**. Durante unos 4 segundos la botella es invencible, se mueve libre con ↑ ↓ ← →, arrasa con los enemigos, atrae las perlas y le pega fuerte al jefe.
- En el celular hay un botón 🌀 para el torbellino.

## Los 12 fondos
Naufragio → cubierta hundida → barco partido → paraguas del fondo → **el abismo** → velas rotas → cementerio de cascos → faro sumergido → jardín de coral → **el lomo de la bestia** → **el Tragabarcos** → la superficie.
- **El abismo (fondo 5):** se cruza nadando. Una corriente tira hacia abajo, y caer al fondo quita 15 % y te devuelve a la orilla. Hay unos ojos ámbar que se abren una sola vez.
- **El lomo (fondo 10):** el suelo respira y lanza chorros de burbujas que te suben.
- **Corrientes:** cada tanto una ráfaga arrastra a la botella, las partículas y las algas. Se resiste corriendo o agachándose.
- Hay 4 boyas-bandera que guardan la partida y recargan la energía.

## Enemigos (con tus imágenes)
| Enemigo | Dónde | Cómo resta |
|---|---|---|
| Medusa-lámpara | zonas con luz y sobre el abismo | flota subiendo y bajando, quema al tocarla; se aplasta saltándole encima |
| Cangrejo de la tetera | arena (fondos 3, 4, 10 y 12) | patrulla y pellizca; si le saltás encima se esconde en la tetera y ahí la leche rebota |
| Almeja de la dentadura | arena (fondos 3, 4, 9 y 12) | quieta; si pasás por encima se cierra de golpe; solo se le puede disparar abierta |
| Morena del ojo de buey | cascos (fondos 2, 3, 6 y 7) | sale disparada del ojo de buey y vuelve a esconderse |
| Pez globo de los cubiertos | zonas con luz | se infla al acercarte y dispara un cubierto en cada dirección |
| Pulpo del sombrero de copa | fondos 6, 8, 9 y 10 | tira nubes de tinta que tapan la vista y pega con el paraguas de cerca |
| Crías del Tragabarcos | zonas oscuras | persiguen tu luz; anticipan al jefe |

## El Tragabarcos (jefe)
Sube desde el abismo y alterna cuatro ataques: **embestida** (el farol avisa parpadeando y conviene subir o bajar nadando), **succión** (abre la boca y aspira; todo se inclina hacia él), **burbujas** que persiguen y, en la **fase II**, **crías**.
- El **farolito** y la **boca abierta** reciben el triple de daño. El cuerpo recibe daño normal.
- El torbellino le quita mucha vida.

## Efectos del agua
Capas con profundidad (niebla lejana, plano medio, algas propias y siluetas oscuras en primer plano), haces de luz animados y desfasados, cáusticas sobre la arena (más fuertes cerca de la superficie), nieve marina en dos capas, burbujas que salen de grietas y barcos, nubes de arena, polvo que brilla solo dentro de los haces, distorsión ondulante del fondo, algas que se mecen con la corriente, corrección de color y viñeta por tramo, luz propia de la botella en las zonas oscuras y temblores de la bestia cada vez más seguidos.

También hay toques de humor: un paraguas que gira solo, una burbuja gigante con una zapatilla adentro y peces haciendo fila para entrar a un ojo de buey (uno se cuela).

**Calidad automática:** si el equipo no llega a mover todos los efectos, el juego apaga primero los más costosos (niebla delantera, polvo y distorsión, después cáusticas y siluetas) sin cambiar la jugabilidad.

## Transición de inicio corregida
Antes el paraguas era un semicírculo amarillo plano y la botella caía en pose de caminar. Ahora:
1. La botella baja con su **paraguas real** (el mismo arte del nivel 4).
2. Cierra el paraguas en el aire y se zambulle de cabeza.
3. Bajo el agua se hunde con sus fotogramas de **caída en el agua** sobre el primer fondo del nivel.
4. Aterriza en la arena y empieza el juego.

La transición se puede saltar con ESPACIO o con el botón «Saltar transición».

## Menú
- «Jugar nivel 5 · Bajo la superficie» empieza con la transición.
- «Continuar nivel 5» retoma desde la última bandera.
- En «Elegir recorrido» hay una tarjeta del nivel 5, que empieza sin la transición.
- Al terminar el nivel 4, el botón para seguir lleva al nivel 5 con el puntaje acumulado.

## Archivos nuevos
- `js/level5-core.js`: la lógica del nivel, sin dibujo. Se prueba con Node.
- `js/level5.js`: el dibujo, la cámara, los efectos, el HUD y la transición.
- `js/level5-assets.js` y `assets/level5/`: los 12 fondos (1280×720) y los cuadros recortados de enemigos, jefe y botella.
- `tools/import_v12.py`: vuelve a generar todo desde tus PNG originales:
  `python tools/import_v12.py "carpeta con NIVEL 5 y botella-cayendo/ahogandose/nadando/torbellino.png"`
- `tests/level5.test.cjs`: 15 pruebas nuevas del nivel 5.
- Música nueva: temas «fondo marino», «abismo» y «jefe».

Para ejecutar: descomprimir en una carpeta nueva y correr `npm start` (o `INICIAR.bat`). Para las pruebas: `npm test`.

## Verificación
- Pasan todas las pruebas, las de antes y las 15 nuevas.
- Se jugó en un navegador automático con capturas: la transición, los 12 fondos, el torbellino, la tinta, el pez globo, la succión y la embestida del jefe, el ahogo, la derrota del jefe y el cartel final. No hubo errores.
- Falta una partida completa jugada a mano para ajustar la dificultad, sobre todo la del jefe y las corrientes.

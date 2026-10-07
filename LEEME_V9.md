# LA MALA LECHE — V9 · Nivel 3 «Sin destino»

Basado en tu V8 Premium. No se quitó nada: niveles 1 y 2, finales, transición a la ciudad, catálogo de diseños y ajustes siguen igual. Se suma el **nivel 3 completo**, jugable de principio a fin.

## Abrir

Descomprimí el ZIP. Dentro hay una sola carpeta: `LA MALA LECHE V9`. Detené cualquier servidor anterior (Ctrl+C) y, dentro de la carpeta:

```bash
npm start
```

Abrí http://localhost:3000. No hace falta instalar paquetes. En Windows también podés usar `INICIAR.bat`.

El nivel 3 se abre de tres formas:

- **Menú → «Jugar nivel 3 · La ciudad»** (y «Continuar nivel 3» después de tocar una bandera).
- **Elegir recorrido → tarjeta «Sin destino»**.
- **Al ganar el nivel 2**: después de la transición a la ciudad aparece el botón «JUGAR NIVEL 3». El puntaje se acumula.

## La historia

La botella es libre por primera vez. Cruza la ciudad de noche, perseguida por un gato, mientras los carteles muestran su cara («SE BUSCA») y la publicidad de **Granja La Esperanza**. Tiene que llegar a la azotea del cartel antes del amanecer. Ahí la espera la **Vaca Mecánica**. Al vencerla, el cartel se vuelve a encender, la vaca del cartel guiña un ojo y frena un camión de la granja. La botella salta a la caja del camión y se va **camino al campo**: así queda enganchado el nivel 4.

## Los 12 barrios (tus 12 fondos)

| # | Barrio | Qué pasa |
|---|---|---|
| 1 | La vereda de El Molde | Lluvia, autos con faros, cartel de la vaca con marquesina, ratas en las alcantarillas |
| 2 | Avenida de los rascacielos | 3 pantallas LED con publicidad animada, semáforo que cambia, latas que ruedan |
| 3 | El callejón del gato | Oscuridad, cartel HOTEL con una letra rota, vapor, ojos que miran… y **el gato sale a perseguirte** |
| 4 | La puerta del barrio chino | Dragón de neón con energía que lo recorre, farolitos que se mecen |
| 5 | Calle de los farolitos | Segundo dragón, cuenco de neón, gato de la suerte, vapor de las vaporeras |
| 6 | El mercado nocturno | Pantalla LED, guirnaldas que titilan, burbujas en las peceras, **perro guardián** |
| 7 | Escaleras de incendio | Viento, ropa tendida que flamea |
| 8 | Las azoteas | Luna, luces de aviación, viento y **segunda persecución del gato** |
| 9 | Entre carteles gigantes | 2 pantallas LED, taza, estrella y rayo de neón con chispas, **plataformas de neón que se apagan** |
| 10 | Café 24 horas | Letras que fallan, taza humeante, cafetera con vapor, **barista** y sombrillas que rebotan |
| 11 | El puente al amanecer | Los faroles se apagan a tu paso, gaviotas, sol que sube, viento |
| 12 | El cartel de la vaca | Pelea final bajo el cartel GRANJA LA ESPERANZA |

Las pantallas LED pasan avisos: «SE BUSCA · Botella fugada de El Molde», Granja La Esperanza, noticias con texto que corre, Café 24 h y ofertas de El Molde. Cuando aparece la vaca, todas las pantallas cambian a **«⚠ ALERTA: VACA MECÁNICA»**.

## La Vaca Mecánica (tus fotogramas)

Se usan tus tres láminas, recortadas cuadro por cuadro con su transparencia original: despertar, quieta, caminata, disparo, bola de energía y explosión (15 cuadros).

Reglas que pediste:

- **Mide 5 veces la botella** (710 px contra 142). En la azotea la cámara se abre para que entre entera.
- **Salta cada 15 segundos.** Cuando aterriza, **la pantalla tiembla y se sacude todo**: cámara, HUD y escenario entero, polvo y tornillos que caen, onda expansiva, grietas en el piso y el cartel que parpadea. Si la botella está en el piso, **pierde 5 %**. Estar en el aire o sobre una viga la salva. Antes de caer se marca en el piso dónde va a aterrizar.
- **Dispara cada 30 segundos.** Primero carga el cañón, con una mira que te sigue. Después lanza una bola de energía en arco que **quita 10 %**.
- **Cada disparo de leche le quita 2 %** (4 % con chocolatada).

**Decisión de diseño que conviene explicar en la demo:** con 2 % por disparo y cuatro disparos por segundo, la vaca caía en pocos segundos, antes de saltar o disparar ni una vez. Por eso tiene un **escudo de energía** (burbuja cian). Se abre **3,5 segundos** al despertar, después de cada aterrizaje y después de cada disparo; ahí brilla en rosa y aparece «PUNTO DÉBIL». Así siempre se ven el salto y el disparo, y la pelea dura alrededor de un minuto con muy buena puntería. Se ajusta con un número: `window` en `js/level3-core.js`.

El daño se refleja también en el cartel: cada 25 % de vida perdida se apaga una parte, con chispas. Al morir, la vaca explota con tus 15 cuadros, el cartel se apaga y se vuelve a encender entero.

La barra de la vaca (abajo durante la pelea) muestra la vida, si el escudo está abierto y cuánto falta para el próximo salto y el próximo disparo.

## Enemigos de la ciudad

- **Rata:** sale de la alcantarilla cuando te acercás, corre y vuelve a esconderse. Se pisa.
- **Paloma:** si corrés o disparás cerca, se tira en picada y se va volando.
- **Lata y farolito:** ruedan por la vereda.
- **Perro guardián:** no se lo puede vencer. Duerme; si corrés o disparás cerca, se despierta y te persigue.
- **Barista:** si te ve parada, corre a «hacerte un cortado»: te manda hacia atrás y quedás manchada de café (más lenta) hasta una recarga o una bandera. Agachate lejos de él.
- **Gota de café:** salta hacia vos y también te «corta».
- **Gato:** persigue en el callejón y en las azoteas. Un disparo o un salto encima lo frena. Si escapás, +500 puntos. Cuando queda fuera de la pantalla, un aviso indica a qué distancia está.

## Poderes nuevos

- **Galletita:** doble salto (15 s).
- **Pajita:** impulso horizontal en el aire con CORRER (15 s).
- **Tapa reflectora:** luz propia; ratas y palomas no se animan a acercarse (20 s).

Siguen los de antes: tapa escudo, chocolatada, UHT y recarga.

## Más lógica de juego

- **Reloj del amanecer** (de 03:00 a 06:00, en 5 minutos de juego). Si llegás a la azotea antes de las 06:00, **+3000**. No hace perder: es un incentivo.
- 4 banderas que guardan la partida.
- Cajas que se rompen con leche, rejillas de vapor, plataformas de neón que se apagan y viento en las alturas.
- Música propia: noche de ciudad, persecución del gato y pelea con la vaca. También hay sonidos nuevos: mugido metálico, golpe del aterrizaje, carga del cañón, gato, perro, palomas, ratas y bocina del camión.

## Tus diseños son reemplazables

- **Rata, paloma, lata, farolito, perro, barista, gota de café, gato, galletita, pajita y tapa reflectora** están en el **Catálogo de diseños** (grupo «Enemigos nivel 3»). Se cambian igual que los demás: `assets/custom/<nombre>-0.png`, `-1.png`, …
- **La vaca:** reemplazá los archivos de `assets/level3/` con el mismo nombre (`cowWalk-0.webp` … `cowWalk-23.webp`, `cowShoot-0..4`, `cowDeath-0..14`, `cowBall`).
- **Los 12 fondos:** `assets/level3/bg-01.webp` … `bg-12.webp`.

## Tamaño del ZIP

Para que entre en un único ZIP de menos de 30 MB:

- Los sprites de la botella, los enemigos del nivel 2 y la imagen de la transición pasaron de PNG a **WebP de alta calidad**. Mantienen la medida y la transparencia, y en pantalla se ven a un tercio de su tamaño, por lo que la diferencia no se nota.
- Los fotogramas de la vaca van **sin pérdida**.
- No se incluyeron las carpetas `originales-v5` y `originales-v7`: son tus archivos de origen y siguen en tu V8.

## Verificado

- `npm test`: todas las pruebas de los niveles 1 y 2 y **19 pruebas nuevas del nivel 3**. Cubren las reglas de la vaca (15 s, 30 s, 5 %, 10 %, 2 %, tamaño ×5), las 33 plataformas alcanzables, el neón, el gato, los poderes, el barista, las banderas, el final con el camión y un recorrido automático completo.
- Recorrido completo en el navegador, de la vereda al camión, sin errores en consola, y capturas de los 12 barrios y de cada fase de la pelea.
- 60 cuadros por segundo en la ciudad y en la pelea, medidos en un navegador sin aceleración gráfica.

## Archivos nuevos

- `js/level3-core.js`: lógica del nivel (se prueba sin navegador).
- `js/level3.js`: dibujo, cámara, HUD, efectos, sonido y final.
- `js/level3-city.js`: animación de los 12 fondos.
- `js/level3-assets.js`: lista de fotogramas de la vaca.
- `level3.css`, `assets/level3/`, `tests/level3.test.cjs`.

Cambios en archivos existentes: `index.html` (botones, tarjeta y scripts), `js/game.js` (conexión del nivel 3 y botones), `js/level2.js` (botón para pasar al nivel 3), `js/music.js` (3 temas), `js/sfx.js` (sonidos nuevos) y `js/designs.js` (11 diseños nuevos).

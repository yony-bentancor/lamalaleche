# Diseños personalizados — La Mala Leche V4

Todos los enemigos y objetos nuevos de la V4 se dibujan por código. Cualquiera se puede **reemplazar por una imagen propia** sin tocar el código.

## Cómo reemplazar un diseño

1. Prepará un PNG con **fondo transparente**, el personaje **mirando hacia la derecha** y **sin espacio vacío alrededor** (recortado al dibujo).
2. Guardalo en esta carpeta (`assets/custom/`) con el nombre exacto de la tabla. Ejemplo: `bacteria-0.png`.
3. Para animar, agregá más cuadros numerados: `bacteria-0.png`, `bacteria-1.png`, `bacteria-2.png`… El juego los reproduce en orden y en bucle.
4. Recargá la página.
   - Con **`npm start`** el juego detecta los archivos solo.
   - Si abrís **`index.html` con doble clic**, además anotá el diseño en `personalizados.js`, por ejemplo `bacteria: 3,` si tiene 3 cuadros.
5. En el menú, **Catálogo de diseños** muestra cada pieza animada y marca con ✓ las que usan imagen propia.

Para volver al diseño original, borrá (o renombrá) las imágenes de esa pieza.

### Detalles útiles

- **Tamaño:** la imagen se escala para entrar en la caja de la tabla, manteniendo la proporción y apoyada abajo al centro. Podés usar cualquier resolución (por ejemplo 4 a 8 veces la medida de la tabla para que se vea nítida). Si la proporción de tu imagen es distinta, se verá más chica en uno de los lados.
- **Dirección:** dibujá todo mirando a la derecha; el juego lo da vuelta cuando camina a la izquierda.
- **Efectos que se mantienen:** el aplastado, el destello al recibir daño, el giro del limón, el haz del robot, el temblor de la selladora y las sombras se aplican igual a tus imágenes.
- **Hoja de sprites:** si el generador te da una sola imagen con varios cuadros en fila, cortala en archivos separados (`-0`, `-1`, `-2`…) del mismo tamaño.
- El texto de los carteles lo escribe el juego encima: el diseño `cartel` tiene que ser el tablero vacío.

## Lista de diseños

| Pieza | Archivo | Grupo | Caja en el juego (px) | Cuadros sugeridos | Qué hace |
| --- | --- | --- | --- | --- | --- |
| Bacteria | `bacteria-0.png` | Enemigos | 46×40 | 4 a 8 | Camina de lado a lado. Se aplasta saltándole encima. |
| Limón | `limon-0.png` | Enemigos | 42×42 | 4 a 8 | Rueda hacia la botella cuando la ve. Corta la leche: resta 15. |
| Mosca | `mosca-0.png` | Enemigos | 38×30 | 2 a 4 | Vuela en ondas. Se elimina pisándola o con un disparo. |
| Ratón | `raton-0.png` | Enemigos | 60×34 | 4 a 8 | Corre rápido de un lado al otro y se detiene a olfatear. |
| Robot de control de calidad | `robot-0.png` | Enemigos | 60×135 | 4 a 6 | Patrulla con un haz de escáner. Si te ve de pie, embiste. Agachate para pasar sin ser vista. Dos pisotones. |
| Gota de leche | `gota-0.png` | Coleccionables | 22×28 | 6 a 8 | Suma 10 puntos. Cada 50 gotas devuelven 25% de energía. |
| Tapita dorada | `tapita-0.png` | Coleccionables | 36×36 | 6 a 8 | Son 8, algunas escondidas. Suman 2000 y quedan registradas en el menú. |
| Caja sorpresa | `caja_sorpresa-0.png` | Cajas | 44×44 | 1 a 4 | Se golpea desde abajo. Puede tener gotas o un power-up. |
| Caja vacía | `caja_usada-0.png` | Cajas | 44×44 | 1 | Así queda una caja sorpresa después de usarla. |
| Caja de cartón | `ladrillo-0.png` | Cajas | 44×44 | 1 | Se rompe golpeándola desde abajo. Algunas guardan una gota. |
| Pedazo de cartón | `ladrillo_pedazo-0.png` | Cajas | 16×16 | 1 | Restos que vuelan al romper una caja de cartón. |
| Cacao (chocolatada) | `cacao-0.png` | Power-ups | 34×40 | 1 a 4 | 20 s: disparos de chocolate con doble daño. Recupera 25% de energía. |
| Frutilla | `frutilla-0.png` | Power-ups | 34×36 | 1 a 4 | 12 s: 30% más velocidad con estela rosada. |
| Tapa escudo | `escudo-0.png` | Power-ups | 36×36 | 1 a 4 | Absorbe un impacto cualquiera, también las balas del enemigo 1. |
| Botella de energía (recarga) | `recarga-0.png` | Power-ups | 34×52 | 1 a 6 | Nivel 2: devuelve el 100% de energía y quita la intoxicación. |
| Leche UHT | `uht-0.png` | Power-ups | 32×44 | 2 a 6 | 9 s de invencibilidad: aplasta todo lo que toca y no se calienta. |
| Resorte | `resorte-0.png` | Escenario | 40×26 | 1 | Lanza muy alto. Manteniendo salto, todavía más. |
| Selladora (prensa) | `selladora-0.png` | Escenario | 84×60 | 1 | Baja con fuerza cada pocos segundos. Antes de bajar, tiembla. |
| Válvula de vapor | `valvula-0.png` | Escenario | 44×26 | 1 | Suelta vapor caliente (rojo) o aire helado (azul) cada pocos segundos. |
| Caja que cae | `caja_cae-0.png` | Escenario | 58×52 | 1 | Cae del techo. Su sombra en el suelo avisa dónde va a caer. |
| Carámbano | `carambano-0.png` | Escenario | 26×54 | 1 | Se desprende del techo en las zonas heladas. |
| Heladera | `heladera-0.png` | Escenario | 62×118 | 1 | Acercate para bajar la temperatura de la leche. |
| Plataforma móvil | `plataforma_movil-0.png` | Escenario | 110×24 | 1 a 4 | Se mueve sola y transporta a la botella. |
| Plataforma de espuma | `plataforma_espuma-0.png` | Escenario | 92×26 | 1 a 4 | Aguanta un instante, tiembla y se desarma. Vuelve a aparecer. |
| Cartel de ayuda | `cartel-0.png` | Escenario | 150×58 | 1 | Carteles con consejos. El texto se escribe encima del diseño; el ancho se ajusta al texto. |

## Prompts para generar las imágenes

Adjuntá la imagen de la botella protagonista como referencia de estilo, así todo queda coherente. Si tu generador no hace fondo transparente real, cambiá esa parte por *"solid flat pure green background (#00FF00)"* y quitá el fondo después.

**Bacteria** → `bacteria-0.png`

```
Using the attached milk bottle character only as a style reference, draw a cute but angry green germ blob with tiny cilia, big eyes, wobbling as it walks. Make a sprite sheet of 8 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Limón** → `limon-0.png`

```
Using the attached milk bottle character only as a style reference, draw an angry cartoon lemon with eyebrows, rolling forward. Make a sprite sheet of 8 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Mosca** → `mosca-0.png`

```
Using the attached milk bottle character only as a style reference, draw a cartoon housefly with big red eyes and fast-flapping translucent wings, flying. Make a sprite sheet of 4 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Ratón** → `raton-0.png`

```
Using the attached milk bottle character only as a style reference, draw a small grey cartoon mouse with pink ears and long tail, running. Make a sprite sheet of 8 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Robot de control de calidad** → `robot-0.png`

```
Using the attached milk bottle character only as a style reference, draw a quality-control factory robot on two wheels, white body with a blue stripe, screen face with one glowing eye, antenna, label "QC". Make a sprite sheet of 6 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Gota de leche** → `gota-0.png`

```
Using the attached milk bottle character only as a style reference, draw a single white milk drop with a blue outline and shine, spinning like a coin. Make a sprite sheet of 8 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Tapita dorada** → `tapita-0.png`

```
Using the attached milk bottle character only as a style reference, draw a golden crimped bottle cap with a star in the center, shining and spinning. Make a sprite sheet of 8 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Caja sorpresa** → `caja_sorpresa-0.png`

```
Using the attached milk bottle character only as a style reference, draw a golden-orange mystery box with a big white question mark and rivets in the corners. Make a sprite sheet of 4 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Caja vacía** → `caja_usada-0.png`

```
Using the attached milk bottle character only as a style reference, draw the same mystery box but empty and dull brown, no question mark. Single image. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Caja de cartón** → `ladrillo-0.png`

```
Using the attached milk bottle character only as a style reference, draw a cardboard milk box with packing tape, small blue "ML" logo, square. Single image. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Pedazo de cartón** → `ladrillo_pedazo-0.png`

```
Using the attached milk bottle character only as a style reference, draw a small torn piece of cardboard. Single image. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Cacao (chocolatada)** → `cacao-0.png`

```
Using the attached milk bottle character only as a style reference, draw a chocolate bar half unwrapped from a red wrapper that says "CACAO", with sparkles. Make a sprite sheet of 4 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Frutilla** → `frutilla-0.png`

```
Using the attached milk bottle character only as a style reference, draw a shiny red strawberry with yellow seeds and green leaves. Make a sprite sheet of 4 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Botella de energía (recarga)** → `recarga-0.png`

```
Using the attached milk bottle character only as a style reference, draw a small glowing glass milk bottle with a green cap and a big green plus sign on the label, little bubbles rising, soft green glow. Make a sprite sheet of 6 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Tapa escudo** → `escudo-0.png`

```
Using the attached milk bottle character only as a style reference, draw a blue milk-bottle cap glowing with a protective bubble ring. Make a sprite sheet of 4 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Leche UHT** → `uht-0.png`

```
Using the attached milk bottle character only as a style reference, draw a white UHT milk carton glowing with rainbow light and little stars. Make a sprite sheet of 6 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Resorte** → `resorte-0.png`

```
Using the attached milk bottle character only as a style reference, draw a metal coil spring with a red plate on top, seen from the side. Single image. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Selladora (prensa)** → `selladora-0.png`

```
Using the attached milk bottle character only as a style reference, draw the heavy steel head of an industrial sealing press, yellow-black hazard stripes on the bottom edge. Single image. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Válvula de vapor** → `valvula-0.png`

```
Using the attached milk bottle character only as a style reference, draw a small floor valve nozzle with a red handwheel. Single image. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Caja que cae** → `caja_cae-0.png`

```
Using the attached milk bottle character only as a style reference, draw a wooden shipping crate with a cross brace. Single image. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Carámbano** → `carambano-0.png`

```
Using the attached milk bottle character only as a style reference, draw a sharp icicle pointing down. Single image. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Heladera** → `heladera-0.png`

```
Using the attached milk bottle character only as a style reference, draw a retro white fridge with a blue "❄" label, front view, door closed. Single image. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped.
```

**Plataforma móvil** → `plataforma_movil-0.png`

```
Using the attached milk bottle character only as a style reference, draw a long thin metal lift platform with yellow chevron lights, very wide and short. Make a sprite sheet of 4 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped. Very wide format, about 4.6 times wider than tall.
```

**Plataforma de espuma** → `plataforma_espuma-0.png`

```
Using the attached milk bottle character only as a style reference, draw a long fluffy white foam/cloud platform made of milk bubbles, very wide and short. Make a sprite sheet of 4 frames in a single horizontal row, evenly spaced, same size each frame, looping animation. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped. Very wide format, about 3.5 times wider than tall.
```

**Cartel de ayuda** → `cartel-0.png`

```
Using the attached milk bottle character only as a style reference, draw an empty dark blue sign board with yellow border on two short wooden posts, no text. Single image. Side view facing right. Cartoon style with thick dark navy outlines, flat colors with soft highlights, same palette and line weight as the reference. Transparent background (PNG), no shadow, no ground, no text other than what is described, no border, tightly cropped. Very wide format, about 2.6 times wider than tall.
```

# ENTREGA ACTUAL: V9.1

Abrí **LEEME_V9_1.md** para iniciar el juego y consultar correcciones, mejoras y pruebas. Los textos que siguen son historial de versiones anteriores.

---

# V8 PREMIUM · FINALES Y ENTRADA AL NIVEL 3

**Leé LEEME_V8_PREMIUM.md** para los cambios y cómo probar la transición.

---

# V7 · FECHA DE VENCIMIENTO

**Empezá por LEEME_V7.md.** Incluye el nivel 2 completo, la instalación, controles y cambios.

---

# V5.1 — TRANSICIÓN ILUSTRADA

Ver **LEEME_V51.md**. Para probarla: Recorridos → Ver transición al nivel 2.

# V5.0.0 — DOCUMENTACIÓN ACTUAL

Leé **LEEME_V5.md** para los cambios, controles, pruebas y conexión del segundo nivel. El contenido siguiente se conserva como referencia histórica de V4/V3.

---

# LA MALA LECHE NEW — V4.0.0

## Novedades V4 — «A toda leche»

Todo lo de V3 sigue igual; V4 **solo suma**. El juego conserva el guardado de V3 (checkpoints y ajustes).

### Para juntar y romper

- **144 gotas de leche** repartidas en líneas y arcos. Cada una suma 10 puntos; **cada 50 gotas se recupera 25% de energía**.
- **8 tapitas doradas**, algunas difíciles de alcanzar y una dentro de una **caja escondida** invisible. Suman 2000 y quedan registradas en el menú de inicio, junto con el mejor puntaje.
- **Cajas sorpresa (?)** que se golpean desde abajo: algunas dan 5 gotas seguidas, otras un power-up.
- **Cajas de cartón** que se rompen en pedazos o esconden una gota. Golpear una caja también voltea al enemigo que esté parado encima.

### Power-ups

| Power-up | Efecto |
| --- | --- |
| Cacao | 20 s de **chocolatada**: la botella se vuelve marrón y los disparos hacen doble daño. +25% energía. |
| Frutilla | 12 s con 30% más velocidad y estela rosada. |
| Tapa escudo | Burbuja que absorbe el próximo golpe, también las balas del enemigo 1. |
| Leche UHT | 9 s de invencibilidad con colores de arcoíris y música propia: aplasta todo lo que toca. |

### Enemigos nuevos (además del enemigo 1, el 2 y el guardián)

- **Bacterias** que patrullan. **Limones** que ruedan hacia la botella cuando la ven. **Moscas** que vuelan en ondas. **Ratones** veloces que se frenan a olfatear.
- **Robot de control de calidad**: patrulla con un haz de escáner. Si ve a la botella de pie, grita «¡RECHAZADA!» y embiste. **Agachada no la detecta.** Necesita dos pisotones.
- **Pisotón estilo Mario:** cualquier enemigo se puede aplastar cayéndole encima, también los originales (el enemigo 1 y el 2 reciben 50, el guardián 20). Pisotones encadenados sin tocar el suelo hacen **combo** (100, 200, 400, 800… hasta 8000).
- Los enemigos nuevos también reciben los disparos de leche.

### Peligros y mecánicas del escenario

- **Selladoras**: prensas que tiemblan con una luz roja y bajan de golpe. Mientras están abajo hacen de pared.
- **Válvulas de vapor** (rojas) y **de aire helado** (azules) con aviso previo.
- **Cajas y carámbanos que caen** del techo, con sombra en el piso que avisa dónde.
- **Cintas transportadoras** que empujan, **charcos de leche** y **hielo** resbalosos (las plataformas heladas también), **plataformas móviles** que transportan, **plataformas de espuma** que se desarman y vuelven, y **resortes** (manteniendo salto se llega más alto).
- **Temperatura:** los haces de sol de la primera parte calientan la leche. Un termómetro en pantalla lo muestra; al 100% la leche **se agria** y pierde energía. Se enfría en la sombra, en las zonas heladas, con las **heladeras** y en las banderas.
- **Carteles** con consejos en los lugares donde aparece cada mecánica nueva.

### Experiencia visual

- **Pausa breve al impactar** (hit-stop), **cámara lenta y destello** al romperse la botella, y **transición circular** al volver al checkpoint y al comenzar.
- Números de puntos flotantes, estrellas, anillos, confeti en checkpoints, tapitas y power-ups, astillas al recibir daño, escombros al romper cajas.
- **Estelas** al correr rápido, con frutilla (rosa) o UHT (arcoíris). Aura de escudo, partículas de cacao, gotas de sudor con calor y aliento helado en el frío.
- **Reflejo** de la botella en los pisos brillantes de la fábrica y del frigorífico.
- **Clima por zona:** burbujas en la fábrica, mariposas y pájaros en el campo, polen dorado al atardecer, luciérnagas en el huerto y nieve en el bosque helado y la cámara refrigerada.
- **Penumbra con luz propia:** el huerto, el bosque y el almacén se oscurecen y la botella ilumina su alrededor.
- **Primer plano** con siluetas (caños, alambrados, helechos, hielo) que aprovecha la franja inferior de la pantalla.
- Brillo animado que recorre las plataformas originales, escarcha en las heladas y sombra de contacto debajo de cada una.
- Viñetas de pantalla: roja al recibir daño, naranja con calor, celeste en el frío, latido con poca energía.
- **Sonidos nuevos** sintetizados para cada acción (gotas con tono ascendente, cajas, pisotones según el combo, resortes, prensas, alarma, escudo, etc.).

### Interfaz

- Marcador de **puntaje, gotas, tapitas y temperatura**, y fichas con el tiempo restante de cada power-up y el combo actual.
- Pantalla de victoria con **estadísticas**: puntaje, gotas, tapitas, enemigos y mejor combo.
- **Catálogo de diseños** (menú de inicio y pausa): muestra cada enemigo y objeto nuevo animado, con el nombre de archivo para reemplazarlo.
- Nuevos ajustes: **Impactos con pausa breve y cámara lenta** y **Clima, penumbra y luz propia**. Si la computadora va lenta, apagar estos dos y **Partículas y ambiente**.

### Reemplazar los diseños nuevos por imágenes propias

Los enemigos y objetos nuevos están dibujados por código. Para cambiar cualquiera, guardar un PNG transparente en `assets/custom/` con el nombre que indica el catálogo (por ejemplo `bacteria-0.png`, `bacteria-1.png`… para animarlo) y recargar. **Instrucciones completas, tabla de medidas y prompts listos para un generador de imágenes en `assets/custom/LEEME.md`.**

### Archivos nuevos

- `js/extras.js`: contenido y reglas nuevas (sin dibujo, con pruebas).
- `js/extras-draw.js`: dibujo del contenido nuevo.
- `js/designs.js`: diseños por defecto y carga de imágenes propias.
- `js/fx.js`: efectos visuales. `js/sfx.js`: sonidos.
- `assets/custom/`: carpeta para tus imágenes, con su guía.
- `tests/v4.test.cjs`: 20 pruebas nuevas.
- `js/physics.js` suma, sin cambiar lo anterior: golpes de cabeza contra cajas (con corrección de esquinas), plataformas móviles, cintas, superficies resbalosas, resortes y multiplicador de velocidad.
- `server.cjs` suma la detección automática de imágenes propias.
- Los archivos `.js` se reformatearon con sangría legible para que sea más fácil editarlos.

### Verificaciones V4

`npm test` ejecuta **51 pruebas**: las 31 de antes, sin cambios, más 20 nuevas (cajas, pisotones, escudo, cacao, resortes, plataformas móviles y de espuma, cintas, hielo, selladoras, temperatura, robot, que todo coleccionable esté al alcance, que se pueda caminar debajo de cada caja y que nada nuevo quede dentro de los pozos o la arena).

Además, un recorrido automático atraviesa el nivel completo hasta la arena sin quedar atascado. Se probaron en Chromium todas las zonas, el catálogo, el reemplazo por imágenes propias, la rotura y vuelta al checkpoint, el laboratorio y la victoria con estadísticas, sin errores de JavaScript.

---

## Abrir en Visual Studio Code

Descomprimir **todo** el ZIP en una carpeta nueva. Abrir en VS Code la carpeta que contiene `package.json`.

Detener el servidor de la versión anterior con **Ctrl+C**. En la terminal:

```sh
npm start
```

Abrir **http://localhost:3000**. No hace falta `npm install`: el servidor no tiene dependencias externas. Dejar la terminal abierta mientras se juega.

La versión correcta muestra **V4** en la esquina superior izquierda durante el juego y **V4.0 / A TODA LECHE** en el inicio. Si aparece V3 o V2, se está abriendo otro servidor o carpeta. También es posible abrir `index.html` directamente o usar `INICIAR.bat`.

Si se necesita otro puerto desde PowerShell:

```powershell
$env:PORT=3001
npm start
```

En ese caso, abrir http://localhost:3001.

## Controles

| Acción | Tecla |
| --- | --- |
| Caminar | ← → / A D |
| Correr | Shift + dirección |
| Salto bajo / alto | Tocar / mantener Espacio o Z |
| Agacharse y deslizar | ↓ / S |
| Disparar leche | X, se puede mantener |
| Apagar / encender sonido | M, o botón de sonido junto a pausa |
| Aplastar enemigos | Caer encima (mantener salto rebota más alto) |
| Golpear cajas | Saltar debajo |
| Pausa | Esc / P |
| Pantalla completa | F |

En celular se muestran los controles táctiles. Se recomienda orientación horizontal. El taller conserva su finalidad de probar movimiento; el combate pertenece al recorrido principal.

## Cambios V3

### Plataformas y dificultad

Las 35 plataformas del recorrido ahora son **flotantes**, sin pilares, patas ni refuerzos de apoyo. Conservan sus superficies, sombras, vegetación o hielo y la colisión alineada con los pies de la botella.

Se agregó una caja industrial sólida alrededor del **8% del recorrido**. Bloquea la marcha y obliga a saltar; también se puede aterrizar encima. Es un obstáculo apoyado en el suelo, distinto de las plataformas flotantes.

### Agua tóxica e intoxicación

Los tres pozos tienen ahora una zona sumergida de apoyo. Al caer, la botella entra en contacto con el agua, cambia al estado **INTOXICADA** y permanece en el mismo lugar: **no se reinicia ni vuelve al checkpoint**.

Se sale manteniendo salto y una dirección. Las orillas impiden atravesar el suelo por debajo. Se puede permanecer en el agua sin daño continuo en esta versión.

La intoxicación no termina por tiempo. Se cura al tocar una **bandera de recarga**, incluso una ya activada si se sale de su zona y se vuelve a entrar. La recarga restaura además la energía al 100%. La reaparición tras morir también restaura energía y estado sano.

Se usan las imágenes nuevas para caminar, correr, agacharse y disparar. Las bolas intoxicadas son verdes y mantienen el daño de 10 puntos. No se recibió una tira independiente de salto intoxicado: subida, caída y aterrizaje usan poses compatibles de la carrera intoxicada, con deformación suave. Solo se seleccionan cuadros de aspecto enfermo; no se intercalan los primeros cuadros sanos de las tiras de transformación.

### Enemigo 2

Se incorporaron cuatro enemigos 2, con caminata, postura de bloqueo y explosión. Patrullan su tramo y se plantan frente a la botella cuando se acerca. **No disparan ni generan daño por contacto**; bloquean físicamente el paso. Se pueden derrotar con leche o superar con un salto bien tomado, carrera o plataformas cercanas.

Conservan 100 puntos de energía y reciben 10 por impacto, igual que el enemigo 1. El enemigo 1 sigue disparando balas que restan 5 puntos a la botella. La protección breve evita contar impactos superpuestos en el mismo instante.

### Astillas y rotura

- Por encima de 60%: sin grietas por daño.
- De 60% a 41%: primeras astillas.
- De 40% a 21%: grietas más marcadas.
- De 20% a 1%: deterioro fuerte.
- En 0%: animación nueva de **BOTELLA ROMPIENDOSE** y regreso al checkpoint.

En reposo se usan los cuadros de daño suministrados. Durante el movimiento, el disparo y la intoxicación se dibujan grietas sobre la pose activa para conservar las animaciones sin cambiar de estado visual.

## Profundidad y movimiento ambiental

La escena se compone de capas con velocidades diferentes respecto de la cámara:

| Capa | Velocidad aproximada |
| --- | --- |
| Niebla distante | 0,18× |
| Haces de luz | 0,35× |
| Motas y partículas ambientales | 0,55× |
| Escenografía panorámica | 0,88× |
| Suelo, plataformas y personajes | 1,00× |
| Hierbas del primer plano | 1,12× |

Las hojas tienen además profundidades y oscilaciones propias. El escenario principal y la franja del suelo se componen por separado, con una transición suave para mantener la línea jugable alineada. Las secuencias se solapan para evitar huecos. En las uniones de ilustraciones distintas puede percibirse una breve mezcla de detalles.

Se añadieron gotas de leche con pequeñas salpicaduras, fugas periódicas de vapor frío y ventiladores giratorios. Estos efectos son decorativos y no infligen daño. La animación continúa al estar quieta la botella; se detiene al pausar.

El cielo, las montañas y las máquinas pintadas dentro de cada PNG no son objetos separados individualmente. La profundidad proviene de la composición de escenografía/suelo y las nuevas capas ambientales. **Partículas y ambiente** en Ajustes permite desactivar los efectos y el desplazamiento diferencial del fondo.

## Sonido suave

Se añadió un acompañamiento de notas suaves y espaciadas, generado localmente, con volumen inicial de 25%. No usa archivos externos ni reproduce audio antes de comenzar el juego.

- **M** o botón de sonido: apaga/enciende todo.
- **Sonido general**: control general desde Ajustes.
- **Ambiente suave**: permite quitar el acompañamiento y conservar los sonidos de acciones.
- **Volumen**: ajusta la intensidad de ambos.

Al pausar, abrir ajustes o salir al menú, el ambiente baja suavemente a silencio. Las preferencias se conservan en el navegador.

## Se conserva de V2

Los 12 escenarios, inicio, selección de recorrido, pausa, ajustes, cuatro checkpoints, disparos, energía, patrullas del enemigo 1, la arena final con zoom y la victoria contra el guardián. Aceleración, frenado, carrera, salto variable, coyote time, jump buffer, control aéreo, sombras, polvo y deformación sutil.

V3 usa su propio guardado local; no sobrescribe el avance guardado por V2. Los checkpoints conservan el avance más lejano. Reiniciar recorrido comienza una partida nueva.

## Archivos y ajustes

- `js/physics.js`: movimiento y colisión con obstáculos sólidos.
- `js/adventure.js`: geometría, agua, intoxicación, recargas, enemigos y combate.
- `js/scenery.js`: plataformas, enemigos, hojas, agua y efectos ambientales.
- `js/game.js`: cámara, capas, animaciones, interfaz, controles y coordinación.
- `js/audio.js`: ambiente sonoro suave.
- `js/assets.js`: inventario de sprites y anclajes.
- `assets/`: recursos usados por el juego.
- `originales/`: imágenes recibidas, conservadas.
- `tools/import_v3.py`: regeneración opcional de las nuevas secuencias, requiere Pillow, NumPy y SciPy; no se necesita para jugar.

## Verificaciones realizadas

`npm test` ejecutaba en V3 **31 pruebas automáticas** (siguen incluidas): 12 del movimiento, 10 de aventura/combate y 9 de V3, incluyendo salida del pozo, intoxicación persistente, curación en bandera activa, bloqueo sin disparos, daño desde 60% y obstáculo al 8%.

Se probaron en Chromium los controles de sonido, pausa y ajustes, el obstáculo, el enemigo 2, la caída al agua sin reinicio, el salto de salida, los sprites intoxicados y la arena. También se prepararon estados de prueba para inspeccionar visualmente 60%, 20%, rotura a cero, curación y explosión del enemigo 2. Se revisaron capturas y no hubo errores JavaScript en esas pruebas.

Nota sobre los originales: el archivo «8 - Sendero oscuro del huerto abandonado-2.png» llegó truncado y se conserva como referencia. Los fondos preparados que carga el juego son válidos; este original no se carga durante la partida.

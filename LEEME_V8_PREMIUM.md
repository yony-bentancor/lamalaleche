# LA MALA LECHE NEW — V8 PREMIUM

**ZIP completo del juego**, basado en el archivo V7 PREMIUM que aportaste. Conserva sus dos niveles, viento, música, efectos, puertas alineadas con las heladeras, queso que dispara y finales anteriores de enemigos.

## Abrir

Descomprimí todo en una carpeta nueva. Detené el servidor de la versión anterior con Ctrl+C. En la carpeta que contiene `package.json`:

```bash
npm start
```

Abrí http://localhost:3000. No hace falta instalar paquetes. La pestaña y el menú muestran V8 Premium. En Windows también se conserva `INICIAR.bat` del ZIP recibido.

## Final del carrito

- Ahora tiene **30 puntos de energía**. Se destruye con **tres disparos normales** de leche (10 cada uno), o dos de chocolatada (20 cada uno).
- Sigue siendo una plataforma móvil: saltar sobre él no lo destruye.
- Al perder su energía deja inmediatamente de causar daño y de sostener al personaje.
- Se reproduce tu secuencia: vibración, ruptura de la canasta, piezas desprendidas y desaparición del polvo. Dura 1,65 segundos.
- Se prepararon nueve cuadros con tamaño y posición de los pies comunes, evitando que los restos aumenten de tamaño al desaparecer.
- La destrucción se conserva cuando queda incluida en el guardado de una bandera.

## Final de la Caja Registradora

- Conserva las tres fases y los valores de daño de Premium.
- En cero se cancela su ataque y se eliminan los proyectiles peligrosos.
- Se muestran los **12 cuadros** de tu lámina de desarme, en orden, hasta quedar un montón de piezas en el suelo.
- La botella espera; las cintas dejan de arrastrarla durante este momento.
- Tras el desarme comienzan la celebración y la apertura de la salida. A los 5,6 segundos la botella empieza a caminar hacia la puerta.
- La animación también se completa si la botella estaba ya muy cerca de la salida. No se puede omitir por alcanzar el borde durante el último golpe.

Los recortes eliminan los números de referencia y los bordes exteriores de las celdas. El tamaño de los cuadros permanece constante durante la destrucción.

## Entrada al nivel 3: «Sin destino»

Después de salir se reproduce una transición de unos **22 segundos**:

1. Fundido desde el último plano de la batalla.
2. La botella sale del supermercado y camina por una ciudad enorme de noche.
3. Se detiene, mira a su alrededor y vuelve a avanzar. La cámara se aleja suavemente para destacar su tamaño frente a la ciudad.
4. Aparece el título **NIVEL 3 — SIN DESTINO**.

Texto de la secuencia:

> Por primera vez, está libre.
>
> Sola. De noche. En una ciudad enorme.
>
> Ya no huye de un lugar.
>
> Ahora tiene que encontrar adónde ir.

La ciudad es una ilustración nueva preparada para esta transición. La botella usa sus animaciones existentes; cámara, reflejo y atmósfera se componen por código. No es un video pregrabado ni un nivel 3 jugable.

- **Esc / P:** pausar y continuar.
- **M:** activar o apagar sonido.
- **Saltar transición:** llega al resumen final.
- La escena pausa al perder foco o cambiar de pestaña.
- Usa el volumen y sonido de la partida. El ambiente puede desactivarse.
- Respeta la preferencia de movimiento reducido del sistema.

**Para verla sin repetir la pelea:** Elegir recorrido → **Ver entrada al nivel 3**. La vista previa vuelve al menú y no altera la partida guardada. Al terminar el nivel también puede repetirse desde su resumen.

El recorrido del nivel 3 aún no está construido. La entrega prepara su presentación y el punto de enlace. El evento `milk:level-transition` con `{from:2,to:3,...}` ocurre una sola vez al terminar o saltar la transición de una victoria; las repeticiones y vistas previas no lo duplican.

## Archivos nuevos y modificados

- `assets/level2/cartDeath-0.png` a `cartDeath-8.png`.
- `assets/level2/registerDeath-0.png` a `registerDeath-11.png`.
- `assets/cinema/ciudad-nivel-3.webp`.
- `js/city-cinema.js`: escena, controles, sonido y limpieza al salir.
- `js/level2-core.js`: carrito destructible y tiempos del final.
- `js/level2.js`: reproducción de los finales y enlace a la ciudad.
- `js/level2-assets.js`, `js/game.js`, `index.html`, `level2.css`: carga, menús y presentación.
- `tests/endings.test.cjs`: ocho verificaciones nuevas.

Los documentos V7 y Premium se conservan como historial; este documento reemplaza sus menciones al carrito indestructible y al cierre anterior.

## Verificación

`npm test` ejecuta **116 verificaciones de lógica**: 108 de la base Premium y ocho nuevas para destrucción, transporte, guardado, impactos reales y orden de salida. Los guardados del nivel 2 mantienen el formato compatible con V7.

También se verificó en Chromium el combate con disparos, la destrucción del carrito y del jefe, la salida automática, la reproducción completa de la transición, pausa, sonido, repetición y salto de escena. Sin errores de JavaScript ni de carga HTTP. Se usó posicionamiento e invulnerabilidad de desarrollo para probar el combate sin interrupciones. La interfaz se revisó con un viewport móvil emulado de 844 × 390; no se probó en un teléfono físico.

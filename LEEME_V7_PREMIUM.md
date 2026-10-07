# LA MALA LECHE NEW — V7 Premium

Parte de la V7 entregada (con los dos niveles completos) y suma una revisión a fondo del **nivel 2 · Fecha de vencimiento**. No se eliminó ninguna función: lo que estaba mal se corrigió y todo lo demás se mantiene. Se abre igual: `npm start` y **http://localhost:3000**. La pestaña muestra **V7 Premium · Fecha de vencimiento**.

**Importante al descomprimir:** la entrega viene en dos ZIP porque el total supera el límite de envío. Descomprimí **los dos en la misma carpeta**: la parte 1 trae el juego y la parte 2 trae los sprites de la botella (`assets/sprites`) y las láminas originales de esta versión.

## Lo que se corrigió (pedidos de la auditoría)

| Pedido | Qué se hizo |
| --- | --- |
| Los poderes del nivel 2 no tenían el mismo efecto que en el nivel 1 | Chocolatada, UHT, escudo, 2×1 y la botella de energía usan ahora los mismos efectos del nivel 1: destello de pantalla, confeti, golpe de zoom, texto grande, sonido de poder, botella marrón con partículas de cacao, arcoíris y estela con UHT, burbuja de escudo, estela rosada del 2×1. Fichas en el HUD con barra de tiempo restante y aviso al terminar cada poder. |
| La botella de energía | Diseño nuevo (botella con cruz verde, brillo y burbujas). Al tomarla: destello verde, anillos, burbujas de leche que suben, «ENERGÍA 100%» y la barra de energía se ilumina. |
| Heladeras de la escena 10 desfasadas | Las puertas ahora se abren **sobre las heladeras pintadas del fondo**, siguiendo su movimiento en parallax. La hoja de vidrio gira hacia la cámara, el interior se ilumina y la niebla fría cae y avanza por el piso hasta donde está la botella. El empuje y el enfriamiento ocurren justo frente a la puerta que se abre. Antes de abrirse, la luz interior titila como aviso. |
| Música | Música nueva generada en el momento (sin archivos): tema del nivel 1, bossa de supermercado para el nivel 2, versión filtrada y tensa durante los apagones, tema rápido para los jefes de los dos niveles y tema de victoria. Baja de volumen en pausa. Se controla con «Música de fondo» en Ajustes y en la pausa del nivel 2. |
| Ruido molesto de la frenada | El zumbido grave se reemplazó por un roce corto de zapatilla, a bajo volumen y como máximo una vez cada 0,6 s (en los dos niveles). |
| Los enemigos perdían de forma rara | Yogur, moho y queso **se derriten** con tus láminas nuevas (8 cuadros cada una) y dejan un charco que se desvanece. El repositor cae hacia atrás echando chispas y humo, la cucaracha queda patas arriba y la mosca cae en espiral. Cada derrota muestra los puntos ganados. |
| El queso no debe saltar | El queso **solo camina** y, cuando te ve, se detiene y **lanza bolas de queso** en arco (usa sus cuadros de ataque). Las bolas rebotan una vez y se deshacen; cada una resta 5, sin intoxicar. Se lo vence pisándolo; el disparo sigue rebotando en él. |

## Lo que se agregó

- **Viento:** en los tres fondos exteriores hay ráfagas cada 9 segundos. La lluvia se inclina como aviso, aparecen líneas de viento, bolsas de El Molde, papeles y hojas volando, y la botella se inclina. La ráfaga empuja hacia la izquierda; **agacharse casi anula el empuje**.
- **Tormenta:** relámpagos ocasionales con trueno en la playa de descarga.
- **Vida en cada fondo:** chispas del tablero eléctrico en la salida de emergencia, calor del horno y harina en el aire en la panadería, rociadores con neblina en frutas y verduras, papelitos de oferta cayendo en el salón, lectores láser en las cajas y neones que respiran en la salida.
- **Golpes con peso:** pausa breve al pisar o derrotar enemigos, cámara lenta y destello al romperse la botella, transición circular al volver a la bandera y al empezar.
- **Combos:** pisotones encadenados sin tocar el suelo multiplican los puntos (COMBO x2, x3…).
- **Premios que vuelan al HUD:** las monedas y los stickers +3 DÍAS viajan hasta su contador.
- **Sonidos propios del nivel 2:** disparo de leche (y de chocolate), stickers, recarga, 2×1, derretido, caída del repositor, lanzamiento de queso, viento, trueno, apagón y láser.
- Ítems con halo pulsante y brillo que recorre los stickers.
- Opción **«Clima, viento y luces»** en la pausa del nivel 2, además de música, efectos y volumen.

## Corrección técnica

La gravedad de las esporas y de las monedas del jefe no dependía del tiempo y caían casi al instante. Ahora caen con un arco real: las esporas del yogur, del moho y del techo se ven venir, y la lluvia de monedas del jefe se puede esquivar mirando su caída.

## Diseños reemplazables

La botella de energía se sumó al **Catálogo de diseños** (`recarga-0.png`). Chocolatada, UHT y escudo del nivel 2 usan los mismos diseños del nivel 1, así que si los reemplazás con imágenes propias, cambian en los dos niveles. Prompt incluido en `assets/custom/LEEME.md`.

Las láminas de derretido que aportaste están en `originales-v7/`, y los cuadros recortados en `assets/level2/` (`yogurtDeath-0…7`, `moldDeath-0…7`, `cheeseDeath-0…7`).

## Verificación

- `npm test`: **108 pruebas**. Las 97 anteriores siguen pasando sin cambios y se sumaron 11 nuevas (queso sin saltos y con bolas, daño de las bolas, blindaje del queso, duración de cada derrota, combos, viento en el aire y agachada, aviso de viento, alineación de heladeras, gravedad de esporas y aviso de fin de poder).
- Un recorrido automático atraviesa el nivel 2 hasta el jefe con tres semillas distintas, con la misma dificultad que la V7 (sin muertes ni atascos).
- En Chromium se revisaron las 12 escenas, los cinco poderes, las cinco derrotas, el queso lanzando, las heladeras abiertas, las tres fases del jefe, la victoria y el nivel 1 completo, sin errores de JavaScript. El rendimiento del nivel 2 se mantiene en 60 cuadros por segundo.
- La música se verificó renderizándola: los cinco temas suenan sin saturar.

No se probó en celulares físicos. La música y los sonidos dependen de que el navegador permita audio después de la primera tecla o toque.

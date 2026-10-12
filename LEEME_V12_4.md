# La Mala Leche · V12.4

Versión completa: parte de la V12.3 con todos sus cambios y suma una sola corrección.

## Uniones entre los fondos del nivel 5
Los 12 fondos se pintaron por separado. Al ponerlos uno al lado del otro quedaba un corte vertical duro, como una escena pisada sobre la otra. Se veía sobre todo en barco → playa (11|12), coral → lomo (9|10) y la entrada al abismo (4|5).

Ahora cada unión tiene una franja que funde un fondo con el siguiente:
- **En el agua** la fusión es ancha (400 px, y 600 px en la última unión, que es la que más cambia de luz). Se lee como agua turbia entre dos escenas.
- **En el piso** la fusión es angosta (120 px), así el borde del suelo sigue donde se pisa. La física del piso no cambió.
- Cada fondo se prolonga con su propio reflejo desenfocado, para que no aparezcan fantasmas ni formas repetidas de la otra imagen.
- La ondulación del agua ahora tiene la misma fase en los 12 fondos, así las uniones no se desfasan al moverse.

Archivos:
- `assets/level5/seam-01.webp` … `seam-11.webp`: 11 franjas nuevas, unos 240 KB en total.
- `tools/seams_v12_4.py`: las regenera desde los fondos. Hay que correrlo de nuevo si cambia algún fondo: `python tools/seams_v12_4.py`.
- `js/level5.js`: carga las franjas y las dibuja sobre cada unión.
- `tests/v12_4.test.cjs`: comprueba que existen las 11 franjas y que el juego las usa.

## Verificación
- `npm test`: pasan todas las pruebas, más las 2 nuevas.
- En el navegador se capturó cada una de las 11 uniones antes y después, sin errores en la consola.

## Pendiente (de la auditoría de la V12.3)
- **Paquete A:** pantalla negra al volver a la bandera mientras te ahogás, puntos infinitos con el jefe y con el cangrejo, el torbellino que mata al jefe solo, el rincón seguro arriba en la arena del jefe, protección al reaparecer, la luz propia en el abismo y otros menores.
- **Paquete B:** evitar que se pueda cruzar el nivel nadando pegado al techo.

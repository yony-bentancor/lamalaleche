# La Mala Leche · V9.1

Revisión de la V9 adjuntada por el usuario, con los tres niveles y todos sus recursos. No es un parche: descomprimir en una carpeta nueva para conservar una copia de V9.

## Cómo abrir

Con Node.js instalado, abrir la carpeta que contiene `package.json` en Visual Studio Code y ejecutar:

```sh
npm start
```

Abrir http://localhost:3000. No necesita `npm install`. En Windows también se puede ejecutar `INICIAR.bat`. Si hay otra versión abierta, detener su servidor con Ctrl+C antes de arrancar ésta. El menú y la pestaña indican V9.1.

Controles: flechas o A/D para moverse, Shift para correr, Espacio o Z para saltar, abajo o S para agacharse, X para disparar, Escape/P para pausa, M para sonido y F para pantalla completa. Los botones táctiles aparecen en dispositivos con entrada táctil.

## Correcciones verificadas

1. **Pisotón sobre el gato:** se resuelve antes del contacto lateral. Rebota y frena al gato sin quitar energía; el contacto lateral conserva sus 10 puntos de daño.
2. **Monedas de cajas del nivel 3:** una caja rota reconstruye su moneda pendiente al cargar un checkpoint. También recupera guardados V9 anteriores; una moneda ya recogida no se duplica.
3. **Palomas:** respetan los tres segundos de descanso previstos al volver a su posadero.
4. **Impulso y viento:** los desplazamientos externos del nivel 3 respetan las cajas sólidas desde ambos lados; se puede seguir pasando por encima.
5. **Golpe letal:** el personaje deja de procesar controles en el mismo paso en que muere; no genera un disparo después del golpe mortal.
6. **UHT:** protege del agarre del barista, además del daño normal.
7. **Guardados de niveles 2 y 3:** se normalizan índices de bandera, listas y valores numéricos irregulares para evitar un bloqueo al continuar. Se conservan las claves y versiones de guardado anteriores.
8. **Movimiento reducido:** ahora también desactiva las animaciones CSS de alertas y poderes, no solo las transiciones.
9. **Identificación:** menú, HUD, servidor y estado de diagnóstico muestran V9.1; el diagnóstico de V9 todavía mostraba 8.0.0.

## Acabado visual

- Sombras de contacto suaves en niveles 2 y 3: se proyectan sobre el apoyo inmediatamente debajo de la botella, incluyendo plataformas y carritos, y se debilitan al saltar.
- Reflejos de la botella con desvanecimiento progresivo, menor intensidad al elevarse y distinta presencia entre exteriores y salón del supermercado.
- Toldos, tejados y vigas del nivel 3 con sombreado de volumen y detalles de superficie. Borde luminoso para identificar el plano de aterrizaje; los neones apagados no muestran ese borde.
- Una capa atmosférica sutil en la ciudad, con desplazamiento independiente y color según barrio. Se desactiva junto con efectos/clima o movimiento reducido.
- La pelea de la vaca concentra el temblor en el escenario: ya no sacude a la vez todo el HUD mediante una segunda animación CSS.
- Foco visible para manejar menús de niveles 2 y 3 con teclado.

Se conservaron todas las ilustraciones y sprites originales. Las mejoras son de composición y dibujo Canvas: no se inventó detalle de mayor resolución en imágenes pequeñas ni se sustituyó el estilo de los personajes.

## Alcance

El nivel 4 todavía no se agregó. La V9.1 conserva el final del nivel 3 que venía en V9, incluyendo el camión. La futura sustitución de ese enlace por el dirigible y «Por las nubes» se hará junto con los recursos del nivel 4; no se presenta como implementada en esta revisión.

Los documentos de versiones anteriores se mantienen como historial. Para esta entrega, empezar por este archivo. Para las mecánicas completas del nivel 3, consultar `LEEME_V9.md`.

## Validación

- `npm test`: **144 verificaciones de lógica**, incluyendo las 135 existentes y nueve regresiones nuevas.
- Sintaxis de los **38 archivos JavaScript/CJS** comprobada con Node.js.
- Prueba en Chromium de acceso a niveles 1, 2 y 3, controles, disparos, pausa, sonido, transición del supermercado a la ciudad, carga de los 12 barrios, impacto contra la vaca y final del camión.
- Revisión táctil en pantalla horizontal emulada de 844 × 390, con movimiento reducido. No equivale a una prueba de rendimiento en un teléfono físico.
- Para alcanzar escenas lejanas y probar el cierre se usó el modo de desarrollo `?dev`, posicionamiento e invulnerabilidad. La batalla se comprobó con un disparo real y la secuencia final con pasos de simulación; no se afirma una partida manual completa de los tres niveles.

Archivos centrales modificados: `js/level3-core.js`, `js/level2-core.js`, `js/level3.js`, `js/level2.js`, `js/game.js`, `index.html`, `level2.css`, `level3.css`, `package.json`, `server.cjs`. Nuevos: `js/render-finish.js`, `tests/revision.test.cjs` y este documento.

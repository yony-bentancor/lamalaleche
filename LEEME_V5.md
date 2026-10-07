# LA MALA LECHE NEW — V5.0.0

## Abrir

Descomprimí todo el ZIP en una carpeta nueva. En Visual Studio Code, abrí la carpeta que contiene package.json. Cerrá el servidor anterior con Ctrl+C y ejecutá:

```sh
npm start
```

Abrí http://localhost:3000. No requiere npm install. El inicio y el HUD deben mostrar V5. También se puede abrir index.html directamente; para detectar imágenes personalizadas automáticamente, usá npm start.

## Controles

- Flechas / A-D: caminar. Shift: correr.
- Espacio / Z: saltar; mantener para mayor altura.
- Flecha abajo / S: agacharse.
- X: disparar (puede mantenerse).
- M: sonido. Esc / P: pausa. F: pantalla completa.

## Novedades

### Chocolatada

El power-up cacao conserva su duración de 20 segundos. Al disparar utiliza las imágenes nuevas y una bola de chocolate extraída de la tira. Se seleccionaron tres poses limpias; los cuadros con un chorro unido al cuerpo no se usan como proyectil independiente. El disparo mantiene 20 puntos de daño, incluso si cacao vence mientras la bola está en vuelo. La leche normal resta 10. La apariencia intoxicada mantiene prioridad si coinciden ambos estados.

### Guardián final

El guardián usa las nuevas imágenes de caminata, carga y rayo. Tiene altura de referencia 284 unidades frente a 142 de la botella; el zoom afecta a ambos por igual. Se conserva su energía máxima de 100.

Al entrar a la arena alterna acercamiento, carga de 0,95 segundos, rayo de 0,28 segundos y recuperación. La línea punteada anticipa la dirección, fijada al empezar la carga. Hay que cambiar de posición/altura después de que apunte. El núcleo claro es la zona de impacto; el halo exterior es decorativo.

Cada descarga aceptada resta exactamente **5 puntos de energía** (5% de la barra máxima). Solo puede impactar una vez por descarga. Se respetan escudo, UHT e invulnerabilidad. El rayo se cancela al derrotarlo o reaparecer. Las plataformas no detienen este rayo especial.

No se recibió una imagen nueva de muerte del jefe: se usa inclinación y desaparición de su propio sprite, sin cambiarlo por otro enemigo.

### Victoria y salida hacia nivel 2

Tras la derrota: celebración con confeti, estallidos de estrellas y anillos de luz, mensaje ¡GANASTE!, liberación de la cámara y caminata automática hacia la derecha. Después aparece un fundido y la pantalla de entrada al siguiente nivel. Se puede pausar durante la secuencia. Con partículas desactivadas se conserva el mensaje y la transición.

**El nivel 2 todavía no está construido.** Esta versión llega a una pantalla que lo indica, sin inventar un recorrido nuevo. Permite volver a jugar o ir al inicio. La victoria queda registrada en `milk-v5-progress`; el guardado previo de checkpoints y ajustes se conserva.

## Integración futura del nivel 2

`js/level-flow.js` contiene los estados idle → celebrate → walk → fade → done. Al terminar el fundido, game.js emite una única vez `milk:level-transition` con `{from:1,to:2,hp,score,caps}`.

Para conectar el nivel real, registrar antes de la transición:

```js
window.MilkLevels = window.MilkLevels || {};
window.MilkLevels[2] = {
  start(payload) {
    // Inicializar aquí el escenario real del segundo nivel.
    // Esta función pasa a ser responsable de su carga y bucle de juego.
  }
};
```

Si existe ese manejador, se invoca en lugar de mostrar el aviso de nivel pendiente. El juego anterior queda detenido en su estado final. El evento permite además conectar guardado o telemetría propios; no debe iniciar otra vez el nivel si ya se usa el manejador.

## Correcciones incorporadas

La base adjunta era V4.0.0. Se incorporan las correcciones de la auditoría: eventos de muerte/impacto con especie separada, recuperación de caídas por checkpoint, objetos agotados no recogibles, calor que respeta invulnerabilidad, enfriamiento con dt, 172 gotas posibles incluyendo cajas y limpieza de nodos de audio. Volumen cero no genera sonidos básicos. En la celebración la botella permanece visible y no recibe más ataques.

## Validación

- `npm test`: 69 pruebas automáticas, incluidas 12 nuevas de V5.
- Prueba real en Chromium: carga, rayo de 5%, disparo chocolatado, derrota del jefe con X, celebración, avance automático, pausa/reanudación, fundido, evento único, guardado y reinicio. Sin errores JS ni recursos HTTP faltantes en esa sesión.
- Revisión visual de jefe, rayo, chocolatada, victoria y pantalla de transición.
- La pelea se probó entrando directamente a la arena con la herramienta de desarrollo; no equivale a una partida manual completa desde el comienzo. No se verificó en un celular físico ni en Safari.
- Las imágenes originales se conservan en originales-v5. El importador opcional tools/import_v5.py requiere Pillow, NumPy y SciPy; no son necesarias para jugar. Realiza recortes de sprites y eliminación de fragmentos de cuadros vecinos.

Se conserva el sistema de fondos actual. La reducción de memoria de las capas y la unificación general de colisiones de todas las balas siguen siendo trabajos posteriores; esta versión incorpora detección por segmento para el rayo del jefe.

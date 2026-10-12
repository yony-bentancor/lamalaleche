# La Mala Leche 1 · V13.0

## Cambios
- Menú principal adaptable: dos columnas en escritorio, una en teléfonos estrechos. Todos los botones siguen accesibles con desplazamiento vertical.
- Fondo oscuro aplicado al contenedor completo: ya no termina antes de las últimas opciones.
- Joystick mediante Gamepad API, integrado con los cinco niveles, pausas, ajustes y selección de recorridos. Zona muerta del stick y liberación de controles al perder foco o desconectar el mando.
- Epílogo de tres escenas al completar el nivel 5: regreso a casa, créditos y resultados. Se puede avanzar, saltar y repetir. Reutiliza las ilustraciones existentes.
- Partidas y configuraciones anteriores conservan sus claves de guardado.

## Joystick (mapa estándar)
| Acción | DualShock 4 |
|---|---|
| Mover | Stick izquierdo / cruceta |
| Saltar / nadar | ✕ |
| Disparar | □ |
| Correr | R1 / R2 |
| Agacharse / bucear | Abajo |
| Volar en nivel 4 | Arriba |
| Torbellino del nivel 5 | △ |
| Pausa | OPTIONS |
| Elegir opción | Cruceta / stick |
| Confirmar | ✕ |
| Volver / cerrar pausa | ○ |

## Comprobar en PS4
Abrí `joystick-test.html` desde el mismo hosting y presioná botones.
La compatibilidad del navegador de la consola NO está confirmada. Que el mando controle el navegador no significa que este exponga Gamepad API. Si el diagnóstico indica que no hay API o no aparecen valores, el juego no puede obtener esos controles desde esa página. Alternativa: conectar el mando a una computadora con un navegador compatible.
No se convierte el juego en una aplicación nativa de PlayStation.

## Publicar
Reemplazá los archivos del sitio por el contenido de esta carpeta, incluyendo los dos JS nuevos, finish-menu.css y joystick-test.html. Conservá assets completo. No subas únicamente index.html. No se publicó automáticamente en tu hosting.
Abrí la URL con `?v=13` y recargá; si persiste la versión anterior, borrá la caché del sitio.
Para ejecutar localmente: `npm start` y abrir http://localhost:3000.

## Validación
La suite de pruebas existente pasa en Node. Revisión en Chromium: menú a 1920×1080, 1280×720, 800×600 y 390×844, sin desbordamiento horizontal; inicio y pausa con mando simulado; epílogo automático del nivel 5, resultados y regreso al menú sin errores JavaScript. La compatibilidad física del mando y del navegador PS4 requiere una prueba en la consola.

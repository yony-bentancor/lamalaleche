# La Mala Leche · V12.3

Versión completa: los cinco niveles y todos sus recursos. No es un parche.

## Iniciar
Descomprimí en una carpeta nueva. Con Node.js instalado, ejecutá INICIAR.bat en Windows, o `npm start`. Abrí http://localhost:3000.
Para conservar las partidas del navegador, usá el mismo navegador y la misma dirección/puerto que antes. Los guardados V12 del nivel 5 siguen siendo compatibles. Conservá una copia de tu versión anterior.

## Correcciones
- Nivel 5: perlas, puntos y enemigos derrotados permanecen coherentes después de morir o volver a la última bandera. No reaparecen recompensas ya contabilizadas.
- Validación de guardados incompletos/antiguos del nivel 5, con valores seguros.
- El consumo del torbellino se guarda inmediatamente en el checkpoint. Salir y continuar ya no lo recarga.
- Cámara lenta del nivel 5 aplicada también a la simulación.
- Controles táctiles del nivel 5 fuera del escalado del escenario: botones de al menos 44 px y distribución específica en vertical. Menú de pausa adaptado a vertical.
- Caché con ETag y revalidación: recursos sin cambios responden 304; las modificaciones se vuelven a descargar.
- Identificación de versión actualizada en menú, paquete y servidor.

## PLUS visual · Estela bioluminiscente
Al nadar con velocidad, la botella deja una estela turquesa de partículas luminosas que se desvanecen. El torbellino genera un anillo de presión luminoso y suave.
El efecto respeta Partículas y efectos de agua y la preferencia de movimiento reducido. La estela reduce su frecuencia en calidad media y deja de generarse en calidad baja; tiene un límite de 24 partículas. No consume imágenes nuevas.

## Verificación
Pasan las 14 suites originales y las 6 nuevas regresiones de tests/v12_3.test.cjs. Se verificaron sintaxis JavaScript y respuestas HTTP 200/304 del servidor.
No fue posible ejecutar un navegador en el entorno de preparación: quedan pendientes la comprobación visual en movimiento, sonido, FPS y tacto en dispositivos reales.
Esta entrega mantiene los fondos originales de V12; no reemplaza el arte ni altera la geometría de los precipicios. Las uniones entre escenarios siguen siendo una mejora futura.

# La Mala Leche · V11

## Ejecutar
Descomprimí el ZIP completo en una carpeta nueva. Ejecutá `npm start` y abrí http://localhost:3000. Requiere Node.js; no necesita instalar paquetes. También podés abrir index.html directamente.

## Cambios
- Reemplazo de limón (8 cuadros), perro (8), barista (12), lata (8) y nubarrón (8), conservando transparencia y comportamientos.
- Fotogramas separados por silueta, sin cortar brazos en los límites de una cuadrícula. Alineación de pies, orientación del perro y dimensiones estables.
- Tamaños de dibujo: botella 142 px de alto; limón hasta 100 px; lata 76 px; perro aproximadamente 82 px; barista hasta 164 px. La nube mantiene el cuerpo a altura fija y usa los cuadros de descarga al atacar.
- Nuevo prólogo visual «Bajo la superficie»: descenso desde el cielo, entrada al agua y fondo submarino animado por capas.
- Acceso directo desde el menú y botón de continuación al completar el nivel 4. El puntaje se transfiere.
- Nivel 5 sin enemigos, coleccionables, daño ni controles de desplazamiento. Es una presentación del futuro nivel, no un nivel jugable completo.
- Pausa, repetir transición y regreso al menú. Fondo generado en canvas sin recursos externos.
- Versionado 11.0.0. Se conservan las claves de guardado anteriores para mantener el progreso en el mismo navegador y origen.
- Servidor escucha en 0.0.0.0 y respeta PORT para despliegue en Heroku.

## Continuidad
La botella deja atrás la tormenta y ve la granja, pero una ráfaga la desvía al agua. La escena submarina queda preparada para diseñar el recorrido del nivel 5 más adelante.

## Verificación
La batería existente de pruebas de física, combates, checkpoints y niveles 1–4 pasa mediante `npm test`.

El prólogo también se verificó ejecutando su secuencia y dibujo canvas: puntaje, pausa, repetición y salida. No se pudo completar la prueba en navegador real en este entorno.

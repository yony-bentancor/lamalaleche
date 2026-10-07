# Caja Registradora — arte de V7

Se generó una lámina original usando la herramienta integrada de generación de imágenes (no CLI). Se recortaron y redujeron sus tres poses preservando el canal alfa. La lámina generada no sustituye ningún personaje aportado por el usuario.

Archivos consumidos por el juego:

- `assets/level2/register-0.png`: cerrado.
- `assets/level2/register-1.png`: lector activo.
- `assets/level2/register-2.png`: cajón abierto.

El rayado del láser, el parpadeo de impacto, la inclinación al caer, la iluminación y las partículas se animan por código. Las tres imágenes son poses discretas, no una animación esquelética.

Prompt usado:

> Use case: stylized-concept. Asset type: production sprite sheet for a 2D side scrolling platformer called La Mala Leche. Create ONE transparent PNG sprite sheet, 3 equal horizontal cells in a single row, 1536x1024 landscape if possible, generous transparent padding and no overlap. Each cell contains the EXACT SAME evil giant supermarket CASH REGISTER boss, at identical scale, facing left in very slight 3/4 view. Hand-painted richly textured cartoon game illustration with crisp dark outlines, subtle volume, worn steel blue metal, red/magenta accent lights, cream keys, scanner with a single angry red eye. Mechanical monster, no human arms/legs. Standing on a chunky dark steel base. Detail of scuffs, screws, brass hardware, specular paint matching a dramatic night supermarket. The body is taller than wide, 1.15 height/width. Left cell: drawer CLOSED, screen with angular angry red eyes; middle cell: same machine, scanner charging red but NO extended beam; right cell: same machine drawer OPEN facing left, glowing warm gold money and coins inside, clear weak spot. Frames have the same top and foot baseline. Keep all objects fully inside their cells, no cropping, no background, no floor, no separate shadows. No text, no labels, no extra characters, no speech bubbles. Actual alpha transparent background. Finish should be polished painterly game art, not a flat vector icon or a glossy 3D render.

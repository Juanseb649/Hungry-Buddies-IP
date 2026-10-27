# Dirección visual: Ketchup contra Mostaza

Hungry Buddies es un duelo entre dos amigos en la mesa. La interfaz se usa
con una mano, en el teléfono, mientras se come. Cada jugador tiene un
condimento: el jugador A es **Ketchup** y el jugador B es **Mostaza**. Ese
par de colores es la identidad de la app y aparece en todo lo que pertenece
a un jugador.

## Lo memorable

**La pila de platos.** Cada punto es un plato. En el resultado, los platos
de cada jugador se apilan uno sobre otro y gana la pila más alta.

**La salpicadura.** Al empezar y al terminar una partida, una salpicadura de
ketchup y mostaza cubre la pantalla y se abre hacia la siguiente. Al terminar,
el color del ganador va adelante.

## Color

| Token        | Claro     | Oscuro    | Uso                                   |
| ------------ | --------- | --------- | ------------------------------------- |
| `--mesa`     | `#E6EFEA` | `#16211F` | Fondo: melamina verde pálido          |
| `--plato`    | `#FFFFFF` | `#22302D` | Superficies (platos, hojas, diálogos) |
| `--tinta`    | `#1E2940` | `#EEF3F0` | Texto principal                       |
| `--borde`    | `#B7CBC1` | `#3A4D48` | Bordes y separadores                  |
| `--ketchup`  | `#D3263A` | `#FF5A69` | Jugador A                             |
| `--mostaza`  | `#E8B100` | `#F5C431` | Jugador B                             |

El texto sobre mostaza siempre es `--tinta` (nunca blanco) para mantener
el contraste.

## Tipografía

- **Bagel Fat One**: títulos y nombres en campos de jugador. Redonda, gorda,
  como letrero de diner. Solo en tamaños grandes. Su "0" casi no tiene hueco y
  se lee como una mancha, así que **nunca se usa para números**.
- **Figtree**: todo el texto de interfaz y lectura. Los números (marcador,
  contador, estadísticas) van en Figtree 800 con cifras tabulares.

Escala (razón ~1.25): 14 / 16 / 20 / 25 / 31 / 39 / 61 px. Interlineado
1.5 para texto, 1.0–1.1 para Bagel. Sin mayúsculas sostenidas en
etiquetas.

## Layout

Una sola columna, alineada a la izquierda, ancho máximo 480 px centrado en
escritorio. Las acciones principales viven en una barra fija abajo, en la
zona del pulgar.

```text
+---------------------------+
| ☰  Hungry Buddies         |  <- el menú lateral sale por la izquierda
|                           |
| [Ana 7]   vs   [Luis 5]   |  <- marcador, colores de jugador
|                           |
| [Ketchup | Mostaza]       |  <- a quién le estoy anotando
|                           |
| 🍔 Hamburguesa  3 pts [-1+]|
| 🍟 Papas        1 pt  [-0+]|
| ...                       |
|---------------------------|
| [   Ya vamos a comer    ] |  <- barra fija
+---------------------------+
```

## Principios

1. El color dice de quién es algo; nunca se usa como decoración.
2. Nada de tarjetas. Las listas (partidas, menús, comidas, perfiles) son
   filas separadas por una línea de 2 px; lo elegido se marca con una barra
   a la izquierda. Las cifras (récords, estadísticas) van sueltas bajo una
   línea de tinta. Los radios grandes quedan solo para lo que se toca
   (botones, contadores) y para los marcadores de color de cada jugador.
   Nada de sombras grises difusas.
3. Botones grandes (mínimo 48 px) y texto que dice exactamente qué pasa.
4. Los números siempre en Figtree 800; Bagel solo para palabras.
5. Movimiento con intención: bienvenida al abrir, salpicadura de condimento
   al empezar y al terminar una partida (con el color del ganador), pilas de
   platos en el resultado, y transiciones suaves entre pantallas. Todo se
   apaga con `prefers-reduced-motion`.

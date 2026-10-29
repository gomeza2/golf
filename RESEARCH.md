# Referencias y decisiones — pistas, copa y cámara

Se consultaron fuentes primarias para orientar esta entrega. Las decisiones de equilibrio se comprobaron en nuestro motor; no se atribuyen a otro juego fórmulas de física que no publica.

- [Golf Battle, Miniclip](https://www.miniclip.com/games/golf-battle): presenta una experiencia directa y partidas de seis jugadores en tiempo real. Tomamos como referencia la lectura rápida del campo y el control directo; el club conserva sus propias pistas, turnos y reglas.
- [Personalización de Golf Battle, soporte oficial](https://support.miniclip.com/hc/en-us/articles/360011213513-Customize-Golf-Battle): distingue elementos visuales de palos con estadísticas. Aquí los tres controles mantienen la misma física, sin mejoras de pago ni potencia distinta por jugador.
- [Regla 13, R&A](https://www.randa.org/rog/the-rules-of-golf/rule-13): contempla jugar con la bandera en el hoyo y la bola por debajo del green. Centramos un mástil físico fino y mantenemos la caída real en la copa, con interior gris para verla. Es minigolf a escala arcade, con el criterio propio de captura documentado en el motor.
- [Colliders de Rapier](https://rapier.rs/docs/user_guides/javascript/colliders/): recomienda la corrección de aristas internas para evitar contactos fantasma. Se conserva esa corrección; se añaden esquinas redondeadas coherentes entre gráficos y colisión y una unión matemática continua de la rampa de entrenamiento.

## Cambios de diseño y evidencia

1. Cerrar rendijas laterales accidentales de menos de 0,9 m en obstáculos transversales sin giro; no abrir pasos donde una pelota de 0,44 m apenas cabe. Los pasos intencionados del nuevo jardín superan esa holgura. El agua y los huecos previstos de los puentes siguen siendo obstáculos reales.
2. Jardín: dos islas oblicuas y arena lateral, con chicana abierta. Torre: rampa que llega exactamente a las cotas 0 y 2,4 y banda curva superior. Péndulo: se eliminan los pequeños bolsillos de los extremos de las bandas. Se conservan nombres y selección de los recorridos.
3. Modo Mirar: giro, inclinación y distancia limitados alrededor de la pelota o del campo. Ratón y tacto no alteran el ángulo del tiro ni gastan golpes; al volver a apuntar se recupera el seguimiento normal.
4. Calibrado anterior (v5): de 14 a 15,2 de velocidad máxima (+8,6 %). El tramo hasta 80 % no cambia; el suplemento aumenta de forma continua y cuadrática por encima de ese punto. La velocidad vertical inicial sigue siendo cero y la guía mide como máximo 2,4 m.
5. La copa utiliza un único cilindro visual en lugar de las 33 cajas de su representación anterior; los colliders físicos del recipiente se conservan. El soporte lateral del green y la textura de césped más suave se aplican a los 18 hoyos.
6. Las rondas de 18 y 9 se completan con rutas recalibradas, sin recolocaciones ni penalizaciones. Se comprueba soporte físico del suelo en una cuadrícula de los seis primeros hoyos, uniones de rampa, huecos, mástil y límites de cámara. Los récords nuevos usan reglas v5; las marcas v4 permanecen en su clave anterior sin mezclarse.

Pendiente: sesiones prolongadas en teléfonos físicos, más rutas de jugadores humanos y mediciones de concurrencia del servidor online. No se presenta el hosting público del servidor como implementado.

## Medición de potencia v6

La versión 0.2.0 sustituye la escala anterior por una referencia obtenida con el motor real: pelota de radio 0,22, velocidad vertical inicial cero, amortiguación 0,38, resistencia de césped 0,016 por paso y simulación a 60 Hz. La pista de medición de pruebas mide 100 × 100, sin obstáculos ni superficies especiales y con la copa alejada de la trayectoria. Es una configuración exclusiva de pruebas; no altera los campos jugables.

Se midieron 21 velocidades y sus distancias de parada. `shared/power.ts` interpola la velocidad necesaria para una distancia de referencia proporcional al porcentaje entre 20 y 100 %. Debajo del 20 % se aplica una transición suave para permitir toques pequeños. Las pruebas vuelven a medir los tiros reales: 50 %, 60 % y 70 % tienen incrementos próximos entre sí. No se dibuja una trayectoria calculada ni se promete esa distancia sobre arena, rampas o con colisiones. Si cambia la fricción o amortiguación, hay que recalibrar y verificar esta referencia.

El máximo pasa de 15,2 a 15,8 de velocidad (+3,9 %). Los turnos de 30 segundos y los resultados relativos al par son decisiones propias de ritmo y presentación; la investigación anterior no publica fórmulas internas de Golf Battle y no se atribuyen a ese juego estos valores.

# Dominar el golpe — 0.18.0

## Qué se encontró

- La zona de cancelación de Retroceso exigía al menos 12 px y la curva normal usaba 180 px para 100 %. Su mínimo efectivo era 6,7 %, lo que dificultaba los putts muy cortos.
- La interfaz decía «soltar para tirar» incluso al volver a la zona que cancelaba.
- Más ajustes no mostraba los deslizadores de dirección/potencia de Retroceso y Precisión por una regla CSS incondicional.
- Precisión mostraba potencia sin una lectura clara del ángulo que también oscila. No se podía comparar la suelta con la referencia elegida.
- La duración del gesto usaba el momento de procesamiento del handler; ahora se toma el instante del evento de entrada cuando su reloj es compatible.

## Retroceso

El modo normal conserva dirección opuesta al arrastre, 180 px para potencia máxima y cancelación por debajo de 12 px. Volver al círculo antes de soltar cancela y restaura la preparación, sin gastar un golpe. Escape y pérdida de foco conservan su cancelación.

**Arrastre fino** es opcional y se activa con la pelota detenida. Ofrece 3–35 % de potencia real con el mismo gesto; no cambia la dirección ni la velocidad que corresponde a un porcentaje determinado. El máximo de referencia pasa a 35 % y los accesos de potencia son 3/10/20/35 %. Desactivarlo recupera el rango normal. No se puede cambiar la sensibilidad mientras se arrastra.

La sensibilidad se reinicia al cambiar jugador, hoyo o ronda y al recargar. No se altera el esquema elegido para la partida ni se cambia de control a mitad de ronda. Los guardados anteriores se mantienen.

## Precisión

En Más ajustes se preparan dirección y referencia de potencia. La referencia elegida se conserva después del golpe. Al iniciar un gesto, el panel expandido se cierra automáticamente para dejar visible la cancha. Mantener el botón o Espacio inicia las oscilaciones existentes; soltar ejecuta el mismo golpe normal. Potencia oscila entre 4 y 100 % en 1,5 s y dirección hasta aproximadamente ±6,9° en 1,1 s. Los ritmos siguen siendo deterministas.

La barra señala la referencia elegida y un indicador separado muestra el desvío angular. «En tu ventana» significa que la entrada actual está a un grado y 2,5 puntos porcentuales de tu referencia. Es información del control: no garantiza acertar el hoyo, no corrige automáticamente la suelta y no añade fuerza.

Al soltar se registra una lectura transitoria: potencia enviada, referencia inicial y giro/desvío. Se limpia al preparar otro gesto o cambiar de jugador/ronda. No se almacena como puntuación ni como estadística competitiva. Los clics de compatibilidad táctil de la suelta no accionan otros botones cuando se encoge el panel; un toque nuevo sigue permitiendo pausar normalmente. Una pérdida de captura cancela y restaura la preparación; pulsaciones inferiores a 150 ms siguen cancelándose.

Los eventos de ratón, tacto y teclado aportan su marca temporal. Si un navegador usa un reloj incompatible, se utiliza el reloj local de rendimiento. La física y sus reglas permanecen iguales; los resultados se validan con el motor existente.

## Compatibilidad y pruebas

Clásico, online Clásico, circuitos, entrenamiento, escuela, editor, comunidad y récords se conservan. Reglas 7, protocolo 14 y documentos/guardados 1 permanecen. La sensibilidad fina no introduce un golpe elevado ni una fuerza adicional.

- Pruebas de reglas/física: arrastre normal y fino, límites, ángulo envuelto de la lectura, marcas temporales incompatibles y las regresiones existentes.
- Playwright: volver al centro y cancelar, putt fino físico, referencia acotada, desvío en vivo, suelta única, marca temporal nativa, pérdida real de captura y arrastre fino mediante eventos táctiles.
- Los casos anteriores de teclado, cancelación, multidedo, escuela y bloqueo del esquema se siguen ejecutando.
- Capturas de controles en `work/controls-*.png`, conservadas como artefacto de CI junto con la primera partida.

Faltan ensayos con personas en teléfonos físicos, ratón, trackpad y teclados: precisión a bajas potencias, comprensión de referencia frente a resultado, fatiga del arrastre, ventanas de suelta y legibilidad en horizontal. Las pruebas automáticas no demuestran diversión ni comodidad para todas las personas.

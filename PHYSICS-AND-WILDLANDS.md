# Física 2 y Tierras bravas · 0.19.0

## Objetivo y alcance

Abrir decisiones de fuerza, altura y riesgo manteniendo el golpe normal y la base anterior. No hay impulso vertical de salida, asistencia al hoyo ni predicción completa. Clásico, Retroceso y Precisión envían el mismo ángulo/potencia al mismo motor; online conserva Clásico y simulación del servidor.

## Potencia y contactos

La curva original permanece exacta entre 0 y 75 %. El cuarto superior suma distancia mediante una transición suave, hasta 20 m/s frente a 16,2 de la edición original. La distancia medida en césped plano es aproximadamente 33–35 m frente a 26; no es una promesa sobre arena, pendientes o rebotes. No se duplican de golpe las distancias entre porcentajes próximos.

Antes de un contacto descendente se consulta la normal real de Rapier. Solo una aproximación al suelo suficientemente rápida permite restitución: césped 0,32; arena 0,08; rough 0,18; tierra 0,40. El contacto quieto permanece inelástico. Las bandas conservan su amortiguación; no reciben una fuerza vertical adicional. El límite de energía protege frente a mecanismos, sin sustituir fricción, gravedad o colisiones. El aterrizaje tiene un evento distinto de banda para no completar incorrectamente la lección de rebotes.

La salpicadura usa la altura de la zona de agua que causa la penalización, también en campos suspendidos. No se añaden texturas, modelos remotos o dependencias.

## Campos nuevos

| Campo                  | Par / recorrido amplio | Decisión                                                                                                                               |
| ---------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| El salto de la presa   | 6 / 94 m               | Carril amplio y vuelta exterior o rampa de 2,5 m sobre un hueco real de agua. Un salto corto falla; hay recuperación con penalización. |
| La escalera del trueno | 8 / 160 m              | Tres niveles a 8/4/0 m, traversas de 32 m y rampas o caída directa difícil. Arena para frenar en el nivel intermedio.                  |
| El delta bifurcado     | 7 / 90 m               | Izquierda ancha con compuerta, puente derecho elevado o cadena central estrecha con barrera giratoria.                                 |

Las longitudes describen el recorrido amplio, no la distancia recta salida–copa. El agua entre plataformas es real, no un rectángulo de césped invisible. Course define tanto lo visible como las colisiones. El mapa muestra los ciclos deterministas de los mecanismos; esperar es una decisión válida.

Se añaden al final de los índices: 34 hoyos físicos, 13 selecciones y 38 prácticas. No se cambian las vueltas de 9/18, banderas alternativas ni claves anteriores. La cámara existente encuadra el volumen real y conserva seguimiento, vista de campo y exploración limitada.

## Compatibilidad y datos

- Reglas de puntuación: 7. Protocolo online: 15; actualizar cliente/servidor juntos.
- `State.physics = 2`: nueva ronda oficial. Sin marcador equivale a 1 para recuperar datos originales.
- Guardado 2 exige física 2; guardado 1 admite original/sin marcador. Se rechazan combinaciones incoherentes. Clientes viejos rechazan formato 2 en lugar de simularlo con reglas incorrectas.
- Snapshot genuino de 0.18, capturado durante un golpe: `tests/fixtures/v018-inflight.json`. La prueba compara su trayectoria futura original con la recuperación actual, además de permitir otro golpe con la velocidad original.
- Los desafíos diarios/semanales c1 mantienen física 1, identidad y resultados anteriores. La evaluación rechaza una ronda con física 2 bajo esas mismas reglas c1.
- Documentos del taller 1, revisiones publicadas y salas de creaciones mantienen física 1. No se altera el checksum ni se migra geometría/DB. Adoptar física 2 en creaciones necesita un futuro documento versionado y elección explícita del autor.
- Récords originales siguen en `club-personal-normal-v7` / `club-practice-v7`; se muestran en «Marcas anteriores · física original». Los nuevos usan sufijo `-p2`. No se mezclan marcas de reglas físicas distintas ni se borran datos. Preferencias, progreso de escuela y nombres permanecen.

## Verificación reproducible

`npm test` incluye gotas físicas sobre cuatro superficies, drive máximo/medio, choque lateral sin elevación, continuidad de potencia, recuperación del snapshot original y separación de récords. `tests/wildlands.test.ts` completa rutas amplias [5,7,6], arriesgadas [3,4,4] y elevada del delta [6], mediante golpes/ticks normales sin recolocar pelotas ni asignar resultados. Un duelo real acaba 18–11, con honores en la salida siguiente. También prueba salto insuficiente, penalización, nuevo intento y recuperación exacta de un guardado en vuelo.

`tests/e2e/wildlands.spec.ts` verifica partida con controles reales del navegador, mapa/compuerta, archivo de marcas y guardado original en móvil, además de dos sockets con puntuación autoritativa. El cliente no puede escoger física antigua enviando un campo extra a una sala oficial nueva. `tests/pages/published.spec.ts` comprueba el atajo de la presa en móvil bajo el prefijo de producción.

Las rutas de prueba no se importan en el juego ni proporcionan ayudas al jugador. Las pruebas no demuestran diversión humana. Las capturas se revisan para encuadre/legibilidad; móvil emulado no equivale a rendimiento en teléfono físico.

## Pendiente y siguiente fase

Evaluar con personas la comprensión de alturas, la dificultad real de las ventanas y cuánto castiga el agua. Medir rendimiento en teléfonos físicos y varias salas concurrentes. Estudiar documento 2 para adoptar explícitamente física nueva en el taller, sin cambiar versiones publicadas. La comunidad pública sigue necesitando PostgreSQL/OIDC/moderación reales; esta entrega no finge provisionarlos ni agrega variables de entorno.

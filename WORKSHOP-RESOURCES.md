# Taller con decisiones — 0.21.0

Esta entrega amplía las herramientas del taller; no sustituye los 34 hoyos oficiales ni presenta ejemplos como publicaciones de jugadores. Los tres controles, modos, 13 selecciones, 38 prácticas, guardados, récords y documentos anteriores se conservan.

## Tres piezas con colisión real

En el taller, **Activar recursos avanzados** pide confirmación y convierte explícitamente el borrador a **documento 3, física 2**. Deshacer recupera el documento anterior. No convierte automáticamente archivos, biblioteca ni revisiones publicadas.

- **Barra giratoria:** gira 360° de forma continua, a 0,8 rad/s. A diferencia del obstáculo oscilante anterior, recorre un círculo completo. La validación usa el radio de toda la diagonal para impedir que el barrido salga del área o atraviese la salida/copa. Misma pose en Rapier, escena y mapa.
- **Puerta elevable:** reutiliza el mecanismo vertical existente, con 1,6 m de desplazamiento y 0,9 m de cuerpo. Se valida también su volumen vertical sobre la salida. El mapa distingue abierto/cerrado mientras corre la simulación.
- **Tierra:** reutiliza la superficie física existente, con mayor resistencia de rodamiento y respuesta de aterrizaje propia; no es solamente un cambio de color. Galería, plano y mapa la representan y permiten filtrarla.

Se mantienen los límites de 60 KB/80 piezas, área 24 × 48 m, pendientes 1:2, alturas 0–4 m y presupuesto online. Los mecanismos nuevos cuentan en el mismo presupuesto de ocho mecanismos. El editor no certifica automáticamente que toda ruta sea divertida o completable.

## Dos diseños editables

**El pulso del puente**, par 5: un rodeo ancho y un puente estrecho sobre agua, junto a una barra de giro completo. La ruta amplia se completó físicamente en cuatro golpes sin penalizaciones. Un as también es posible: un caso determinista espera 55 ticks y golpea con ángulo 0/potencia 0,914. Es una comprobación de posibilidad, no una ayuda de trayectoria ni garantía de que sea fácil para una persona.

**La esclusa de tierra**, par 5: camino amplio con puerta elevable y subida gradual, frente a viaducto estrecho de dos metros de altura con tierra. Rutas físicas comprobadas de cuatro y tres golpes, sin recolocar la pelota ni inyectar puntuaciones. La puerta exige observar el momento del paso; las pruebas deterministas no sustituyen el equilibrio humano.

Antes de abrir un diseño, el taller conserva el borrador modificado en la biblioteca. Si la biblioteca está llena o falla el almacenamiento, no reemplaza el borrador. Los ejemplos se pueden modificar, exportar, probar, invitar mediante una sala privada y publicar cuando la comunidad real esté configurada. No son creaciones públicas precargadas.

**Mapa** en prueba 3D y juego individual comunitario usa el mapa existente con el Course compilado real; muestra terrenos y pose de mecanismos en movimiento. No altera la física ni pausa el reloj de los mecanismos.

## Compatibilidad e infraestructura

- Documentos 1 y 2 conservan canonicalización y comportamiento. Los hashes anteriores se comparan con una copia real de 0.20.0, no con valores recalculados por la implementación nueva.
- Documento 3 requiere física 2 y habilita las tres piezas. Para volver a documento 1 hay que retirarlas primero. No existe una edición física 3.
- Publicaciones conservan JSONB, identidad SHA-256 y revisiones inmutables. Capacidad anunciada `[1,2,3]`; esquema PostgreSQL 1 sin migración estructural nueva. Una revisión avanzada sigue pasando por autoría y moderación reales.
- Protocolo **17**: desplegar cliente y servidor juntos. Reglas 7, guardados 1/2 y récords separados permanecen.
- `COMMUNITY_MIGRATE_ON_START=true` habilita preparación opcional al arrancar para hosting sin Shell. Crea un esquema vacío si falta, conserva el existente y rechaza versiones superiores. Un fallo no impide abrir el golf oficial ni sus salas.
- `community:check` / `community:check:production` comprueban base/esquema y descubrimiento/claves OIDC con mensajes que no muestran conexiones privadas ni tokens. Identifican las comprobaciones que aún exigen una sesión real; no certifican automáticamente audiencia ni propiedad de una cuenta moderadora.

[FREE-COMMUNITY-SETUP.md](FREE-COMMUNITY-SETUP.md) detalla Neon Free + Auth0 Free sobre el Render existente. No se han creado cuentas ni configurado credenciales de producción por el propietario. La galería seguirá indicando su disponibilidad real.

## Verificación y siguiente fase

Pruebas de formato/hash, barrido completo, presupuesto, colliders cinemáticos, fricción real, rutas y as; PostgreSQL real para preparación vacía, conservación de publicaciones, versiones futuras, filtros y diagnóstico OIDC. Navegador comprueba confirmación/deshacer, exportación, recuperación del borrador, límite de biblioteca, mapa móvil, rutas físicas y salas compartidas. Las comprobaciones públicas se ejecutan contra el despliegue y quedan registradas en GitHub Actions.

Falta activar las cuentas externas del propietario, verificar una sesión real de moderación y una publicación tras reinicio público. Después: sesiones de amigos para medir ventanas de mecanismos y riesgo/recompensa, teléfonos físicos, pruebas de concurrencia y evolución hacia colecciones de varios hoyos del taller. La permanencia depende también de cuotas y respaldos del proveedor; no se promete un servicio gratuito ilimitado.

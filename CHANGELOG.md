# Hoyo en Uno · Golf Club

## 0.4.0

- Guardado automático de una ronda o práctica local, con reanudación en pausa después de recargar o cerrar la página.
- Snapshot completo de Rapier: se conservan la pelota en movimiento, los contactos, las compuertas, el reloj, los resultados, los nombres, el control y el último punto para penalizaciones.
- Recuperación integrada en el catálogo; salir al club conserva la partida. Descartar o sustituir solo afecta al guardado en curso.
- Validación de formato/reglas/integridad y avisos ante datos dañados o almacenamiento bloqueado. Online conserva su recuperación por servidor.
- Se mantienen los 21 hoyos, ocho recorridos, potencia, físicas y récords v7. No se añadieron dependencias ni se cambió el protocolo.
- 92 pruebas de reglas/física/guardado y 29 de navegador, además de cuatro de producción.

## 0.3.0

- Club del As: tres hoyos nuevos con puente diagonal/agua, carambola y compuerta/arena; 21 hoyos en total y vueltas de 9/18 conservadas.
- Hoyo en uno real verificado en cada reto, ruta completa sin penalizaciones y recuperación después de un fallo al agua.
- Máximo 16,2 (+2,5 %) con la referencia de porcentajes recalibrada; elevación inicial cero.
- Mapas de puentes girados coherentes con su geometría y colisión.
- Marcas/protocolo v7, sin borrar claves previas ni preferencias.
- 82 pruebas de reglas/física, 24 de navegador y cuatro de producción.

## 0.2.0

- Nueva identidad y versión visible obtenida de package.json.
- Potencia calibrada por distancia de rodamiento de referencia; tramo fino bajo 20 %; máximo 15,8, sin elevación inicial.
- Flecha corta más legible, con punta plana y contorno.
- Turnos de 30 segundos y reloj destacado al quedar ocho.
- Birdie, Eagle, albatros, par, bogey y hoyo en uno calculados con el resultado real, con sonidos y avisos breves.
- Protocolo y marcas v6; las marcas v5 permanecen en sus claves anteriores.
- Conserva los 18 hoyos, vuelta de 9, tres controles, entrenamiento, medallas y pausa local.

## 0.1.0

Base de juego publicada en las entregas anteriores: físicas Rapier, 18 hoyos, salas Socket.IO, controles Clásico/Retroceso/Precisión, copa física con bandera centrada, cámara de inspección, récords, entrenamiento individual y pausa. El antiguo nombre era Club del Último Golpe. El registro detallado por fases está en [EVOLUTION.md](EVOLUTION.md).

Pendientes: alojamiento público del servidor online y sesiones prolongadas en teléfonos físicos. El guardado no incluye una instalación PWA ni una primera carga sin red.

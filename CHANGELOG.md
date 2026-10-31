# Hoyo en Uno · Golf Club

## 0.7.0

- Dirección pública de Render configurada para entrar online desde Pages sin escribir una URL avanzada. La publicación queda condicionada a la comprobación del servidor público con dos clientes reales.
- Duelo por puntos también online: selección del anfitrión en el lobby, preparados reiniciados al cambiar reglas y formato conservado durante la partida/revancha. El cliente no puede sobrescribirlo al iniciar.
- Podio multijugador y reconocimientos de la vuelta basados en resultados reales, con empates compartidos y exclusión de retiros/límites cuando corresponde.
- Plazo de reconexión de 90 segundos, configurable: al vencer se registra retiro y se revoca la sesión. Un corte breve conserva la plaza; la partida continúa para los demás.
- Conexión avanzada plegada cuando se utiliza el servidor del propio enlace. Configuración Render Free lista, nombre actualizado y origen Pages predeterminado.
- Protocolo de red 8 separado de reglas físicas v7; guardados y récords locales conservados. `/health` informa versión, formatos, plazo y commit.
- Comando para verificar la URL real con dos clientes; Pages lo ejecuta al configurar un servidor público. No se presenta un backend público como activo sin comprobar su dirección.
- 122 pruebas unitarias, 37 casos de navegador y cuatro de producción. Dos pruebas adicionales del comando online se comprobaron contra la instalación Node local; no equivalen a una publicación por Internet.

## 0.6.0

- Duelo por puntos local para 2–8 jugadores: puntuación Stableford basada en par y golpes reales, clasificación, desempates y resultados por hoyo.
- Formato elegido antes de empezar, fijo en la ronda/revancha y conservado al recuperar la partida. Menos golpes sigue siendo el predeterminado; solo y entrenamiento conservan su puntuación.
- Puntos confirmados al completar el hoyo, avisos de puntos, tarjeta con golpes reales y nueva fila de par por hoyo. Honores por menos golpes del hoyo anterior.
- Guardados clásicos y marcas v7 conservados; los duelos no generan récords individuales de golpes. Online sigue a menos golpes y rechaza el intento de cambiar de formato.
- 112 pruebas unitarias, 34 casos de navegador y cuatro de producción. Una vuelta física completa con dos jugadores y recuperación termina 12–6 puntos, sin penalizaciones ni recolocación. La prueba pública también juega y recupera el formato.

## 0.5.0

- Calidad visual Automática, Ahorro y Alta, seleccionable en ajustes y persistente durante y entre partidas.
- Resolución interna y sombras adaptables mediante observación de fotogramas reales, ventanas de estabilidad y espera entre niveles.
- Suspensión del dibujo en pestañas ocultas y reinicio de la observación al volver. La simulación local y el reloj online conservan sus reglas anteriores.
- Geometría fija reutilizada entre actualizaciones; sombras encuadradas para pistas largas y mayor definición en Alta.
- Se conservan los 21 hoyos, ocho recorridos, controles, física, guardado 0.4.0 y marcas/protocolo v7. Sin dependencias nuevas.
- 99 pruebas de reglas/física/guardado/calidad, 32 de navegador y cuatro de producción. La prueba pública también cambia el buffer real y recupera la calidad tras recargar.

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

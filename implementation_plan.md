# Optimización del Service Worker de la PWA (sw.js)

Este documento describe un plan sistemático y paso a paso para auditar y refactorizar el archivo `sw.js` para la aplicación "mercado-familiar". El objetivo es mejorar las estrategias de caché, agregar resistencia sin conexión y modernizar el código.

## Revisión del Usuario Requerida

> [!IMPORTANT]
> Por favor, revisa las fases propuestas a continuación. ¿Tienes alguna preferencia por una estrategia de caché específica (por ejemplo, Stale-While-Revalidate, Network First) para las peticiones a la API o el contenido dinámico?

## Cambios Propuestos

Ejecutaremos esta refactorización en 3 fases distintas para asegurar que podamos verificar la funcionalidad en cada paso.

### Fase 1: Modernización y Mejoras en el Ciclo de Vida

Actualizaremos los eventos del ciclo de vida `install` y `activate` para usar la sintaxis moderna `async/await` y aseguraremos que el Service Worker se actualice sin problemas sin requerir que el usuario cierre todas las pestañas.

#### [MODIFY] sw.js
- Convertir los listeners de los eventos `install` y `activate` para que usen `async/await`.
- Agregar `self.skipWaiting()` en el evento `install` para que los nuevos service workers se activen inmediatamente.
- Agregar `self.clients.claim()` en el evento `activate` para que el service worker tome el control de la página inmediatamente tras su activación.

### Fase 2: Estrategia de Fetch Mejorada y Caché Dinámico

El listener `fetch` actual usa una estrategia básica de Cache-First (Primero en Caché) pero no guarda en caché nuevos recursos ni maneja las fallas de red de manera elegante.

#### [MODIFY] sw.js
- Implementar una estrategia **Stale-While-Revalidate** (Obsoleto mientras se Revalida) o **Cache First con Respaldo de Red** (Primero en Caché con Fallback a Red).
- Agregar **Caché Dinámico**: cuando un recurso se obtiene de la red y no estaba en la caché, agregarlo a una caché dinámica para que esté disponible sin conexión más tarde.
- Agregar un respaldo sin conexión (fallback, por ejemplo, una página offline.html) si tanto la caché como la red fallan al navegar.

### Fase 3: Limpieza de Código y Mejores Prácticas

#### [MODIFY] sw.js
- Separar los nombres de la caché estática y dinámica (por ejemplo, `static-v1`, `dynamic-v1`).
- Agregar lógica de versionado de caché para facilitar la actualización de las cachés en el futuro.
- Agregar comentarios y bloques de manejo de errores para hacer el código más robusto.

## Plan de Verificación

### Verificación Manual
- **Fase 1**: Verificar en las Herramientas de Desarrollo de Chrome (Application -> Service Workers) que el nuevo service worker se instala y activa inmediatamente.
- **Fase 2**: Desconectarse de internet (DevTools -> Network -> Offline) y verificar que las páginas visitadas anteriormente y los recursos aún se carguen. Verificar que los recursos dinámicos se guarden en caché.
- **Fase 3**: Verificar que la funcionalidad general de la aplicación permanezca intacta y que no aparezcan errores en la consola.

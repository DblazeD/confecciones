# Taller de Doña Ana

Catálogo público y panel para administrar un taller de confecciones y arreglos. El alcance se basa en el Excel de requisitos del proyecto. La primera revisión cubre el núcleo de la Fase 1.

## Estructura del proyecto

- `frontend/` contiene las pantallas de Next.js, los componentes, los estilos y los archivos públicos.
- `backend/` contiene las consultas, las operaciones del servidor, la autenticación, la migración de Supabase y las pruebas de base de datos.

Los dos espacios de trabajo de npm se instalan desde la raíz. Next.js ejecuta las pantallas y las operaciones del servidor en la misma aplicación.

## Ejecutar en local

Requiere Node.js 24 y npm.

```powershell
npm.cmd ci
Copy-Item frontend/.env.example frontend/.env.local
npm.cmd run dev
```

Abre [http://localhost:3000](http://localhost:3000). El catálogo queda vacío hasta publicar productos. Para probar el panel y guardar datos, completa estos pasos antes de iniciar o reiniciar el servidor.

1. Crea o selecciona un proyecto Supabase. Aplica `backend/supabase/migrations/202611230001_fase_1.sql` en el editor SQL o con las migraciones de Supabase.
2. Crea la usuaria propietaria en **Authentication → Users** con correo confirmado. Copia su UUID y asígnale acceso en el editor SQL.

   ```sql
   insert into public.owners (user_id)
   values ('UUID_DE_LA_USUARIA');
   ```

3. En `frontend/.env.local`, completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con la URL y la clave **publishable** del proyecto. Configura `NEXT_PUBLIC_SITE_URL` con la URL real de la aplicación al desplegar para que los enlaces de WhatsApp apunten al catálogo correcto.
4. Entra en **Acceso propietaria**. En **Configuración** puedes ajustar el nombre, logo, color, teléfono, WhatsApp y medios de pago que quieres publicar.

Las políticas de Supabase limitan las tablas privadas a las cuentas autorizadas. El catálogo usa vistas que exponen los campos públicos de productos publicados. El bucket de fotos permite leer como visitante únicamente las imágenes asociadas al catálogo publicado y el logo activo.

## Verificación local

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Las pruebas ejecutan la migración en PGlite con roles equivalentes a los de Supabase. Comprueban visibilidad del catálogo y fotos, permisos, cambios de existencias y reglas de pedidos. El cierre por inactividad requiere ajustar la configuración de sesión de Supabase. Falta verificar el flujo autenticado con una instancia real, medir la carga en 4G y desplegar la aplicación.

## Alcance del primer avance

| Módulo | Requisitos del Excel |
| --- | --- |
| Acceso y confidencialidad | RF-01, RF-05 |
| Catálogo y marca | RF-06 a RF-14 |
| Productos y precios | RF-25 a RF-30, RF-67 |
| Existencias | RF-32, RF-33, RF-39 |
| Pedidos y clientes | RF-48 a RF-52, RF-58, RF-60 |
| Uso en celular y computador | RF-84 |

El acceso por internet (RF-85) se completa con el despliegue. El nombre inicial es **Taller de Doña Ana**, editable desde el panel. La portada y la imagen de prendas se basan en el prototipo de Figma del proyecto.

La Fase 2 del Excel incluye ventas, pagos manuales, reportes, inventario completo, proveedores, medidas y roles. La Fase 3 incluye costeo detallado, pasarela de pagos, facturación electrónica y automatizaciones.

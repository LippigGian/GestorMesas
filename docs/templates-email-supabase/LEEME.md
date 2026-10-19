# Templates de autenticación en español

En Supabase → Authentication → Emails → Templates, abrir cada tipo de email,
pegar el asunto indicado y reemplazar el contenido por el HTML completo del archivo.
Guardar y probar el flujo correspondiente. No se aplican automáticamente a Supabase.
No requieren un template de Brevo: Brevo entrega el correo y Supabase genera su contenido.

| Opción en Supabase | Archivo | Asunto | Uso en la app actual |
| --- | --- | --- | --- |
| Confirm sign up | [01_confirmar-registro.html](01_confirmar-registro.html) | Confirmá tu cuenta — Gestor Mesas | Actual: registro de administradores. |
| Invite user | [02_invitar-empleado.html](02_invitar-empleado.html) | Te invitaron a Gestor Mesas | Actual: invitaciones de empleados. |
| Magic link or OTP | [03_enlace-magico.html](03_enlace-magico.html) | Tu enlace para ingresar — Gestor Mesas | Futuro: acceso mediante enlace mágico; no está implementado en el login actual. |
| Change email address | [04_cambiar-email.html](04_cambiar-email.html) | Confirmá el cambio de correo — Gestor Mesas | Futuro: cambio de email de acceso; no está implementado en la interfaz actual. |
| Reset password | [05_recuperar-password.html](05_recuperar-password.html) | Restablecé tu contraseña — Gestor Mesas | Actual: recuperación de contraseña. |
| Reauthentication | [06_reautenticacion.html](06_reautenticacion.html) | Confirmá tu identidad — Gestor Mesas | Futuro: verificación adicional para operaciones sensibles; no está implementada en la interfaz actual. |

Los HTML comparten fondo crema, tarjeta blanca y botón terracota, con estilos inline
para correo y fuentes del sistema. No incluyen imágenes externas, scripts ni enlaces
fijos a localhost. El nombre Gestor Mesas se puede reemplazar por el nombre de la aplicación.

## Variables que deben conservarse

- `{{ .ConfirmationURL }}` en los botones y enlaces alternativos. Supabase genera
  el enlace correcto para cada tipo de operación y su redirección configurada.
- `{{ .NewEmail }}` solo se usa en Change email address.
- `{{ .Token }}` se usa para el código de Reauthentication, que no es un enlace de acceso.
- No reemplazar ConfirmationURL por SiteURL ni RedirectTo: esas direcciones solas
  no verifican el token del usuario.

## Alcance

Se usan actualmente Confirm sign up, Invite user y Reset password.
Los otros tres se preparan para futuras funciones. Personalizar el correo no habilita
por sí solo el acceso sin contraseña, el cambio de email o la reautenticación.
El template 03 corresponde a enlace mágico. Un futuro flujo OTP necesitará mostrar
`{{ .Token }}` en ese template y verificarlo desde una pantalla de la app.

El cambio seguro de email puede requerir confirmación en el correo anterior y el
nuevo, según la configuración de Supabase. Se conserva ConfirmationURL para respetar
ese mecanismo; no se construyen enlaces manualmente.
No se indica una duración fija de los enlaces: depende de la configuración del proyecto.
Mientras las redirecciones usen localhost, abrir los enlaces en la PC que corre la app.

## Comprobación

Vista previa local con valores ficticios para escritorio y móvil. La vista de navegador
no sustituye una prueba de entrega en Gmail/Outlook. No se enviaron correos ni se cambió
la configuración remota durante la preparación de estos archivos.

Fuentes oficiales:
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/reference/javascript/auth-updateuser

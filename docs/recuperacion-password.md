# Recuperación de contraseña

En Supabase → Authentication → URL Configuration:

- Site URL: `http://localhost:5173` durante el desarrollo.
- Redirect URLs: agregar `http://localhost:5173/restablecer-contrasena`.
- En producción, agregar la misma ruta con el dominio HTTPS definitivo y cambiar
  Site URL al dominio publicado. Autorizar las URLs exactas, sin comodines amplios.

En Authentication → Email Templates → Reset Password, el enlace debe utilizar
`{{ .ConfirmationURL }}` para conservar la verificación de Supabase y `redirect_to`.
No reemplazarlo por un enlace directo a la página ni copiar tokens manualmente.

La app solicita el email con `redirectTo` basado en el origen actual. Al regresar,
Supabase valida el enlace y establece la sesión; `/restablecer-contrasena` permite
guardar la contraseña mediante `updateUser`. Los errores de enlace inválido o
vencido ofrecen solicitar un nuevo email. Los enlaces antiguos pueden volver a
la raíz: se contempla el evento `PASSWORD_RECOVERY` para abrir la pantalla correcta.

Registro y restablecimiento validan antes de enviar: mínimo de 6 caracteres,
al menos una letra mayúscula y confirmación coincidente. Los formularios muestran
ambos requisitos y marcan los que ya se cumplen. Esta validación del cliente no
reemplaza la política de contraseñas configurada en Supabase Auth.

Después de ajustar la configuración, solicitar un email nuevo y usar ese enlace.
Para pruebas desde celular, localhost corresponde al propio dispositivo; utilizar
un dominio de prueba accesible y autorizado en Supabase.

Pruebas de validación: `node --test tests/recuperacionPassword.test.cjs`.

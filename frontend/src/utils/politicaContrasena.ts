/**
 * Espejo de `service/PoliticaContrasena` del backend: las mismas reglas se
 * muestran mientras se escribe la contraseña, y el backend las vuelve a
 * exigir al crear la cuenta.
 */
export interface ReglaContrasena {
  id: string;
  texto: string;
  cumple: boolean;
}

const PALABRAS_COMUNES = [
  "password", "contrasena", "contraseña", "123456", "qwerty", "abc123",
  "admin", "paqrap", "letmein", "welcome", "bienvenido", "iloveyou",
];

export function evaluarContrasena(usuario: string, contrasena: string): ReglaContrasena[] {
  const minusculas = contrasena.toLowerCase();
  const nombre = usuario.trim().toLowerCase();
  return [
    { id: "longitud", texto: "Entre 12 y 72 caracteres", cumple: contrasena.length >= 12 && contrasena.length <= 72 },
    { id: "minuscula", texto: "Una minúscula", cumple: /\p{Ll}/u.test(contrasena) },
    { id: "mayuscula", texto: "Una mayúscula", cumple: /\p{Lu}/u.test(contrasena) },
    { id: "numero", texto: "Un número", cumple: /\d/.test(contrasena) },
    { id: "simbolo", texto: "Un símbolo (. - # ! …)", cumple: /[^\p{L}\d\s]/u.test(contrasena) },
    { id: "repeticion", texto: "Sin 4 caracteres iguales seguidos", cumple: contrasena.length > 0 && !/(.)\1{3,}/u.test(contrasena) },
    {
      id: "usuario",
      texto: "Sin el nombre de usuario",
      cumple: contrasena.length > 0 && (nombre.length < 3 || !minusculas.includes(nombre)),
    },
    {
      id: "comunes",
      texto: "Sin palabras comunes (password, admin, 123456…)",
      cumple: contrasena.length > 0 && !PALABRAS_COMUNES.some((palabra) => minusculas.includes(palabra)),
    },
  ];
}

export function contrasenaEsSegura(usuario: string, contrasena: string): boolean {
  return evaluarContrasena(usuario, contrasena).every((regla) => regla.cumple);
}

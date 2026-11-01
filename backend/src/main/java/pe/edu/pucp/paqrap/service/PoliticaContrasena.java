package pe.edu.pucp.paqrap.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Politica de contrasena segura para las cuentas de PaqRap. Se aplica al
 * crear el administrador inicial y al crear usuarios; el frontend muestra
 * las mismas reglas mientras se escribe.
 */
public final class PoliticaContrasena {

    public static final int LONGITUD_MINIMA = 12;
    public static final int LONGITUD_MAXIMA = 72;

    private static final Pattern MINUSCULA = Pattern.compile("\\p{Ll}");
    private static final Pattern MAYUSCULA = Pattern.compile("\\p{Lu}");
    private static final Pattern DIGITO = Pattern.compile("\\d");
    private static final Pattern SIMBOLO = Pattern.compile("[^\\p{L}\\d\\s]");
    private static final Pattern REPETICION = Pattern.compile("(.)\\1{3,}");

    /** Bases de contrasenas que aparecen primero en cualquier diccionario de ataque. */
    private static final List<String> PALABRAS_COMUNES = List.of(
            "password", "contrasena", "contraseña", "123456", "qwerty", "abc123",
            "admin", "paqrap", "letmein", "welcome", "bienvenido", "iloveyou");

    private PoliticaContrasena() {
    }

    /** Reglas que la contrasena no cumple; vacia si es segura. */
    public static List<String> incumplimientos(String usuario, String contrasena) {
        List<String> fallas = new ArrayList<>();
        String valor = contrasena == null ? "" : contrasena;
        if (valor.length() < LONGITUD_MINIMA || valor.length() > LONGITUD_MAXIMA) {
            fallas.add("tener entre " + LONGITUD_MINIMA + " y " + LONGITUD_MAXIMA + " caracteres");
        }
        if (!MINUSCULA.matcher(valor).find()) {
            fallas.add("incluir una minúscula");
        }
        if (!MAYUSCULA.matcher(valor).find()) {
            fallas.add("incluir una mayúscula");
        }
        if (!DIGITO.matcher(valor).find()) {
            fallas.add("incluir un número");
        }
        if (!SIMBOLO.matcher(valor).find()) {
            fallas.add("incluir un símbolo");
        }
        if (REPETICION.matcher(valor).find()) {
            fallas.add("no repetir el mismo carácter 4 veces seguidas");
        }
        String minusculas = valor.toLowerCase(Locale.ROOT);
        String nombre = usuario == null ? "" : usuario.trim().toLowerCase(Locale.ROOT);
        if (nombre.length() >= 3 && minusculas.contains(nombre)) {
            fallas.add("no contener el nombre de usuario");
        }
        if (PALABRAS_COMUNES.stream().anyMatch(minusculas::contains)) {
            fallas.add("no usar palabras comunes como «password», «admin» o «123456»");
        }
        return fallas;
    }

    /** Rechaza la contrasena con un 400 que enumera las reglas que faltan. */
    public static void exigir(String usuario, String contrasena) {
        List<String> fallas = incumplimientos(usuario, contrasena);
        if (!fallas.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La contraseña no es segura: debe " + String.join(", ", fallas) + ".");
        }
    }
}

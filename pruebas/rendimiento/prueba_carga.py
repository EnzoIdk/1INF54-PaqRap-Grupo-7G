"""Pruebas de carga, concurrencia y estres de PaqRap (solo libreria estandar).

Escenarios:
  concurrencia    N navegadores (sesiones distintas) ejecutan a la vez una
                  planificacion de 1 dia; se repite con 1, 2, 4 y 8.
  visualizadores  un navegador planifica 5 dias y N navegadores abren a la vez
                  ese mismo plan compartido (rubrica G06): no recalculan nada.
  estres          un navegador aumenta los pedidos del turno (1 dia) y luego
                  de los 5 dias hasta que el tiempo de respuesta supera el limite.
  adicionales     5 dias con el maximo por turno y N pedidos registrados extra
                  (sinteticos) sobre el archivo, hasta superar el limite.
  login           intentos fallidos con un usuario inexistente hasta el bloqueo.

Uso (las credenciales van por variables de entorno, nunca en el repositorio):
  PAQRAP_USUARIO=... PAQRAP_CLAVE=... python -I pruebas/rendimiento/prueba_carga.py \
      --url http://localhost:8080 --escenario todos --salida resultados.json

Imprime una tabla Markdown por escenario y guarda el detalle en JSON.
"""

import argparse
import http.cookiejar
import json
import os
import random
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request


class Navegador:
    """Una sesion independiente (cookies + token CSRF), como un navegador real."""

    def __init__(self, base):
        self.base = base.rstrip("/")
        self.cookies = http.cookiejar.CookieJar()
        self.cliente = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))
        self.csrf = None

    def pedir(self, metodo, ruta, cuerpo=None, formulario=None, tiempo_limite=900):
        cabeceras = {"Accept": "application/json"}
        datos = None
        if cuerpo is not None:
            datos = json.dumps(cuerpo).encode("utf-8")
            cabeceras["Content-Type"] = "application/json"
        elif formulario is not None:
            datos = urllib.parse.urlencode(formulario).encode("utf-8")
            cabeceras["Content-Type"] = "application/x-www-form-urlencoded"
        if metodo != "GET" and self.csrf:
            cabeceras[self.csrf[0]] = self.csrf[1]
        peticion = urllib.request.Request(self.base + ruta, data=datos, headers=cabeceras, method=metodo)
        inicio = time.perf_counter()
        try:
            with self.cliente.open(peticion, timeout=tiempo_limite) as respuesta:
                contenido = respuesta.read()
                return respuesta.status, contenido, dict(respuesta.headers), time.perf_counter() - inicio
        except urllib.error.HTTPError as error:
            return error.code, error.read(), dict(error.headers), time.perf_counter() - inicio

    def renovar_csrf(self):
        estado, contenido, _, _ = self.pedir("GET", "/api/auth/csrf")
        if estado != 200:
            raise RuntimeError(f"No se obtuvo el token CSRF (HTTP {estado})")
        token = json.loads(contenido)
        self.csrf = (token["headerName"], token["token"])

    def iniciar_sesion(self, usuario, clave):
        self.renovar_csrf()
        estado, contenido, _, _ = self.pedir("POST", "/api/auth/login",
                                             formulario={"username": usuario, "password": clave})
        if estado != 200:
            raise RuntimeError(f"Login rechazado (HTTP {estado}): {contenido[:200]!r}")
        # Spring Security renueva el token CSRF al autenticar.
        self.renovar_csrf()


def percentil(valores, p):
    if not valores:
        return 0.0
    ordenados = sorted(valores)
    k = max(0, min(len(ordenados) - 1, round(p / 100 * (len(ordenados) - 1))))
    return ordenados[k]


def resumen_ejecucion(contenido):
    datos = json.loads(contenido)
    filas = []
    for ejecucion in datos["ejecuciones"]:
        m = ejecucion["metricas"]
        filas.append({
            "algoritmo": ejecucion["algoritmo"],
            "pedidos": m["pedidosDelTurno"],
            "atendidos": m["pedidosAtendidos"],
            "sinAtender": m["pedidosSinAtender"],
            "fueraDePlazo": m["entregasFueraDePlazo"],
            "computoMs": m["duracionComputoMs"],
            "costo": m["costoOperativoTotal"],
        })
    return datos["escenario"], filas


def plan_un_dia(args, pedidos, ventana=8):
    return {
        "archivoVentas": args.archivo, "dia": args.dia, "horaInicio": 7, "ventanaHoras": ventana,
        "maximoPedidos": pedidos, "algoritmo": args.algoritmo,
    }


def plan_cinco_dias(args, pedidos_por_turno):
    return {
        "archivoVentas": args.archivo, "diaInicio": args.dia, "horaInicio": 7,
        "maximoPedidosPorTurno": pedidos_por_turno, "algoritmo": args.algoritmo,
    }


def navegador_autenticado(args):
    navegador = Navegador(args.url)
    navegador.iniciar_sesion(args.usuario, args.clave)
    return navegador


# ----------------------------------------------------------------- escenarios

def escenario_concurrencia(args):
    print("\n## Accesos simultaneos: N navegadores planifican 1 dia a la vez\n")
    print(f"Plan: {args.archivo}, dia {args.dia}, {args.pedidos} pedidos, {args.algoritmo}.\n")
    print("| Navegadores | OK | 503 ocupado | Errores | p50 (s) | p95 (s) | Max (s) | Tiempo total (s) |")
    print("|---:|---:|---:|---:|---:|---:|---:|---:|")
    resultados = []
    for cantidad in args.navegadores:
        navegadores = [navegador_autenticado(args) for _ in range(cantidad)]
        barrera = threading.Barrier(cantidad)
        respuestas = [None] * cantidad

        def correr(indice):
            barrera.wait()
            estado, _, _, segundos = navegadores[indice].pedir(
                "POST", "/api/experimentacion/ejecutar", cuerpo=plan_un_dia(args, args.pedidos))
            respuestas[indice] = (estado, segundos)

        inicio = time.perf_counter()
        hilos = [threading.Thread(target=correr, args=(i,)) for i in range(cantidad)]
        for hilo in hilos:
            hilo.start()
        for hilo in hilos:
            hilo.join()
        total = time.perf_counter() - inicio
        tiempos = [s for estado, s in respuestas if estado == 200]
        fila = {
            "navegadores": cantidad,
            "ok": sum(1 for estado, _ in respuestas if estado == 200),
            "ocupado": sum(1 for estado, _ in respuestas if estado == 503),
            "errores": sum(1 for estado, _ in respuestas if estado not in (200, 503)),
            "p50": percentil(tiempos, 50), "p95": percentil(tiempos, 95),
            "max": max(tiempos, default=0.0), "total": total,
        }
        resultados.append(fila)
        print(f"| {cantidad} | {fila['ok']} | {fila['ocupado']} | {fila['errores']} | {fila['p50']:.1f} | "
              f"{fila['p95']:.1f} | {fila['max']:.1f} | {total:.1f} |")
    return resultados


def escenario_visualizadores(args):
    print("\n## Varios visualizadores sobre un unico planificador (5 dias)\n")
    autor = navegador_autenticado(args)
    estado, contenido, cabeceras, segundos = autor.pedir(
        "POST", "/api/experimentacion/ejecutar-5d", cuerpo=plan_cinco_dias(args, args.pedidos_5d))
    if estado != 200:
        print(f"La planificacion 5D fallo (HTTP {estado}).")
        return {"error": estado}
    id_simulacion = cabeceras.get("X-Simulacion-Id")
    escenario, filas = resumen_ejecucion(contenido)
    print(f"Plan 5D resuelto en {segundos:.1f} s ({escenario['pedidosDelTurno']} pedidos, "
          f"{len(contenido) / 1024 / 1024:.1f} MB); id compartido `{id_simulacion}`.\n")
    print("| Visualizadores | OK | p50 (s) | p95 (s) | Max (s) |")
    print("|---:|---:|---:|---:|---:|")
    resultados = []
    for cantidad in args.visualizadores:
        navegadores = [navegador_autenticado(args) for _ in range(cantidad)]
        barrera = threading.Barrier(cantidad)
        respuestas = [None] * cantidad

        def abrir(indice):
            barrera.wait()
            estado_v, _, _, s = navegadores[indice].pedir("GET", f"/api/simulaciones-compartidas/{id_simulacion}")
            respuestas[indice] = (estado_v, s)

        hilos = [threading.Thread(target=abrir, args=(i,)) for i in range(cantidad)]
        for hilo in hilos:
            hilo.start()
        for hilo in hilos:
            hilo.join()
        tiempos = [s for e, s in respuestas if e == 200]
        fila = {"visualizadores": cantidad, "ok": len(tiempos), "p50": percentil(tiempos, 50),
                "p95": percentil(tiempos, 95), "max": max(tiempos, default=0.0)}
        resultados.append(fila)
        print(f"| {cantidad} | {fila['ok']} | {fila['p50']:.2f} | {fila['p95']:.2f} | {fila['max']:.2f} |")
    return {"planificacionSegundos": segundos, "id": id_simulacion, "filas": resultados, "algoritmos": filas}


def escenario_estres(args):
    print("\n## Estres: cuantos pedidos se pueden planificar\n")
    navegador = navegador_autenticado(args)
    print("| Simulacion | Pedidos | Algoritmo | Atendidos | Sin atender | Fuera de plazo | Computo (s) | Respuesta (s) |")
    print("|---|---:|---|---:|---:|---:|---:|---:|")
    resultados = []
    pasos = [("1 dia (24 h)", "/api/experimentacion/ejecutar", plan_un_dia(args, n, ventana=24)) for n in args.pasos_1d]
    pasos += [("5 dias", "/api/experimentacion/ejecutar-5d", plan_cinco_dias(args, n)) for n in args.pasos_5d]
    for nombre, ruta, cuerpo in pasos:
        estado, contenido, _, segundos = navegador.pedir("POST", ruta, cuerpo=cuerpo, tiempo_limite=args.limite * 3)
        if estado != 200:
            print(f"| {nombre} | — | — | HTTP {estado} | | | | {segundos:.1f} |")
            resultados.append({"simulacion": nombre, "estado": estado, "segundos": segundos})
            break
        _, filas = resumen_ejecucion(contenido)
        for fila in filas:
            print(f"| {nombre} | {fila['pedidos']} | {fila['algoritmo']} | {fila['atendidos']} | {fila['sinAtender']} | "
                  f"{fila['fueraDePlazo']} | {fila['computoMs'] / 1000:.1f} | {segundos:.1f} |")
            resultados.append({"simulacion": nombre, "segundos": segundos, **fila})
        if segundos > args.limite:
            print(f"\nSe detiene: la respuesta supero el limite de {args.limite} s.")
            break
    return resultados


def pedidos_sinteticos(cantidad, dia_inicio, semilla=20261031):
    """Pedidos registrados extra, repartidos en los 5 dias del plan."""
    azar = random.Random(semilla)
    plazos = [4, 8, 12, 18, 36, 36, 36]
    return [{
        "clienteId": f"c{900000 + indice}",
        "posX": azar.randint(0, 70),
        "posY": azar.randint(0, 50),
        "cantidadProducto": azar.randint(1, 10),
        "plazoHoras": azar.choice(plazos),
        "dia": dia_inicio + azar.randint(0, 4),
        "hora": azar.randint(0, 23),
        "minuto": azar.randint(0, 59),
    } for indice in range(cantidad)]


def escenario_adicionales(args):
    print("\n## Estres con pedidos registrados extra (5 dias, maximo 400 por turno)\n")
    navegador = navegador_autenticado(args)
    print("| Pedidos extra | Pedidos del plan | Algoritmo | Atendidos | Sin atender | Fuera de plazo | Computo (s) | Respuesta (s) |")
    print("|---:|---:|---|---:|---:|---:|---:|---:|")
    resultados = []
    for extra in args.extra:
        cuerpo = plan_cinco_dias(args, 400)
        cuerpo["pedidosAdicionales"] = pedidos_sinteticos(extra, args.dia)
        estado, contenido, _, segundos = navegador.pedir(
            "POST", "/api/experimentacion/ejecutar-5d", cuerpo=cuerpo, tiempo_limite=args.limite * 3)
        if estado != 200:
            print(f"| {extra} | — | — | HTTP {estado} | | | | {segundos:.1f} |")
            resultados.append({"extra": extra, "estado": estado, "segundos": segundos})
            break
        _, filas = resumen_ejecucion(contenido)
        for fila in filas:
            print(f"| {extra} | {fila['pedidos']} | {fila['algoritmo']} | {fila['atendidos']} | {fila['sinAtender']} | "
                  f"{fila['fueraDePlazo']} | {fila['computoMs'] / 1000:.1f} | {segundos:.1f} |")
            resultados.append({"extra": extra, "segundos": segundos, **fila})
        if segundos > args.limite:
            print(f"\nSe detiene: la respuesta supero el limite de {args.limite} s.")
            break
    return resultados


def escenario_login(args):
    print("\n## Seguridad del login: intentos fallidos hasta el bloqueo\n")
    navegador = Navegador(args.url)
    usuario = f"prueba.bloqueo.{int(time.time())}"
    estados = []
    for _ in range(7):
        navegador.renovar_csrf()
        estado, contenido, cabeceras, _ = navegador.pedir(
            "POST", "/api/auth/login", formulario={"username": usuario, "password": "Incorrecta.2026#"})
        mensaje = json.loads(contenido or b"{}").get("message", "")
        estados.append({"estado": estado, "mensaje": mensaje, "retryAfter": cabeceras.get("Retry-After")})
    print("| Intento | HTTP | Mensaje |")
    print("|---:|---:|---|")
    for numero, fila in enumerate(estados, start=1):
        print(f"| {numero} | {fila['estado']} | {fila['mensaje']} |")
    sin_sesion, _, _, _ = Navegador(args.url).pedir("GET", "/api/experimentacion/datos")
    print(f"\nAPI sin sesion: HTTP {sin_sesion} (se espera 401).")
    return {"intentos": estados, "apiSinSesion": sin_sesion}


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="http://localhost:8080")
    parser.add_argument("--escenario", default="todos",
                        choices=["todos", "concurrencia", "visualizadores", "estres", "adicionales", "login"])
    parser.add_argument("--archivo", default="ventas.202610.txt")
    parser.add_argument("--dia", type=int, default=3)
    parser.add_argument("--algoritmo", default="IACO", choices=["IACO", "AGAESTW", "AMBOS"])
    parser.add_argument("--pedidos", type=int, default=60, help="pedidos del turno en el escenario de concurrencia")
    parser.add_argument("--pedidos-5d", type=int, default=40, help="pedidos por turno del plan 5D compartido")
    parser.add_argument("--navegadores", type=int, nargs="+", default=[1, 4, 8, 16, 32])
    parser.add_argument("--visualizadores", type=int, nargs="+", default=[1, 5, 10, 20])
    parser.add_argument("--pasos-1d", type=int, nargs="+", default=[50, 100, 200, 300, 400])
    parser.add_argument("--pasos-5d", type=int, nargs="+", default=[20, 40, 80, 120])
    parser.add_argument("--extra", type=int, nargs="+", default=[0, 500, 1000, 2000, 4000])
    parser.add_argument("--limite", type=float, default=180.0, help="segundos de respuesta que detienen el estres")
    parser.add_argument("--salida", default=None, help="archivo JSON con el detalle")
    args = parser.parse_args()
    args.usuario = os.environ.get("PAQRAP_USUARIO")
    args.clave = os.environ.get("PAQRAP_CLAVE")
    if args.escenario != "login" and not (args.usuario and args.clave):
        sys.exit("Define PAQRAP_USUARIO y PAQRAP_CLAVE con una cuenta de prueba.")

    resultados = {"url": args.url, "fecha": time.strftime("%Y-%m-%d %H:%M"), "algoritmo": args.algoritmo}
    if args.escenario in ("todos", "login"):
        resultados["login"] = escenario_login(args)
    if args.escenario in ("todos", "concurrencia"):
        resultados["concurrencia"] = escenario_concurrencia(args)
    if args.escenario in ("todos", "visualizadores"):
        resultados["visualizadores"] = escenario_visualizadores(args)
    if args.escenario in ("todos", "estres"):
        resultados["estres"] = escenario_estres(args)
    if args.escenario in ("todos", "adicionales"):
        resultados["adicionales"] = escenario_adicionales(args)
    if args.salida:
        with open(args.salida, "w", encoding="utf-8") as archivo:
            json.dump(resultados, archivo, ensure_ascii=False, indent=2)
        print(f"\nDetalle guardado en {args.salida}")


if __name__ == "__main__":
    main()

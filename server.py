import http.server
import socketserver
import webbrowser
import threading
import time
import sys
import os

PORT = 8000

# Set the working directory to the directory of this script
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching for easier debugging/iterations
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def open_browser():
    time.sleep(1.5)  # Wait for the server to spin up
    print("Abriendo el navegador web automáticamente...")
    webbrowser.open(f"http://localhost:{PORT}")

if __name__ == "__main__":
    # Start browser thread
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Configure and run socket server
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
            print("=" * 70)
            print(f" Servidor de Inteligencia Comercial de SUPCON iniciado con éxito.")
            print(f" Dirección Local: http://localhost:{PORT}")
            print(f" Directorio Activo: {os.getcwd()}")
            print(" Presiona Ctrl+C en la terminal para apagar el servidor.")
            print("=" * 70)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido por el usuario. Saliendo...")
        sys.exit(0)
    except Exception as e:
        print(f"\nError al iniciar el servidor: {e}")
        sys.exit(1)

# SUPCON Chile - Dashboard de Inteligencia Comercial de Redes Eléctricas

Este repositorio contiene la aplicación del panel web interactivo para la visualización de la red eléctrica, subestaciones y centrales en Chile, integrado con los catastros PMGD y contactos comerciales.

## Características

- **Resumen General**: Estadísticas agregadas del Sistema Eléctrico Nacional (SEN).
- **Puntuación de Clientes**: Algoritmo de priorización comercial de holdings en base a subestaciones sin SCADA, capacidad ERNC y plantas industriales.
- **Catastro SITR (87)**: Nueva pestaña interactiva para explorar los parques bajo instrucción obligatoria del Oficio SITR (Tier 1).
- **Catastro Solar (738)**: Nueva pestaña interactiva para explorar el universo completo de PMGDs solares del país.
- **Buscador Global**: Filtro instantáneo por holding, comuna, región o solución tecnológica recomendada.

## Cómo Ejecutar el Panel Localmente

Para iniciar el servidor de desarrollo local y abrir automáticamente el navegador web:
```bash
python3 server.py
```
El servidor responderá en `http://localhost:8000/`.

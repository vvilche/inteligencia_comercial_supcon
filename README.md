# Conecta Normativo - Inteligencia Comercial y Cumplimiento de Redes Eléctricas

Este repositorio contiene la aplicación del panel web interactivo **Conecta Normativo** para la visualización de la red eléctrica, subestaciones y centrales en Chile, integrado con los catastros PMGD y contactos comerciales del sector.

## Características

- **Resumen General**: Estadísticas agregadas del Sistema Eléctrico Nacional (SEN).
- **Prioridad de Conexión**: Algoritmo de priorización regulatoria y técnica de holdings en base a subestaciones sin SCADA, capacidad de inyección ERNC y cercanía a plantas industriales.
- **Catastro SITR (87)**: Pestaña interactiva para explorar los 87 parques bajo instrucción obligatoria de telemedida del Oficio SITR (Tier 1).
- **Catastro Solar (738)**: Pestaña interactiva para explorar el universo completo de PMGDs solares del país y sus necesidades de modernización.
- **Herramientas de Venta / Playbook**: Sección con guías de cumplimiento normativo (SITR, SLRP, Decreto 1/2026), matriz de alternativas técnicas (Software, NovaTech Orion, SUPCON GIR-800) y plantillas interactivas de correo y cartas borrador para el CEN.
- **Buscador Global**: Filtro instantáneo por holding, comuna, región o solución tecnológica recomendada.

## Cómo Ejecutar el Panel Localmente

Para iniciar el servidor de desarrollo local y abrir automáticamente el navegador web:
```bash
python3 server.py
```
El servidor responderá en `http://localhost:8000/`.

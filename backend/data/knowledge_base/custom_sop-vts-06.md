---
doc_id: SOP-VTS-06
title: SOP Kalibrasi Sensor Radar Maritim & IoT Telemetry (VTS)
category: High-Tech IoT & Radar SOP
clearance: ENGINEERING
owner: R&D Live Contributor
last_updated: 2026-11-08
---

# SOP Kalibrasi Sensor Radar Maritim & IoT Telemetry (VTS)

## 1. Standar Kalibrasi Radar VTS
Setiap stasiun Vessel Traffic Service (VTS) wajib melakukan kalibrasi frekuensi antena setiap 14 hari sekali dengan batas deviasi sinyal maksimal 0.03 dB.

## 2. Integrasi Streaming Kafka
Data telemetri posisi kapal dikirimkan ke topik Kafka `iot.vts.ais.stream` dengan target latensi end-to-end di bawah 120 ms.

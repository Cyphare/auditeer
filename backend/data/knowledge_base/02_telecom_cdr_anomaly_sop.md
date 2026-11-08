---
doc_id: SOP-CDR-02
title: SOP Penanganan Anomali Trafik Telekomunikasi & Call Detail Record (CDR) Real-Time
category: Telecom Engineering SOP
clearance: ENGINEERING
owner: Telco Data Engineering Squad
last_updated: 2026-10-22
---

# SOP Penanganan Anomali Pipeline Call Detail Record (CDR)

## 1. Ruang Lingkup & Definisi Operasional
Dokumen ini mengatur prosedur standar operasional bagi *Data Engineer* dan *Site Reliability Engineer (SRE)* dalam menangani lonjakan latensi, *packet loss*, maupun penurunan *throughput* pada pipeline pemrosesan **Call Detail Record (CDR)** 4G/5G lintas regional (Jabodetabek, DIY-Jateng, Jawa Timur, Bali-Nusra, dan Kalimantan).

## 2. Ambang Batas Anomali (CDR Telemetry Thresholds)
Sistem deteksi anomali waktu nyata mengevaluasi metrik setiap 5 menit dengan aturan berikut:
- **Packet Loss Normal:** `< 0.80%`.
- **Packet Loss Waspada (P2):** `0.80% – 1.50%`. Wajib dilakukan pemeriksaan konektivitas *backhaul* BTS dan validasi *backpressure* pada topik Kafka `telco.cdr.raw.v3`.
- **Packet Loss Kritis (P1 Escalation):** `> 1.50%` ATAU *Dropped Call Rate* `> 1.20%` ATAU *Anomaly Score* `>= 0.80`. Kondisi ini diklasifikasikan sebagai **Insiden Mayor P1** dengan target waktu tanggap (*Mean Time to Acknowledge / MTTA*) maksimal **10 menit**.

## 3. Langkah Mitigasi Teknis Pipeline Streaming (DE Runbook)
Ketika terdeteksi anomali **P1** pada regional tertentu (misalnya lonjakan trafik malam hari atau gangguan *fiber cut*):
1. **Inspeksi Lag Konsumen:** Periksa *consumer lag* pada grup `cdr-enrichment-spark-stream`. Jika lag melebihi 500.000 pesan, tingkatkan jumlah *micro-batch executors* dari 12 menjadi 24 *instances*.
2. **Isolasi Sektor BTS Bermasalah:** Jalankan kueri agregasi pada tabel `telecom_cdr_metrics` untuk mengidentifikasi regional dengan `packet_loss_pct` dan `anomaly_score` tertinggi.
3. **Deduplikasi & Dead-Letter Queue (DLQ):** Pastikan rekaman CDR korup dialihkan ke bucket karantina `ozone://lakehouse/quarantine/cdr_dlq` agar tidak menghentikan *streaming job* utama (*poison pill protection*).
4. **Eskalasi Tiket Otomatis:** Buat tiket insiden **P1** melalui sistem operasional dengan menyertakan kode regional, persentase *packet loss*, jumlah *sector alerts*, dan estimasi dampak pelanggan korporat.

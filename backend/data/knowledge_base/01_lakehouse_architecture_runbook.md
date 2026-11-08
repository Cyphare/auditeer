---
doc_id: DOC-LAKE-01
title: Arsitektur Operasional & Runbook Data Lakehouse Nusantara (Apache Spark, Kafka & Governance)
category: Data Platform Architecture
clearance: PUBLIC_INTERNAL
owner: Platform Engineering Division
last_updated: 2026-10-15
---

# Arsitektur Operasional Data Lakehouse Enterprise

## 1. Ikhtisar Arsitektur Terbuka (Open-Ecosystem Lakehouse)
Platform Data Lakehouse Enterprise dirancang menggunakan ekosistem open-source tanpa ketergantungan vendor (*zero vendor lock-in*) untuk menangani beban kerja skala petabyte di sektor Telekomunikasi, Perbankan, dan Instansi Publik. Arsitektur terbagi menjadi empat lapisan utama:
- **Ingestion Layer (Streaming & Batch):** Menggunakan Apache Kafka (3-broker quorum per zona) dan konektor Change Data Capture (CDC) untuk menyerap hingga 45 juta kejadian per jam (*events/hour*).
- **Storage & Table Format Layer:** Berjalan di atas Apache Ozone / HDFS terdistribusi dengan format tabel transaksional Apache Iceberg untuk mendukung ACID transactions dan *time-travel audit*.
- **Compute & AI Engine (DE & AN Modules):**
  - **Modul Data Engineering (DE):** Pipeline ETL/ELT terdistribusi di atas Apache Spark 3.5 dengan penjadwalan DAG otomatis.
  - **Modul Analytics & AI (AN):** Lingkungan *low-code* Data Science, pelatihan model *Deep Learning* terdistribusi di klaster GPU Yogyakarta (`ygk-gpu-ai-01`), dan *inference endpoint* untuk Enterprise AI Assistant.
- **Security & Data Governance:** Autentikasi klaster wajib menggunakan Kerberos, otorisasi tingkat kolom dan dokumen dikelola melalui Apache Ranger + RBAC Policy Engine, serta seluruh akses kueri dicatat ke tabel audit *immutable*.

## 2. Standar SLA Infrastruktur & Ambang Batas Kesehatan Node
Setiap node komputasi di zona **Jakarta (`jkt-*`)**, **Yogyakarta (`ygk-*`)**, dan **Surabaya (`sby-*`)** wajib memenuhi target ketersediaan (**SLA Uptime**) minimal **99.90%** per bulan.
- **Status HEALTHY:** Utilisasi CPU < 75%, Memori < 80%, latensi kueri rata-rata < 250 ms.
- **Status WARNING:** Utilisasi CPU 75%–85% atau Memori 80%–88%. Tindakan: Aktifkan *Dynamic Resource Allocation* pada Spark Executor dan pantau antrean YARN/Kubernetes selama 15 menit.
- **Status DEGRADED (Kritis):** Utilisasi CPU > 85%, Memori > 88%, atau latensi > 500 ms selama lebih dari 10 menit berturut-turut. Tindakan wajib: Buka tiket insiden prioritas **P1**, jalankan skrip penyeimbangan ulang partisi (`rebalance_spark_partitions.sh`), dan alihkan beban *batch non-kritis* ke klaster sekunder.

## 3. Prosedur Pemulihan Cepat (Disaster Recovery & Failover)
Apabila node *streaming* atau klaster GPU mengalami degradasi:
1. Verifikasi kesehatan *checkpoint* Kafka consumer group agar tidak terjadi kehilangan data (*zero data loss*).
2. Isolasi *noisy neighbor job* yang mengonsumsi lebih dari 40% vCore klaster tanpa kuota resmi.
3. Untuk node GPU AI di Yogyakarta (`ygk-gpu-ai-01`), jika utilitas memori VRAM melampaui 90%, aktifkan kuantisasi model *4-bit AWQ/GGUF* atau arahkan beban inferensi sementara ke *fallback gateway* hingga antrean normal kembali.

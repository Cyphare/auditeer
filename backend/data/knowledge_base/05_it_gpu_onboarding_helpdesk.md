---
doc_id: IT-SOP-05
title: Panduan Onboarding Engineer, Akses VPN On-Premise, & Reservasi Klaster GPU R&D
category: Internal IT & HR Operations
clearance: PUBLIC_INTERNAL
owner: Internal IT & People Operations
last_updated: 2026-10-10
---

# Panduan Operasional Internal Karyawan & Engineering Team

## 1. Akses Jaringan Zero-Trust & VPN On-Premise (Jakarta & Yogyakarta)
Seluruh *engineer* dan pengembang sistem **Auditeer** wajib menggunakan koneksi **WireGuard Zero-Trust VPN** dengan autentikasi dua faktor (SSO + Hardware/TOTP Token) saat mengakses repositori Git internal, klaster pengujian Lakehouse, maupun *endpoint* inferensi LLM internal:
- Portal aktivasi akses teknis: `https://access.internal-platform.id` (persetujuan otomatis oleh *Tech Lead* dalam maks. 4 jam kerja).
- Kunci API pengembangan (*sandbox keys*) wajib disimpan di brankas rahasia terenkripsi atau berkas `.env` lokal dan **dilarang keras** di-*commit* ke repositori Git.

## 2. Kuota & Penjadwalan Klaster GPU R&D Yogyakarta
Untuk mendukung eksperimen *Natural Language Processing (NLP)*, evaluasi *Retrieval-Augmented Generation (RAG)*, serta *fine-tuning* LoRA/QLoRA:
- **Jam Eksperimen Interaktif (08.30 – 17.30 WIB):** Maksimal alokasi **16 GB VRAM** per sesi notebook/container agar dapat digunakan bersama seluruh anggota tim R&D.
- **Job Pelatihan Batch Malam (19.00 – 06.00 WIB):** Dapat menggunakan hingga **80 GB VRAM** penuh melalui antrean penjadwalan Slurm/Kubernetes (`ygk-gpu-ai-01`) setelah mendaftarkan estimasi durasi dan metrik evaluasi target.

## 3. Standar Kualitas Kode & Evaluasi AI sebelum Rilis Produksi
Setiap fitur asisten AI korporat wajib lulus empat gerbang kualitas (*Release Gates*) sebelum dipromosikan ke lingkungan klien:
1. **Grounded Faithfulness >= 90%** pada *Golden Benchmark Dataset* (setiap klaim faktual wajib memiliki sitasi dokumen `[DOC-ID]` atau hasil kueri tabel resmi).
2. **Zero RBAC Data Leakage (100% Block Rate):** Pengguna dengan peran *Junior Analyst* atau *Engineer* tidak boleh menerima potongan dokumen berklasifikasi `EXECUTIVE` atau `COMPLIANCE` di luar hak aksesnya.
3. **100% Kepatuhan Redaksi PII (UU PDP):** Uji otomatis wajib memverifikasi penyamaran NIK, nomor telepon, email, dan nomor kartu.
4. **Latensi Retrieval p95 < 500 ms** pada indeks hibrida (BM25 + Vektor Semantik).

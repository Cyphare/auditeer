---
doc_id: POL-PDP-03
title: Kebijakan Kepatuhan UU PDP No. 27/2022, Regulasi OJK & Deteksi Fraud Perbankan Digital
category: Compliance & Risk Governance
clearance: COMPLIANCE
owner: Enterprise Risk & Data Privacy Office
last_updated: 2026-10-28
---

# Kebijakan Tata Kelola Privasi Data (UU PDP) & Deteksi Fraud Perbankan

## 1. Kepatuhan Undang-Undang Perlindungan Data Pribadi (UU No. 27 Tahun 2022)
Seluruh sistem kecerdasan buatan (*Enterprise AI Assistant*), pipeline analitik, dan pengguna internal wajib mematuhi **UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP)** serta **POJK No. 11/POJK.03/2022** tentang Penyelenggaraan Teknologi Informasi oleh Bank Umum:
- **Redaksi Otomatis PII (Mandatory PII Masking):** Data pribadi spesifik dan umum dilarang keras dikirimkan dalam bentuk teks terbuka (*plaintext*) ke model bahasa eksternal maupun ditampilkan di log aplikasi:
  - **Nomor Induk Kependudukan (NIK - 16 digit):** Wajib disamarkan menjadi `[REDACTED-NIK]`.
  - **Nomor Kartu Pembayaran / Rekening Sensitif (13–19 digit):** Wajib disamarkan menjadi `[REDACTED-CARD]`.
  - **Nomor Telepon Seluler Indonesia (`+62...` atau `08...`):** Wajib disamarkan menjadi `[REDACTED-PHONE]`.
  - **Alamat Email Pribadi & NPWP:** Wajib disamarkan menjadi `[REDACTED-EMAIL]` / `[REDACTED-NPWP]`.
- **Kedaulatan Data (Data Sovereignty / On-Premise AI):** Untuk beban kerja yang memproses data nasabah perbankan dan instansi pemerintah, pemrosesan inferensi AI wajib mengutamakan klaster lokal (*on-premise open-weights LLM* melalui Ollama/vLLM di pusat data Indonesia) sebelum menggunakan gerbang komputasi awan.

## 2. Aturan Deteksi Fraud Transaksi Digital (QRIS, BI-FAST, RTGS)
Mesin skor risiko mengevaluasi setiap transaksi secara *real-time* dalam waktu `< 80 ms`:
- **Skor Risiko >= 0.85 (High-Risk / Auto-Hold):** Transaksi ditahan sementara selama maksimal 15 menit untuk verifikasi *step-up biometric MFA*. Pola pemicu utama meliputi *account takeover* dari perangkat baru, pemecahan transaksi cepat (*structuring/smurfing* di bawah batas pelaporan), dan pencairan lintas kanal **BI-FAST** beruntun dalam kurun 180 detik.
- **Skor Risiko 0.65 – 0.84 (Medium-Risk / Compliance Review):** Masuk ke antrean investigasi analis kepatuhan pada tabel `banking_risk_alerts` dengan target penyelesaian SLA 2 jam.
- **Pelaporan Insiden Siber & Fraud Signifikan:** Sesuai ketentuan regulator, insiden kebocoran data pribadi wajib diberitahukan secara tertulis paling lambat **3 x 24 jam (72 jam)** sejak insiden diketahui oleh Pengendali Data Pribadi.

# Multi-Tier Private Network Service Platform — Comprehensive Evidence Index
## Computer Networks Laboratory Project — Team 1 (Phase 1 & Phase 2)

```
========================================================================================
COURSE:           Computer Networks Laboratory Project
REPOSITORY:       https://github.com/Sankalp13353/CN_PROJECT
SUBMISSION DATE:  November 23, 2026

TEAM MEMBERS:
  • Sankalp      (Mac 1 — Primary DNS Server, Standby Edge Proxy, Client Workstation)
  • Tejas Tyagi  (Mac 2 — Primary Edge Gateway, Backend A & B Host, Backup DNS Server)
========================================================================================
```

---

## 1. Overview & Traceability Methodology

This document serves as the master empirical verification index for the **Multi-Tier Private Network Service Platform**. Every architectural claim in the project report is substantiated by concrete packet traces, terminal execution logs, and network socket captures recorded on bare-metal hardware.

All evidence is categorized into two distinct directory structures preserved in the repository:
1. `evidence/`: Phase 1 protocol-level verification traces (Wireshark PCAP screenshots and terminal logs).
2. `evidence_phase2/`: Phase 2 resilience and security extensions (Extensions A through F).

---

## 2. Phase 1 Evidence Index (Baseline Architecture)

The Phase 1 evidence demonstrates foundational computer networking protocols operating across physical workstations over the wireless local area network (`10.7.0.0/20`).

| # | Evidence File | Supported Feature | What It Empirically Proves | Report Chapter |
| :-: | :--- | :--- | :--- | :--- |
| **1.1** | [`../evidence/dns/DNS EVI.png`](../evidence/dns/DNS%20EVI.png) | **Private DNS Resolution (UDP Port 53)** | Wireshark frame trace (Frames 1431 & 1433) capturing a standard DNS query `0x2ad0` for `app.team1.test` transmitted from Mac 2 (`10.7.14.9`) to Mac 1 (`10.7.0.221`), answered authoritatively with A record `10.7.14.9`. Demonstrates private namespace service discovery without external resolver reliance. | **Chapter 3.2** *(Section 3.2, Figure 2)* |
| **1.2** | [`../evidence/tcp/TCP.png`](../evidence/tcp/TCP.png) | **TCP Transport Layer 3-Way Handshake** | Wireshark filter `tcp.port == 443` tracking TCP stream establishment on `10.7.14.9:443`. Confirms sequential `[SYN]`, `[SYN, ACK]`, and `[ACK]` frame exchange, window scaling (`Win=130368`), and graceful `[FIN, ACK]` teardown over physical Wi-Fi BSSID `c0:c5:20:6f:38:ee`. | **Chapter 3.3** *(Section 3.3, Figure 3)* |
| **1.3** | [`../evidence/tls/TLS.png`](../evidence/tls/TLS.png) | **Transport Layer Security (TLS Termination)** | Wireshark filter `tls && ip.addr == 10.7.14.9` displaying TLSv1.2 Record Layer encrypted frames. Confirms that all application payload data across the Wi-Fi medium is transmitted as opaque Content Type 23 (Application Data) with zero plaintext leakage. | **Chapter 3.3** *(Section 3.3, Figure 4)* |
| **1.4** | [`../evidence/http/HTTP EVI.png`](../evidence/http/HTTP%20EVI.png) | **Direct Application HTTP Communication** | Wireshark capture of unencrypted HTTP request/response transaction (`GET / HTTP/1.1`) between client `10.7.0.221` and Backend A on port 3001, returning HTTP status `200 OK` with JSON payload `{"backend":"A","message":"Hello from Backend A"}`. | **Chapter 3.4** *(Section 3.4, Figure 5)* |
| **1.5** | [`../evidence/load-balancing/Load Balancing.png`](../evidence/load-balancing/Load%20Balancing.png) | **Horizontal Round-Robin Load Balancing** | Terminal execution trace of sequential curl requests to `https://app.team1.test/`. Demonstrates strict round-robin alternation between backends via response headers: `X-Backend: A`, `X-Backend: B`, `A`, `B`, `A`, `B`. | **Chapter 3.4** *(Section 3.4, Figure 6)* |
| **1.6** | [`../evidence/caching/Caching.png`](../evidence/caching/Caching.png) | **Client & Edge HTTP Cache Control** | HTTP response header inspection confirming edge proxy injection of `Cache-Control: public, max-age=60` and upstream Express entity tags (`ETag: W/"30-..."`), enabling client caching and conditional `304 Not Modified` validation. | **Chapter 3.3 / 3.4** *(Figure 7)* |

---

## 3. Phase 2 Evidence Index (Resilience & Hardening Extensions)

The Phase 2 evidence validates the six resilience, security, and migration extensions implemented across Mac 1 (`10.7.1.19`) and Mac 2 (`10.7.11.60`).

```
evidence_phase2/
├── A_Backup_DNS/
│   ├── Screenshot 2026-11-23 at 6.17.51 PM.png
│   └── Screenshot 2026-11-23 at 6.18.33 PM.png
├── B_DNS_TTL_Caching/
│   └── Screenshot 2026-11-23 at 6.21.18 PM.png
├── C_Service_Isolation/
│   ├── WhatsApp Image 2026-11-23 at 18.22.33.jpeg
│   └── Screenshot 2026-11-23 at 6.23.56 PM.png
├── D_Backend_High_Availability/
│   └── Screenshot 2026-11-23 at 6.24.28 PM.png
├── E_Edge_Migration/
│   └── Screenshot 2026-11-23 at 6.24.59 PM.png
└── F_Troubleshooting/
    └── Screenshot 2026-11-23 at 6.25.28 PM.png
```

| # | Evidence File | Extension & Objective | What It Empirically Proves | Report Chapter |
| :-: | :--- | :--- | :--- | :--- |
| **2.1** | [`../evidence_phase2/A_Backup_DNS/Screenshot 2026-11-23 at 6.17.51 PM.png`](../evidence_phase2/A_Backup_DNS/Screenshot%202026-11-23%20at%206.17.51%20PM.png) | **Extension A: Dual Resolver Configuration** | Terminal output of `scutil --dns` verifying dual nameservers configured in macOS resolver (`nameserver[0]: 10.7.1.19`, `nameserver[1]: 10.7.11.60`), and independent verification that both resolvers respond authoritatively to `app.team1.test` with TTL 30s. | **Chapter 4.1** *(Section 4.1)* |
| **2.2** | [`../evidence_phase2/A_Backup_DNS/Screenshot 2026-11-23 at 6.18.33 PM.png`](../evidence_phase2/A_Backup_DNS/Screenshot%202026-11-23%20at%206.18.33%20PM.png) | **Extension A: Automated DNS Resolver Failover** | Demonstrates intentional stoppage of primary DNS daemon (`sudo brew services stop dnsmasq` on Mac 1), followed by immediate query to secondary resolver (`10.7.11.60`) which answers authoritatively without service interruption. Followed by clean service restoration. | **Chapter 4.1** *(Section 4.1, Figure 10)* |
| **2.3** | [`../evidence_phase2/B_DNS_TTL_Caching/Screenshot 2026-11-23 at 6.21.18 PM.png`](../evidence_phase2/B_DNS_TTL_Caching/Screenshot%202026-11-23%20at%206.21.18%20PM.png) | **Extension B: DNS 30-Second TTL Enforcement** | Terminal query `dig @10.7.1.19 app.team1.test +noall +answer` validating authoritative emission of exact 30-second TTL (`app.team1.test. 30 IN A 10.7.1.19`), supporting deterministic client cache lifecycles. | **Chapter 4.2** *(Section 4.2, Figure 11)* |
| **2.4** | [`../evidence_phase2/C_Service_Isolation/WhatsApp Image 2026-11-23 at 18.22.33.jpeg`](../evidence_phase2/C_Service_Isolation/WhatsApp%20Image%202026-11-23%20at%2018.22.33.jpeg) | **Extension C: Active Packet Filter (PF) Rules** | Terminal capture on Mac 2 executing `sudo pfctl -a team1 -sr`. Proves active stateful anchor rules: explicitly permitting TCP traffic from authorized edge `10.7.1.19` to ports 3001 and 3002 (`pass in quick on en0`), while dropping all other inbound LAN traffic (`block drop in quick on en0`). | **Chapter 4.3** *(Section 4.3, Figure 12)* |
| **2.5** | [`../evidence_phase2/C_Service_Isolation/Screenshot 2026-11-23 at 6.23.56 PM.png`](../evidence_phase2/C_Service_Isolation/Screenshot%202026-11-23%20at%206.23.56%20PM.png) | **Extension C: Service Isolation & Ingress Routing** | Proves authorized cross-LAN connectivity from Mac 1 (`10.7.1.19`) to `10.7.11.60:3001` and `3002` returning `HTTP 200 OK`, followed by verified end-to-end edge reverse proxy delivery (`Server: nginx/1.31.9`, `X-Backend: B`). | **Chapter 4.3** *(Section 4.3, Figure 13)* |
| **2.6** | [`../evidence_phase2/D_Backend_High_Availability/Screenshot 2026-11-23 at 6.24.28 PM.png`](../evidence_phase2/D_Backend_High_Availability/Screenshot%202026-11-23%20at%206.24.28%20PM.png) | **Extension D: Upstream High Availability & Balancing** | Terminal execution of a 10-request sequential curl loop (`for i in {1..10}...`) against `https://app.team1.test/`. Confirms exact alternating round-robin distribution (`X-Backend: A`, `B`, `A`, `B`, `A`, `B`, `A`, `B`, `A`, `B`) with zero dropped requests. | **Chapter 4.4** *(Section 4.4, Figure 14)* |
| **2.7** | [`../evidence_phase2/E_Edge_Migration/Screenshot 2026-11-23 at 6.24.59 PM.png`](../evidence_phase2/E_Edge_Migration/Screenshot%202026-11-23%20at%206.24.59%20PM.png) | **Extension E: Controlled Standby Edge Migration** | Comprehensive verification of live edge migration to Mac 1: DNS resolution resolves `app.team1.test` to `10.7.1.19`; HTTPS requests to `https://app.team1.test/` and `https://api.team1.test/api/status` are served by `nginx/1.31.9` on Mac 1, proxying cleanly across LAN to backends. | **Chapter 4.5** *(Section 4.5, Figure 15)* |
| **2.8** | [`../evidence_phase2/F_Troubleshooting/Screenshot 2026-11-23 at 6.25.28 PM.png`](../evidence_phase2/F_Troubleshooting/Screenshot%202026-11-23%20at%206.25.28%20PM.png) | **Extension F: Disaster Recovery & Validation** | Terminal execution of `sudo nginx -t 2>&1` proving configuration syntax is OK and test is successful, followed by clean application stack recovery and verified `HTTP/1.1 200 OK` response from Backend A. | **Chapter 4.6** *(Section 4.6, Figure 16)* |

---

## 4. Summary of Verification Standards

Every piece of evidence listed above meets the following academic verification criteria:
1. **Zero Fabrication:** All files represent genuine captured traces and terminal executions recorded during lab sessions.
2. **Network Layer Completeness:** Proves functionality across Layer 2 (Ethernet MAC addresses), Layer 3 (IPv4 addressing & subnetting), Layer 4 (TCP handshakes & UDP DNS datagrams), Layer 6 (TLS encryption & cipher negotiation), and Layer 7 (HTTP/1.1 headers, JSON payloads, and DNS resource records).
3. **Cross-Referenced Documentation:** Directly maps to corresponding chapters, figures, and technical analyses in [CN_Project_Final_Report.md](CN_Project_Final_Report.md).

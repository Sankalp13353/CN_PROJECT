# Multi-Tier Private Network Service Platform

**Computer Networks Laboratory Engineering Project — Team 1**  
**Repository:** [https://github.com/Sankalp13353/CN_PROJECT](https://github.com/Sankalp13353/CN_PROJECT)  
**Academic Session:** 2026 – 2027  
**Status:** Phase 1 (Core Platform) & Phase 2 (Resilience & Security Extensions) Completed  

---

## 📑 Formal Reports & Submission Documents

Comprehensive technical documentation and empirical indices are published in the `reports/` directory:

| Document | Format | Description |
| :--- | :---: | :--- |
| **[Final Project Report (PDF)](reports/CN_Project_Final_Report.pdf)** | `PDF` | 22-page consolidated academic report with figures, packet traces, and failure analysis. |
| **[Final Project Report (Markdown)](reports/CN_Project_Final_Report.md)** | `Markdown` | Source report text detailing Phase 1 and Phase 2 architectures. |
| **[Comprehensive Evidence Index](reports/EVIDENCE_INDEX.md)** | `Markdown` | Traceability matrix linking all captured traces to report chapters. |
| **[Phase 1 Evidence Folder](evidence/)** | `Directory` | Packet captures (DNS, TCP, TLS, HTTP, Load Balancing, Caching). |
| **[Phase 2 Evidence Folder](evidence_phase2/)** | `Directory` | Empirical verification screenshots for Extensions A through F. |

---

## 📖 Executive Summary

The **Multi-Tier Private Network Service Platform** is a distributed computer networking system designed, deployed, and empirically evaluated across two bare-metal macOS workstations communicating over an IEEE 802.11 Wi-Fi LAN (`10.7.0.0/20`).

The platform demonstrates how enterprise-grade infrastructure operates under real network constraints:
- **Service Discovery:** Custom domain authority for `app.team1.test` and `api.team1.test` via `dnsmasq`.
- **Edge Ingress & Cryptography:** Strict HTTP-to-HTTPS (301) redirection and TLS termination via `nginx 1.31`.
- **Stateless Load Balancing:** Horizontal round-robin request distribution across Express.js backends.
- **Dual-Tier DNS Redundancy:** Automatic client resolver failover between primary (`10.7.1.19`) and backup (`10.7.11.60`) servers.
- **Zero-Trust Host Hardening:** macOS Packet Filter (PF) boundary rules shielding backend ports from unauthorized LAN probes.
- **High Availability & Failover:** Passive upstream health tracking (`max_fails`, `fail_timeout`, `proxy_next_upstream`).
- **Controlled Edge Migration:** Zero-downtime ingress cutover from Mac 2 to Mac 1 over a 30-second TTL drain window.

---

## 👥 Workstation Roles & Hardware Inventory

The implementation strictly utilizes exactly two physical computing machines:

| Workstation | Host Identifier | Assigned Roles & Daemons | Interface | Active IP | MAC Address |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Mac 1** | Sankalp's MacBook Pro | • Primary DNS Server (`dnsmasq` on port `53`)<br>• Standby Edge Proxy (`nginx 1.31.9` on `80`/`443`)<br>• Evaluation Client Resolver Stack | `en0` | `10.7.1.19` | `9e:fd:fb:74:7f:fc` |
| **Mac 2** | Tejas's MacBook Pro | • Primary Edge Gateway (`nginx 1.31.6` on `80`/`443`)<br>• Backup DNS Server (`dnsmasq` on port `53`)<br>• Packet Filter (PF) Firewall (`anchor: team1`)<br>• Backend A (`node` on port `3001`)<br>• Backend B (`node` on port `3002`) | `en0` | `10.7.11.60` | `3e:cd:97:48:d9:f4` |

---

## 🏛️ System Architecture

### Phase 1: Baseline Architecture

In Phase 1, Mac 1 served as the private DNS authority, resolving custom virtual domains to Mac 2, where an Nginx reverse proxy terminated TLS and balanced traffic between two local Express microservices over loopback.

```
+-----------------------------------------------------------------------------------------+
|                                    WI-FI LAN (10.7.0.0/20)                              |
+-----------------------------------------------------------------------------------------+
       |                                                                           |
       v (1. DNS Query: app.team1.test -> 10.7.11.60)                              v (3. HTTPS:443)
+-------------------------------+                         +-----------------------------------------------+
|     MAC 1 (SANKALP'S MAC)     |                         |              MAC 2 (TEJAS'S MAC)              |
|          10.7.1.19            |                         |                  10.7.11.60                   |
| ----------------------------- |                         | --------------------------------------------- |
| • dnsmasq Primary DNS (:53)   |                         | • Nginx Ingress Reverse Proxy (:80, :443)     |
| • Upstream: 8.8.8.8 (Google)  |                         | • TLS Termination (TLSv1.2 / TLSv1.3)         |
| • LRU Cache: 1000 entries     |                         | • Localhost Loopback Balancer (127.0.0.1)     |
+-------------------------------+                         |   ├── Backend A (Node.js/Express on :3001)    |
       |                                                  |   └── Backend B (Node.js/Express on :3002)    |
       +-- (2. Authoritative DNS Reply)                   +-----------------------------------------------+
```

### Phase 2: Resilient Hardened Architecture

Phase 2 eliminated single points of failure through secondary DNS authority, Packet Filter socket shielding, passive health checking, and standby edge migration readiness.

```
+-----------------------------------------------------------------------------------------+
|                              PHASE 2 RESILIENT ARCHITECTURE                             |
+-----------------------------------------------------------------------------------------+
       |                                                                           |
       v                                                                           v
+---------------------------------------+         +-----------------------------------------------+
|         MAC 1 — SANKALP'S MAC         |         |              MAC 2 — TEJAS'S MAC              |
| ------------------------------------- |         | --------------------------------------------- |
| • Primary DNS Server (dnsmasq :53)    |         | • Primary Edge Reverse Proxy (nginx :443)     |
| • Standby nginx Edge Proxy (:80, :443)|         | • Backup DNS Server (dnsmasq :53)             |
| • Deterministic 30s TTL Caching       |         | • macOS Packet Filter (PF) Anchor: team1      |
| • Controlled Edge Migration Ingress   |         | • Upstream Backend A (3001) & Backend B (3002)|
+---------------------------------------+         +-----------------------------------------------+
```

---

## 🚀 Key Implemented Features

### Phase 1 Core Capabilities
1. **Isolated Service Discovery:** Private DNS mapping for `app.team1.test` and `api.team1.test` without external authority dependencies.
2. **Edge Ingress & TLS Termination:** Offloads cryptographic negotiation from application services using RSA-2048 certificates with support for TLSv1.2 and TLSv1.3.
3. **HTTP 301 Insecure Redirection:** Enforces HTTPS by automatically upgrading cleartext port 80 connections.
4. **Stateless Round-Robin Load Balancing:** Alternates requests evenly between Backend A (`:3001`) and Backend B (`:3002`).
5. **Client Tracking & Caching:** Injects `Host`, `X-Real-IP`, `X-Forwarded-For`, and `Cache-Control: public, max-age=60`.

### Phase 2 Extensions (A through F)
- **Extension A (Backup DNS Resolver):** Synchronized secondary DNS resolver on Mac 2 with automatic client fallback when primary halts.
- **Extension B (DNS TTL & Controlled Caching):** Authoritative 30-second TTL enforcement supporting deterministic cache lifecycles.
- **Extension C (Service Isolation with PF Firewall):** Stateful kernel packet filtering dropping unauthorized LAN traffic to backend ports while whitelisting authorized edge proxies.
- **Extension D (Backend High Availability):** Upstream passive health checks (`max_fails=3`, `fail_timeout=10s`, `proxy_next_upstream`) preventing 502 Bad Gateway errors.
- **Extension E (Controlled Edge Migration):** Standby edge proxy on Mac 1 enabling scheduled cutovers with zero dropped requests.
- **Extension F (Disaster Recovery & Syntax Auditing):** Non-disruptive configuration validation (`nginx -t`, `dnsmasq --test`) and verified rollback procedures.

---

## 📂 Repository Directory Structure

```
CN_PROJECT/
├── README.md                                  # Primary repository landing page
├── package.json                               # Application dependencies (Express)
├── package-lock.json                          # Dependency lockfile
├── backend-a.js                               # Backend instance A (Port 3001)
├── backend-b.js                               # Backend instance B (Port 3002)
│
├── reports/                                   # Formal academic documentation
│   ├── CN_Project_Final_Report.pdf            # 22-page consolidated submission report
│   ├── CN_Project_Final_Report.md             # Source markdown report
│   └── EVIDENCE_INDEX.md                      # Comprehensive empirical verification index
│
├── architecture/                              # Network specifications & topologies
│   ├── phase1_architecture.md                 # Baseline Phase 1 architecture details
│   ├── phase2_architecture.md                 # Hardened Phase 2 architecture details
│   ├── network_topology.md                    # Comprehensive socket & port matrix
│   └── diagrams/                              # Standalone Mermaid architecture diagrams
│       ├── phase1_network_architecture.mmd
│       ├── phase2_network_architecture.mmd
│       ├── dns_failover_flow.mmd
│       ├── backend_failover_flow.mmd
│       └── edge_migration_flow.mmd
│
├── configuration/                             # Verified system configurations
│   ├── dnsmasq.conf                           # Authoritative private DNS config
│   ├── nginx.conf                             # Mac 2 primary edge proxy config
│   ├── nginx-standby.conf                     # Mac 1 standby edge proxy config
│   ├── backend-launch.txt                     # Backend execution reference
│   └── tls-setup.txt                          # OpenSSL certificate reference
│
├── evidence/                                  # Phase 1 Wireshark & terminal traces
│   ├── dns/                                   # DNS query/response traces over UDP 53
│   ├── tcp/                                   # TCP 3-way handshake on port 443
│   ├── tls/                                   # TLSv1.2 Application Data records
│   ├── http/                                  # Direct HTTP request/response traces
│   ├── load-balancing/                        # Round-robin header alternation logs
│   └── caching/                               # Cache-Control & ETag verification
│
└── evidence_phase2/                           # Phase 2 extension verification artifacts
    ├── A_Backup_DNS/                          # Multi-resolver failover proof
    ├── B_DNS_TTL_Caching/                     # 30-second TTL countdown validation
    ├── C_Service_Isolation/                   # macOS Packet Filter anchor rules & drop logs
    ├── D_Backend_High_Availability/           # 10-request sequential curl load balance loop
    ├── E_Edge_Migration/                      # Migrated edge DNS & HTTPS responses
    └── F_Troubleshooting/                     # Non-disruptive syntax audits & recovery
```

---

## 🛠️ Reproduction & Deployment Guide

### Prerequisites
- Two physical workstations running macOS (Sonoma / Sequoia).
- Homebrew package manager.
- Node.js (v18+ or v20+) installed.
- `dnsmasq` (`brew install dnsmasq`).
- `nginx` (`brew install nginx`).

<details>
<summary><strong>Step 1: Application Backend Services Deployment (Mac 2)</strong></summary>

Install Express dependencies and launch both microservices in persistent terminal sessions:

```bash
cd /path/to/CN_PROJECT
npm install

# Launch Backend A (Port 3001)
node backend-a.js

# Launch Backend B (Port 3002) in a separate terminal
node backend-b.js
```
</details>

<details>
<summary><strong>Step 2: Private DNS Subsystem Setup (Mac 1 & Mac 2)</strong></summary>

Deploy the authoritative DNS configuration:

```bash
# Verify active IP
ifconfig en0 | grep inet

# Validate configuration syntax
sudo /opt/homebrew/sbin/dnsmasq --test

# Start dnsmasq daemon
sudo brew services start dnsmasq

# Test resolution
dig @10.7.1.19 app.team1.test +short
# Expected output: 10.7.11.60
```
</details>

<details>
<summary><strong>Step 3: Primary Nginx Edge Gateway Deployment (Mac 2)</strong></summary>

Deploy the edge reverse proxy:

```bash
# Test configuration syntax
sudo nginx -t -c /path/to/CN_PROJECT/configuration/nginx.conf

# Start Nginx
sudo nginx -c /path/to/CN_PROJECT/configuration/nginx.conf
```
</details>

<details>
<summary><strong>Step 4: Packet Filter (PF) Firewall Activation (Mac 2)</strong></summary>

Enforce zero-trust socket shielding on Mac 2:

```bash
# Inject temporary anchor rules (non-destructive)
echo "pass in quick on en0 inet proto tcp from 10.7.1.19 to any port = 3001 flags S/SA keep state
pass in quick on en0 inet proto tcp from 10.7.1.19 to any port = 3002 flags S/SA keep state
block drop in quick on en0 proto tcp from any to any port = 3001
block drop in quick on en0 proto tcp from any to any port = 3002" | sudo pfctl -a team1 -f -

# Verify active rules
sudo pfctl -a team1 -sr
```
</details>

---

## 🧪 Verification & Demonstration Procedures

### 1. Test Ingress Redirection (Port 80 -> 443)
```bash
curl -I http://app.team1.test/
```
*Expected Output:* `HTTP/1.1 301 Moved Permanently`, `Location: https://app.team1.test/`.

### 2. Test Round-Robin Load Balancing
```bash
for i in {1..6}; do curl -sk https://app.team1.test/ -D - -o /dev/null | grep "X-Backend"; done
```
*Expected Output:* Strict alternation: `X-Backend: A`, `X-Backend: B`, `A`, `B`, `A`, `B`.

### 3. Test DNS Resolver Failover
```bash
# Stop Primary DNS on Mac 1
sudo brew services stop dnsmasq

# Query Backup DNS on Mac 2
dig @10.7.11.60 app.team1.test +noall +answer
# Result: Resolves immediately with TTL 30s

# Restore Primary DNS
sudo brew services start dnsmasq
```

### 4. Test Service Isolation via Packet Filter
```bash
# Probe from unauthorized node (drops connection)
nc -z -v -w 2 10.7.11.60 3001
# Result: Connection timed out (Blocked by PF)

# Probe from authorized edge (Mac 1)
curl -i http://10.7.11.60:3001/api/status
# Result: HTTP/1.1 200 OK (Permitted by PF anchor)
```

---

## 🔍 Technical Limitations & Future Improvements

1. **Host-Level High Availability:** Backend A and Backend B run as separate Node.js processes on the same physical workstation (Mac 2). While this demonstrates process-level load balancing and upstream failure recovery, it does not provide true hardware-level fault tolerance if Mac 2 loses power.
2. **Cryptographic Trust:** The TLS certificate is locally generated and self-signed. Client tools must use `-k` (`--insecure`) or import the certificate into the macOS Keychain trust store to avoid browser trust warnings.
3. **Cross-LAN Transport:** In Phase 2 Extension E, edge-to-backend proxy traffic across the Wi-Fi LAN travels as unencrypted HTTP over ports 3001/3002. Future iterations should implement internal mutual TLS (mTLS) or WireGuard tunneling.

---

## 📜 Academic Integrity & License

This project was developed exclusively by **Team 1** for academic evaluation in the Computer Networks course. All captured traces, terminal outputs, and architectural designs represent original work conducted on physical hardware.

Released under the **MIT License**.

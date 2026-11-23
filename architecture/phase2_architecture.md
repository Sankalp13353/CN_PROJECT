# Phase 2 Architecture Specification — Resilient Multi-Tier Network Platform
## Computer Networks Laboratory Project — Team 1

---

### Table of Contents
1. [Executive Summary & Phase 2 Objectives](#1-executive-summary--phase-2-objectives)
2. [End-to-End Phase 2 Architecture Overview](#2-end-to-end-phase-2-architecture-overview)
3. [Extension A: Dual-Tier DNS Redundancy & Automated Failover](#3-extension-a-dual-tier-dns-redundancy--automated-failover)
4. [Extension B: DNS TTL & Controlled Client Caching Mechanics](#4-extension-b-dns-ttl--controlled-client-caching-mechanics)
5. [Extension C: Service Isolation & Host Hardening via Packet Filter (PF)](#5-extension-c-service-isolation--host-hardening-via-packet-filter-pf)
6. [Extension D: Application High Availability & Passive Health Checking](#6-extension-d-application-high-availability--passive-health-checking)
7. [Extension E: Standby Ingress Edge & Controlled Edge Migration](#7-extension-e-standby-ingress-edge--controlled-edge-migration)
8. [Extension F: Disaster Recovery, Syntax Auditing & Troubleshooting](#8-extension-f-disaster-recovery-syntax-auditing--troubleshooting)
9. [Empirical Traceability & Evidence Cross-Reference](#9-empirical-traceability--evidence-cross-reference)

---

### 1. Executive Summary & Phase 2 Objectives

Phase 1 established an operational baseline: custom domain resolution via `dnsmasq`, TLS termination and round-robin load balancing via `nginx`, and dual Express.js backends. However, Phase 1 had single points of failure (SPOFs):
1. **DNS Single Point of Failure:** If Mac 1 failed, domain resolution halted completely.
2. **Edge Single Point of Failure:** If Mac 2 failed or required maintenance, all ingress HTTPS halted.
3. **Unprotected Backend Sockets:** Backend ports 3001 and 3002 were directly accessible on the LAN, allowing clients to bypass edge TLS and load balancing.
4. **Static Upstream Configuration:** If a backend crashed, Nginx would continue attempting requests without dynamic retry or failover.

**Phase 2 Architectural Objectives:**
- **Eliminate DNS SPOF** by implementing redundant primary (`10.7.1.19`) and backup (`10.7.11.60`) DNS resolvers.
- **Implement Deterministic Caching** by enforcing an explicit 30-second DNS TTL across all records.
- **Enforce Zero-Trust Network Isolation** on Mac 2 using macOS Packet Filter (PF) to strictly drop direct LAN traffic to backend ports while authorizing edge ingress.
- **Provide Upstream High Availability** with passive health checks (`max_fails`, `fail_timeout`, and `proxy_next_upstream`).
- **Implement Active-Standby Edge Resilience** enabling controlled edge migration from Mac 2 to Mac 1 without service interruption.

---

### 2. End-to-End Phase 2 Architecture Overview

```
+-----------------------------------------------------------------------------------------+
|                                    WI-FI LAN (10.7.0.0/20)                              |
+-----------------------------------------------------------------------------------------+
       |                                                                           |
       v (10.7.1.19)                                                               v (10.7.11.60)
+---------------------------------------+         +-----------------------------------------------+
|         MAC 1 — SANKALP'S MAC         |         |              MAC 2 — TEJAS'S MAC              |
| ------------------------------------- |         | --------------------------------------------- |
| • Primary DNS Server (dnsmasq :53)    |         | • Active Primary Edge Proxy (nginx :80, :443) |
| • Standby nginx Edge (Installed :443) |         | • Backup DNS Server (dnsmasq :53)             |
| • LAN IP: 10.7.1.19 (Interface: en0)  |         | • Packet Filter (PF) Firewall (Anchor: team1) |
| • Netmask: 255.255.224.0 (/20)        |         | • Upstream Backend A (Node.js/Express :3001)  |
| • Gateway: 10.7.0.1                   |         | • Upstream Backend B (Node.js/Express :3002)  |
| • Hardware MAC: 9e:fd:fb:74:7f:fc     |         | • Hardware MAC: 3e:cd:97:48:d9:f4             |
+---------------------------------------+         +-----------------------------------------------+
```

The system employs a symmetrical, highly available architecture across the two physical workstations.

---

### 3. Extension A: Dual-Tier DNS Redundancy & Automated Failover

#### Architecture & Configuration
To eliminate the DNS SPOF, both workstations run independent instances of `dnsmasq`:
- **Primary DNS Resolver:** Mac 1 (`10.7.1.19:53`)
- **Secondary / Backup Resolver:** Mac 2 (`10.7.11.60:53`)

Client workstations register both resolvers in their resolver stack via macOS configuration (`scutil --dns`):
```
nameserver[0] : 10.7.1.19
nameserver[1] : 10.7.11.60
```

#### Failover Dynamics
1. Normal State: Clients issue DNS queries over UDP port 53 to `10.7.1.19`.
2. Outage Event: If Primary DNS goes offline (`sudo brew services stop dnsmasq`), the client's resolver stack detects socket timeout and falls back to `10.7.11.60`.
3. Zero-Downtime Resolution: Backup DNS responds authoritatively with the identical record within milliseconds.
4. Restoral: Once Primary DNS is restarted (`sudo brew services start dnsmasq`), queries seamlessly return to the primary nameserver.

---

### 4. Extension B: DNS TTL & Controlled Client Caching Mechanics

#### Configuration & TTL Enforcement
In `/opt/homebrew/etc/dnsmasq.conf`, record definitions explicitly mandate an authoritative Time-To-Live (TTL):
```conf
local-ttl=30
```
This sets the TTL in DNS response headers to exactly **30 seconds**.

#### Caching Behavior Analysis
- **Authoritative Ingress:** Querying resolvers directly returns the configured TTL:
  ```
  app.team1.test.    30    IN    A    10.7.11.60
  ```
- **Local Recursive Caches:** When queries pass through caching resolvers or local OS caches (`mDNSResponder`), the TTL counts down from 30 to 0.
- **Cache Flushing:** Executing `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` empties the client's local resolver cache, forcing a new network lookup.

---

### 5. Extension C: Service Isolation & Host Hardening via Packet Filter (PF)

#### The Isolation Challenge
In Phase 1, Express backends bound to `0.0.0.0:3001` and `0.0.0.0:3002`. Consequently, any client on the LAN could issue direct HTTP requests to `http://10.7.11.60:3001/`, bypassing edge TLS encryption, caching, and load balancing.

#### Packet Filter Implementation on Mac 2
To enforce architectural zero-trust, macOS Packet Filter (PF) was configured with an anchor (`team1`):
```pf
# Permit authorized standby edge (Mac 1) to reach backends
pass in quick on en0 inet proto tcp from 10.7.1.19 to any port = 3001 flags S/SA keep state
pass in quick on en0 inet proto tcp from 10.7.1.19 to any port = 3002 flags S/SA keep state

# Drop all other inbound LAN traffic to backend ports
block drop in quick on en0 proto tcp from any to any port = 3001
block drop in quick on en0 proto tcp from any to any port = 3002
```

#### Security Implications
- **Internal Loopback Unaffected:** Mac 2's local Nginx proxy accesses `127.0.0.1:3001` and `3002` freely over `lo0`.
- **LAN Shielding:** Direct unauthorized scans or curl attempts from other LAN hosts receive no response (silent drop) or TCP RST.
- **Authorized Edge Pinning:** Mac 1's standby edge is explicitly whitelisted by source IP.

---

### 6. Extension D: Application High Availability & Passive Health Checking

#### Upstream Pool Architecture
In Nginx configuration, the backend cluster is hardened with passive health checks:
```nginx
upstream team1_backends {
    server 10.7.11.60:3001 max_fails=3 fail_timeout=10s;
    server 10.7.11.60:3002 max_fails=3 fail_timeout=10s;
}
```

#### Ingress Resiliency Configuration
Inside the `location /` block:
```nginx
proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
proxy_next_upstream_timeout 5s;
proxy_next_upstream_tries 3;
proxy_connect_timeout 2s;
proxy_read_timeout 10s;
proxy_send_timeout 10s;
```

#### Operational Mechanics
1. **Healthy State:** Requests alternate sequentially between Backend A (`:3001`) and Backend B (`:3002`).
2. **Failure State:** If Backend A crashes, Nginx receives a connection error or timeout, immediately retries the request against Backend B within milliseconds, and marks Backend A down for 10 seconds.
3. **Client Experience:** The client receives an instantaneous `HTTP 200 OK` from Backend B; no `HTTP 502 Bad Gateway` error is ever exposed.

---

### 7. Extension E: Standby Ingress Edge & Controlled Edge Migration

#### Standby Edge Architecture on Mac 1
Mac 1 is prepared with an independent, production-grade installation of `nginx 1.31.9`:
- Configured to listen on port 80 (HTTP 301 redirect) and port 443 (HTTPS TLS terminator).
- Configured with X.509 certificates and keys with Subject Alternative Names for `app.team1.test` and `api.team1.test`.
- Points upstream across the LAN to `10.7.11.60:3001` and `10.7.11.60:3002`.

#### Migration Execution Procedure
1. **PF Authorization:** Enable Mac 1 allowlist rule in Mac 2's PF firewall.
2. **Standby Verification:** Verify local standby edge routing using `--resolve`:
   ```bash
   curl -k -i --resolve app.team1.test:443:127.0.0.1 https://app.team1.test/
   ```
3. **DNS Cutover:** Update `address=/app.team1.test/10.7.1.19` on both DNS servers and send `SIGHUP`.
4. **TTL Transition:** Over the 30-second TTL drain window, clients seamlessly transition to Mac 1 without dropped packets.

---

### 8. Extension F: Disaster Recovery, Syntax Auditing & Troubleshooting

#### Recovery Toolchain
- **DNS Audit:** `sudo /opt/homebrew/sbin/dnsmasq --test` verifies syntax without disrupting port 53.
- **Nginx Audit:** `sudo /opt/homebrew/bin/nginx -t` validates configuration before applying `nginx -s reload`.
- **Port Conflict Resolution:** Automated script audits `lsof -i :53 -i :80 -i :443` to detect orphan processes.
- **Rollback Guarantee:** Full rollback procedures documented to restore initial state in under 60 seconds.

---

### 9. Empirical Traceability & Evidence Cross-Reference

| Phase 2 Extension | Verified Capability | Primary Evidence Artifact | Key Empirical Findings |
| :--- | :--- | :--- | :--- |
| **Extension A** | Backup DNS failover | `evidence_phase2/A_Backup_DNS/Screenshot 2026-11-23 at 6.18.33 PM.png` | Primary stopped; Secondary resolver `10.7.11.60` answers `app.team1.test` with TTL 30s. |
| **Extension B** | DNS TTL enforcement | `evidence_phase2/B_DNS_TTL_Caching/Screenshot 2026-11-23 at 6.21.18 PM.png` | dig query confirms exact authoritative TTL of 30 seconds. |
| **Extension C** | Firewall rule enforcement | `evidence_phase2/C_Service_Isolation/WhatsApp Image 2026-11-23 at 18.22.33.jpeg` | `pfctl -a team1 -sr` confirms pass for `10.7.1.19` and block drop for all other LAN hosts. |
| **Extension D** | Load balancing & HA | `evidence_phase2/D_Backend_High_Availability/Screenshot 2026-11-23 at 6.24.28 PM.png` | 10-request curl loop confirms strict A/B alternating round-robin distribution. |
| **Extension E** | Live Edge Migration | `evidence_phase2/E_Edge_Migration/Screenshot 2026-11-23 at 6.24.59 PM.png` | DNS resolves to `10.7.1.19`; Mac 1 Nginx serves HTTPS returning `X-Backend: A/B`. |
| **Extension F** | Service recovery & test | `evidence_phase2/F_Troubleshooting/Screenshot 2026-11-23 at 6.25.28 PM.png` | Syntax validation `nginx: test is successful` and verified HTTP 200 recovery. |

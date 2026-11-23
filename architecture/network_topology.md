# Comprehensive Network Topology Specification
## Multi-Tier Private Network Service Platform — Team 1 (Phase 1 & Phase 2)

---

### Table of Contents
1. [Network Topology Overview](#1-network-topology-overview)
2. [Physical vs. Logical Topology](#2-physical-vs-logical-topology)
3. [Comprehensive Hardware & Node Inventory](#3-comprehensive-hardware--node-inventory)
4. [Layer 4 Socket & Port Allocation Matrix](#4-layer-4-socket--port-allocation-matrix)
5. [End-to-End Packet Trajectories](#5-end-to-end-packet-trajectories)
   - [5.1 DNS Name Resolution Trajectory (Phase 1 & Phase 2)](#51-dns-name-resolution-trajectory-phase-1--phase-2)
   - [5.2 Ingress HTTPS & Loopback Trajectory (Primary Edge)](#52-ingress-https--loopback-trajectory-primary-edge)
   - [5.3 Cross-LAN Standby Edge Trajectory (Migrated Edge)](#53-cross-lan-standby-edge-trajectory-migrated-edge)
   - [5.4 HTTP Insecure Redirect Trajectory](#54-http-insecure-redirect-trajectory)
6. [Subnetting, Addressing & Network Segmentation](#6-subnetting-addressing--network-segmentation)
7. [Firewall Rules & Demilitarized Zones (DMZ)](#7-firewall-rules--demilitarized-zones-dmz)
8. [Consolidated Empirical Traceability Matrix](#8-consolidated-empirical-traceability-matrix)

---

### 1. Network Topology Overview

The **Multi-Tier Private Network Service Platform** is deployed across a distributed local area network (LAN) operating within the `10.7.0.0/20` IPv4 subnet over an IEEE 802.11 wireless medium.

The platform architecture spans two physical computing workstations with coordinated roles:
- **Mac 1 (Sankalp's MacBook Pro):** Primary DNS Server (`dnsmasq`), Standby Edge Reverse Proxy (`nginx 1.31.9`), Client Workstation.
- **Mac 2 (Tejas's MacBook Pro):** Primary Edge Reverse Proxy (`nginx 1.31.6`), Backup DNS Server (`dnsmasq`), Application Backend Cluster (`Backend A` and `Backend B`), Packet Filter (PF) Firewall.

---

### 2. Physical vs. Logical Topology

| Characteristic | Physical Topology | Logical Topology |
| :--- | :--- | :--- |
| **Arrangement** | Star topology centered around a shared wireless Access Point (Ruckus Wireless AP). | Hierarchical, multi-tiered client-edge-backend architecture. |
| **Medium** | Over-the-air RF 2.4 GHz / 5 GHz wireless transmission (`en0` interfaces). | Segmented logical communication channels (DNS UDP/53, Edge HTTPS TCP/443, IPC Loopback TCP/3001-3002). |
| **Addressing** | 48-bit Hardware MAC Addresses (`9e:fd:fb:74:7f:fc`, `3e:cd:97:48:d9:f4`). | 32-bit IPv4 Addressing (`10.7.1.19`, `10.7.11.60`) and Virtual Domains (`*.team1.test`). |
| **Boundaries** | Single physical broadcast domain and RF collision space. | Demarcated network zones: Public Client Zone, Edge DMZ, and Internal Application Zone. |

---

### 3. Comprehensive Hardware & Node Inventory

```
+-------------------------------------------------------------------------------------------------------------------+
|                                        DEVICE HARDWARE & INTERFACE INVENTORY                                       |
+-------------------+-------------------+--------------------+--------------------+---------------------------------+
| Node Identifier   | Workstation Role  | IP Address (Subnet)| Hardware MAC       | Active Daemons & Sockets        |
+-------------------+-------------------+--------------------+--------------------+---------------------------------+
| **Node 1 (Mac 1)**| Sankalp's MacBook | `10.7.1.19`        | `9e:fd:fb:74:7f:fc`| • Primary DNS: dnsmasq (:53)   |
|                   | Primary DNS /     | (Subnet: /20)      | (Wi-Fi en0)        | • Standby Edge: nginx (:80/:443)|
|                   | Standby Edge      |                    |                    | • Client Resolver Stack         |
+-------------------+-------------------+--------------------+--------------------+---------------------------------+
| **Node 2 (Mac 2)**| Tejas's MacBook   | `10.7.11.60`       | `3e:cd:97:48:d9:f4`| • Primary Edge: nginx (:80/:443)|
|                   | Primary Edge /    | (Subnet: /20)      | (Wi-Fi en0)        | • Backup DNS: dnsmasq (:53)    |
|                   | Backends Host     | 127.0.0.1 (lo0)    | Loopback           | • Backend A: node (:3001)       |
|                   |                   |                    |                    | • Backend B: node (:3002)       |
|                   |                   |                    |                    | • Packet Filter (PF) Firewall   |
+-------------------+-------------------+--------------------+--------------------+---------------------------------+
| **Access Point**  | Wi-Fi AP / Router | `10.7.0.1` (GW)    | `c0:c5:20:6f:38:ee`| • 802.11 AP / L2 Ethernet Frame |
|                   | Default Gateway   |                    | (Ruckus Wireless)  |   Forwarding Engine             |
+-------------------+-------------------+--------------------+--------------------+---------------------------------+
| **Upstream WAN**  | Recursive DNS     | `8.8.8.8`          | WAN Next Hop       | • Public DNS Recursive Resolver |
+-------------------+-------------------+--------------------+--------------------+---------------------------------+
```

---

### 4. Layer 4 Socket & Port Allocation Matrix

```
+-------------------------------------------------------------------------------------------------------------------+
|                                       LAYER 4 SOCKET & PORT ALLOCATION MATRIX                                     |
+--------+-----------+---------------+------+-------------------+--------------+-----------------+------------------+
| Host   | Transport | Bind Address  | Port | Service / Daemon  | State        | Access Scope    | Traffic Purpose  |
+--------+-----------+---------------+------+-------------------+--------------+-----------------+------------------+
| Mac 1  | UDP       | 10.7.1.19     | 53   | dnsmasq           | UNCONNECTED  | Public LAN      | Inbound DNS      |
| Mac 1  | TCP       | 10.7.1.19     | 53   | dnsmasq           | LISTEN       | Public LAN      | Large DNS queries|
| Mac 1  | TCP       | 0.0.0.0       | 80   | nginx standby     | LISTEN       | Public LAN      | Insecure Redirect|
| Mac 1  | TCP       | 0.0.0.0       | 443  | nginx standby     | LISTEN       | Public LAN      | Standby Edge TLS |
| Mac 2  | UDP       | 10.7.11.60    | 53   | dnsmasq (backup)  | UNCONNECTED  | Public LAN      | Backup DNS       |
| Mac 2  | TCP       | 10.7.11.60    | 53   | dnsmasq (backup)  | LISTEN       | Public LAN      | Backup DNS       |
| Mac 2  | TCP       | 0.0.0.0       | 80   | nginx primary     | LISTEN       | Public LAN      | Insecure Redirect|
| Mac 2  | TCP       | 0.0.0.0       | 443  | nginx primary     | LISTEN       | Public LAN      | Primary Edge TLS |
| Mac 2  | TCP       | 0.0.0.0       | 3001 | node backend-a    | LISTEN       | PF Restricted   | Backend A API    |
| Mac 2  | TCP       | 0.0.0.0       | 3002 | node backend-b    | LISTEN       | PF Restricted   | Backend B API    |
+--------+-----------+---------------+------+-------------------+--------------+-----------------+------------------+
```

---

### 5. End-to-End Packet Trajectories

#### 5.1 DNS Name Resolution Trajectory (Phase 1 & Phase 2)
1. **Normal State (Primary Resolver):**
   - Client sends DNS query UDP datagram to `10.7.1.19:53`.
   - `dnsmasq` responds with A record and explicit 30s TTL.
2. **Failover State (Backup Resolver):**
   - If `10.7.1.19` times out, client resolver queries secondary nameserver `10.7.11.60:53`.
   - Backup `dnsmasq` authoritatively returns the A record with 30s TTL.

#### 5.2 Ingress HTTPS & Loopback Trajectory (Primary Edge)
1. Client connects to `10.7.11.60:443` via TCP 3-way handshake.
2. TLS negotiation establishes an encrypted session (AES-GCM / ECDHE).
3. Nginx decrypts incoming HTTP request, applies round-robin scheduling, and forwards unencrypted request to `127.0.0.1:3001` or `3002`.
4. Backend responds over loopback; Nginx adds `Cache-Control: public, max-age=60`, re-encrypts, and transmits to client.

#### 5.3 Cross-LAN Standby Edge Trajectory (Migrated Edge)
1. Client resolves `app.team1.test` to `10.7.1.19` and connects to `10.7.1.19:443`.
2. Standby Nginx on Mac 1 terminates TLS.
3. Standby Nginx forwards request across the LAN to `10.7.11.60:3001` or `3002`.
4. Mac 2 Packet Filter evaluates source IP (`10.7.1.19` matches allowlist rule in `team1` anchor) and passes the packet to the local backend.
5. Backend responds across LAN to Mac 1; Mac 1 returns encrypted response to client.

#### 5.4 HTTP Insecure Redirect Trajectory
1. Client sends cleartext HTTP `GET /` to port 80.
2. Edge listener responds with `HTTP/1.1 301 Moved Permanently` and `Location: https://$host$request_uri`.
3. Client automatically upgrades to HTTPS on port 443.

---

### 6. Subnetting, Addressing & Network Segmentation

- **IPv4 Network Prefix:** `10.7.0.0/20`
- **Subnet Netmask:** `255.255.240.0`
- **Usable Host Addresses:** `10.7.0.1` to `10.7.15.254` (4,094 usable hosts)
- **Direct Layer 2 Adjacency:** Mac 1 (`10.7.1.19`) and Mac 2 (`10.7.11.60`) communicate directly via Layer 2 Ethernet framing over Wi-Fi without intermediate routing hops.

---

### 7. Firewall Rules & Demilitarized Zones (DMZ)

```
+-----------------------------------------------------------------------------+
| ZONE 1: PUBLIC / UNTRUSTED LAN ZONE                                         |
| - Traffic: Encrypted HTTPS (TCP/443) & DNS (UDP/53)                         |
| - Security Rule: Direct LAN access to 3001 & 3002 is BLOCKED by PF          |
+-----------------------------------------------------------------------------+
                                       |
                         (Packet Filter Ingress Inspection)
                                       |
                                       v
+-----------------------------------------------------------------------------+
| ZONE 2: RESTRICTED APPLICATION ZONE (Mac 2 Backends)                        |
| - Inbound Sockets: Ports 3001 & 3002 (TCP)                                  |
| - Permitted Sources:                                                        |
|   1. 127.0.0.1 (Localhost IPC via lo0)                                      |
|   2. 10.7.1.19 (Authorized Standby Edge via PF anchor team1)               |
| - Unauthenticated LAN Sources: DROPPED                                      |
+-----------------------------------------------------------------------------+
```

---

### 8. Consolidated Empirical Traceability Matrix

```
+---------------------------------------------------------------------------------------------------------------+
|                                    CONSOLIDATED EMPIRICAL TRACEABILITY MATRIX                                 |
+--------------------+-------------------+---------------------------------------------------+------------------+
| Phase & Feature    | Capability Tested | Verified Artifact Path                            | Key Verification |
+--------------------+-------------------+---------------------------------------------------+------------------+
| **Phase 1: DNS**   | UDP 53 Resolution | evidence/dns/DNS EVI.png                          | Frame 1431/1433  |
| **Phase 1: TCP**   | TCP 3-Way HS (443)| evidence/tcp/TCP.png                              | SYN, SYN-ACK, ACK|
| **Phase 1: TLS**   | TLSv1.2 App Data  | evidence/tls/TLS.png                              | Content Type 23  |
| **Phase 1: HTTP**  | Direct Backend    | evidence/http/HTTP EVI.png                        | 200 OK JSON      |
| **Phase 1: LB**    | Round-Robin A/B   | evidence/load-balancing/Load Balancing.png        | X-Backend: A, B  |
| **Phase 1: Cache** | Cache-Control     | evidence/caching/Caching.png                      | max-age=60, ETag |
| **Phase 2: Ext A** | Backup DNS Failover| evidence_phase2/A_Backup_DNS/*.png               | Backup answers   |
| **Phase 2: Ext B** | DNS TTL Countdown | evidence_phase2/B_DNS_TTL_Caching/*.png           | TTL = 30 seconds |
| **Phase 2: Ext C** | PF Isolation      | evidence_phase2/C_Service_Isolation/*             | PF anchor active |
| **Phase 2: Ext D** | Backend HA / LB   | evidence_phase2/D_Backend_High_Availability/*.png | 10-req loop A/B  |
| **Phase 2: Ext E** | Edge Migration    | evidence_phase2/E_Edge_Migration/*.png            | Migrated to Mac 1|
| **Phase 2: Ext F** | Troubleshooting   | evidence_phase2/F_Troubleshooting/*.png           | nginx -t OK      |
+--------------------+-------------------+---------------------------------------------------+------------------+
```
